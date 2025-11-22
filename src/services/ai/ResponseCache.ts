/**
 * Response Cache System
 * LRU cache with IndexedDB persistence for Claude API responses
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { CacheEntry, CacheStats } from './types';

const DB_NAME = 'claude-response-cache';
const STORE_NAME = 'responses';
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB

export class ResponseCache {
  private db: IDBPDatabase | null = null;
  private memoryCache = new Map<string, CacheEntry<unknown>>();
  private accessLog = new Map<string, number>(); // For LRU
  private currentSize = 0;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    entries: 0,
  };

  constructor(
    private maxSize = MAX_CACHE_SIZE,
    private defaultTTL = DEFAULT_TTL
  ) {}

  // ==========================================================================
  // Initialization
  // ==========================================================================

  async initialize(): Promise<void> {
    this.db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('ttl', 'ttl');
        }
      },
    });

    // Load cache stats
    await this.loadStats();

    // Clean expired entries on init
    await this.cleanExpired();
  }

  private async loadStats(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const entries = await store.getAll();

    this.currentSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    this.stats.entries = entries.length;
    this.stats.size = this.currentSize;
  }

  // ==========================================================================
  // Cache Operations
  // ==========================================================================

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memEntry) {
      if (this.isExpired(memEntry)) {
        this.memoryCache.delete(key);
      } else {
        this.accessLog.set(key, Date.now());
        this.stats.hits++;
        return memEntry.data;
      }
    }

    // Check IndexedDB
    if (!this.db) {
      this.stats.misses++;
      return null;
    }

    const entry = await this.db.get(STORE_NAME, key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      await this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Populate memory cache
    this.memoryCache.set(key, entry);
    this.accessLog.set(key, Date.now());
    this.stats.hits++;

    return entry.data;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    if (!this.db) {
      throw new Error('Cache not initialized');
    }

    const size = this.estimateSize(data);
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      size,
    };

    // Check if we need to evict entries
    while (this.currentSize + size > this.maxSize && this.stats.entries > 0) {
      await this.evictLRU();
    }

    // Store in both memory and IndexedDB
    this.memoryCache.set(key, entry);
    await this.db.put(STORE_NAME, entry);

    this.accessLog.set(key, Date.now());
    this.currentSize += size;
    this.stats.entries++;
    this.stats.size = this.currentSize;
  }

  async delete(key: string): Promise<void> {
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      this.memoryCache.delete(key);
    }

    this.accessLog.delete(key);

    if (this.db) {
      const dbEntry = await this.db.get(STORE_NAME, key);
      if (dbEntry) {
        this.currentSize -= dbEntry.size;
        await this.db.delete(STORE_NAME, key);
      }
    }

    this.stats.entries--;
    this.stats.size = this.currentSize;
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.accessLog.clear();
    this.currentSize = 0;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0,
    };

    if (this.db) {
      await this.db.clear(STORE_NAME);
    }
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  private async evictLRU(): Promise<void> {
    // Find least recently used entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessLog.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      await this.delete(oldestKey);
    }
  }

  private async cleanExpired(): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entries = await store.getAll();

    const now = Date.now();
    const expired = entries.filter((entry) => now - entry.timestamp > entry.ttl);

    for (const entry of expired) {
      await this.delete(entry.key);
    }
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private estimateSize(data: unknown): number {
    // Rough estimation of data size
    const json = JSON.stringify(data);
    return new Blob([json]).size;
  }

  // ==========================================================================
  // Cache Key Generation
  // ==========================================================================

  static generateKey(feature: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join('&');

    return `${feature}:${this.hash(sortedParams)}`;
  }

  private static hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // ==========================================================================
  // Invalidation Strategies
  // ==========================================================================

  async invalidateByPrefix(prefix: string): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entries = await store.getAll();

    const toDelete = entries.filter((entry) => entry.key.startsWith(prefix));

    for (const entry of toDelete) {
      await this.delete(entry.key);
    }
  }

  async invalidateByPattern(pattern: RegExp): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entries = await store.getAll();

    const toDelete = entries.filter((entry) => pattern.test(entry.key));

    for (const entry of toDelete) {
      await this.delete(entry.key);
    }
  }

  async invalidateOlderThan(timestamp: number): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entries = await store.getAll();

    const toDelete = entries.filter((entry) => entry.timestamp < timestamp);

    for (const entry of toDelete) {
      await this.delete(entry.key);
    }
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  async getStorageInfo(): Promise<{
    size: number;
    maxSize: number;
    utilizationPercent: number;
    entries: number;
  }> {
    return {
      size: this.currentSize,
      maxSize: this.maxSize,
      utilizationPercent: (this.currentSize / this.maxSize) * 100,
      entries: this.stats.entries,
    };
  }

  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  // ==========================================================================
  // Warmup
  // ==========================================================================

  async warmup(keys: string[]): Promise<void> {
    // Preload frequently accessed keys into memory
    if (!this.db) return;

    for (const key of keys) {
      const entry = await this.db.get(STORE_NAME, key);
      if (entry && !this.isExpired(entry)) {
        this.memoryCache.set(key, entry);
      }
    }
  }

  // ==========================================================================
  // Export/Import
  // ==========================================================================

  async export(): Promise<CacheEntry<unknown>[]> {
    if (!this.db) return [];

    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return await store.getAll();
  }

  async import(entries: CacheEntry<unknown>[]): Promise<void> {
    if (!this.db) throw new Error('Cache not initialized');

    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const entry of entries) {
      if (!this.isExpired(entry)) {
        await store.put(entry);
        this.currentSize += entry.size;
      }
    }

    await this.loadStats();
  }
}

export default ResponseCache;
