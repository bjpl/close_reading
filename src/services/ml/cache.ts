/**
 * Multi-Layer Embedding Cache
 *
 * Implements a three-tier caching strategy:
 * 1. Memory cache (fastest, volatile)
 * 2. IndexedDB (persistent, local)
 * 3. Supabase ml_cache table (shared, cloud)
 *
 * Features:
 * - Automatic cache population
 * - TTL (Time-To-Live) management
 * - Cache invalidation
 * - Statistics tracking
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { supabase } from '../../lib/supabase';
import { EmbeddingVector } from './embeddings';
import { logger } from '../../utils/logger';

interface EmbeddingCacheDB extends DBSchema {
  embeddings: {
    key: string;
    value: {
      text: string;
      vector: number[];
      modelVersion: string;
      timestamp: number;
      accessCount: number;
      lastAccessed: number;
    };
    indexes: {
      'by-timestamp': number;
      'by-model': string;
      'by-accessed': number;
    };
  };
}

export interface CacheStats {
  memorySize: number;
  indexedDBSize: number;
  supabaseSize: number;
  hitRate: number;
  totalRequests: number;
  totalHits: number;
}

/**
 * Multi-layer embedding cache
 */
export class EmbeddingCache {
  private memoryCache: Map<string, EmbeddingVector> = new Map();
  private db: IDBPDatabase<EmbeddingCacheDB> | null = null;
  private readonly DB_NAME = 'close-reading-embeddings';
  private readonly DB_VERSION = 1;
  private readonly TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly MAX_MEMORY_SIZE = 1000; // Max items in memory cache

  // Statistics
  private stats = {
    requests: 0,
    memoryHits: 0,
    indexedDBHits: 0,
    supabaseHits: 0,
    misses: 0,
  };

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<void> {
    try {
      this.db = await openDB<EmbeddingCacheDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Create embeddings store
          const store = db.createObjectStore('embeddings', {
            keyPath: 'text',
          });

          // Create indexes
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-model', 'modelVersion');
          store.createIndex('by-accessed', 'lastAccessed');
        },
      });

      logger.info('[Cache] IndexedDB initialized');

      // Clean up expired entries
      await this.cleanupExpired();
    } catch (error) {
      logger.error({ error }, '[Cache] Failed to initialize IndexedDB');
      // Continue without IndexedDB - memory cache still works
    }
  }

  /**
   * Generate cache key from text and model version
   */
  private getCacheKey(text: string, modelVersion: string): string {
    return `${modelVersion}:${text}`;
  }

  /**
   * Get embedding from cache (checks all layers)
   */
  async get(text: string, modelVersion: string): Promise<EmbeddingVector | null> {
    this.stats.requests++;
    const key = this.getCacheKey(text, modelVersion);

    // Layer 1: Memory cache
    const memoryResult = this.memoryCache.get(key);
    if (memoryResult) {
      this.stats.memoryHits++;
      return memoryResult;
    }

    // Layer 2: IndexedDB
    if (this.db) {
      try {
        const idbResult = await this.db.get('embeddings', text);
        if (idbResult && idbResult.modelVersion === modelVersion) {
          // Check if not expired
          if (Date.now() - idbResult.timestamp < this.TTL_MS) {
            this.stats.indexedDBHits++;

            // Update access stats
            await this.db.put('embeddings', {
              ...idbResult,
              accessCount: idbResult.accessCount + 1,
              lastAccessed: Date.now(),
            });

            // Promote to memory cache
            const result: EmbeddingVector = {
              text: idbResult.text,
              vector: idbResult.vector,
              modelVersion: idbResult.modelVersion,
              timestamp: idbResult.timestamp,
            };
            this.setMemoryCache(key, result);

            return result;
          }
        }
      } catch (error) {
        logger.error({ error }, '[Cache] IndexedDB lookup failed');
      }
    }

    // Layer 3: Supabase (only for authenticated users)
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('ml_cache')
          .select('*')
          .eq('text_hash', this.hashText(text))
          .eq('model_version', modelVersion)
          .single();

        if (!error && data) {
          // Check if not expired
          if (Date.now() - new Date(data.created_at).getTime() < this.TTL_MS) {
            this.stats.supabaseHits++;

            const result: EmbeddingVector = {
              text,
              vector: data.embedding_vector,
              modelVersion: data.model_version,
              timestamp: new Date(data.created_at).getTime(),
            };

            // Promote to lower cache layers
            this.setMemoryCache(key, result);
            if (this.db) {
              await this.setIndexedDB(result);
            }

            return result;
          }
        }
      }
    } catch (error) {
      logger.error({ error }, '[Cache] Supabase lookup failed');
    }

    // Cache miss
    this.stats.misses++;
    return null;
  }

  /**
   * Set embedding in cache (updates all layers)
   */
  async set(text: string, embedding: EmbeddingVector): Promise<void> {
    const key = this.getCacheKey(text, embedding.modelVersion);

    // Layer 1: Memory cache
    this.setMemoryCache(key, embedding);

    // Layer 2: IndexedDB
    if (this.db) {
      await this.setIndexedDB(embedding);
    }

    // Layer 3: Supabase (only for authenticated users)
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('ml_cache').upsert({
          text_hash: this.hashText(text),
          text_preview: text.substring(0, 200),
          embedding_vector: embedding.vector,
          model_version: embedding.modelVersion,
          user_id: user.id,
        });
      }
    } catch (error) {
      logger.error({ error }, '[Cache] Supabase write failed');
      // Continue - local caching still works
    }
  }

  /**
   * Set in memory cache with LRU eviction
   */
  private setMemoryCache(key: string, embedding: EmbeddingVector): void {
    // Implement simple LRU: if cache is full, remove oldest entry
    if (this.memoryCache.size >= this.MAX_MEMORY_SIZE) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(key, embedding);
  }

  /**
   * Set in IndexedDB
   */
  private async setIndexedDB(embedding: EmbeddingVector): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.put('embeddings', {
        text: embedding.text,
        vector: embedding.vector,
        modelVersion: embedding.modelVersion,
        timestamp: embedding.timestamp,
        accessCount: 1,
        lastAccessed: Date.now(),
      });
    } catch (error) {
      logger.error({ error }, '[Cache] IndexedDB write failed');
    }
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    // Clear memory
    this.memoryCache.clear();

    // Clear IndexedDB
    if (this.db) {
      try {
        await this.db.clear('embeddings');
      } catch (error) {
        logger.error({ error }, '[Cache] Failed to clear IndexedDB');
      }
    }

    // Clear Supabase (only user's own cache)
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('ml_cache')
          .delete()
          .eq('user_id', user.id);
      }
    } catch (error) {
      logger.error({ error }, '[Cache] Failed to clear Supabase cache');
    }

    logger.info('[Cache] All caches cleared');
  }

  /**
   * Clean up expired entries from IndexedDB
   */
  private async cleanupExpired(): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction('embeddings', 'readwrite');
      const store = tx.objectStore('embeddings');
      const index = store.index('by-timestamp');

      const expiredThreshold = Date.now() - this.TTL_MS;
      let cursor = await index.openCursor(IDBKeyRange.upperBound(expiredThreshold));

      let deletedCount = 0;
      while (cursor) {
        await cursor.delete();
        deletedCount++;
        cursor = await cursor.continue();
      }

      await tx.done;

      if (deletedCount > 0) {
        logger.info(`[Cache] Cleaned up ${deletedCount} expired entries`);
      }
    } catch (error) {
      logger.error({ error }, '[Cache] Cleanup failed');
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    let indexedDBSize = 0;
    let supabaseSize = 0;

    // Count IndexedDB entries
    if (this.db) {
      try {
        indexedDBSize = await this.db.count('embeddings');
      } catch (error) {
        logger.error({ error }, '[Cache] Failed to count IndexedDB entries');
      }
    }

    // Count Supabase entries (only user's own)
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { count } = await supabase
          .from('ml_cache')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        supabaseSize = count || 0;
      }
    } catch (error) {
      logger.error({ error }, '[Cache] Failed to count Supabase entries');
    }

    const totalHits = this.stats.memoryHits + this.stats.indexedDBHits + this.stats.supabaseHits;
    const hitRate = this.stats.requests > 0 ? totalHits / this.stats.requests : 0;

    return {
      memorySize: this.memoryCache.size,
      indexedDBSize,
      supabaseSize,
      hitRate,
      totalRequests: this.stats.requests,
      totalHits,
    };
  }

  /**
   * Hash text for Supabase lookup
   * Using simple hash for now, can be improved
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}
