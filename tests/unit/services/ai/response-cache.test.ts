/**
 * Response Cache Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ResponseCache } from '../../../../src/services/ai/ResponseCache';
import 'fake-indexeddb/auto';

describe('ResponseCache', () => {
  let cache: ResponseCache;

  beforeEach(async () => {
    cache = new ResponseCache();
    await cache.initialize();
  });

  afterEach(async () => {
    await cache.clear();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve data', async () => {
      await cache.set('test-key', { data: 'test value' });
      const result = await cache.get('test-key');

      expect(result).toEqual({ data: 'test value' });
    });

    it('should return null for missing keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete entries', async () => {
      await cache.set('delete-test', { value: 123 });
      await cache.delete('delete-test');

      const result = await cache.get('delete-test');
      expect(result).toBeNull();
    });

    it('should clear all entries', async () => {
      await cache.set('key1', { data: 1 });
      await cache.set('key2', { data: 2 });
      await cache.set('key3', { data: 3 });

      await cache.clear();

      const stats = cache.getStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      await cache.set('expire-test', { data: 'will expire' }, 100);

      // Should exist immediately
      let result = await cache.get('expire-test');
      expect(result).toBeTruthy();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      result = await cache.get('expire-test');
      expect(result).toBeNull();
    });

    it('should use default TTL if not specified', async () => {
      await cache.set('default-ttl', { data: 'test' });

      const result = await cache.get('default-ttl');
      expect(result).toBeTruthy();
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entries', async () => {
      const smallCache = new ResponseCache(1000); // Small cache
      await smallCache.initialize();

      // Fill cache
      for (let i = 0; i < 10; i++) {
        await smallCache.set(`key-${i}`, { data: 'x'.repeat(200) });
      }

      // Access first key to make it recently used
      await smallCache.get('key-0');

      // Add more data to trigger eviction
      await smallCache.set('new-key', { data: 'x'.repeat(200) });

      // First key should still exist (recently accessed)
      const key0 = await smallCache.get('key-0');
      expect(key0).toBeTruthy();

      const stats = smallCache.getStats();
      expect(stats.entries).toBeLessThan(11);
    });
  });

  describe('Cache Statistics', () => {
    it('should track hits and misses', async () => {
      cache.resetStats();

      await cache.set('stat-test', { data: 'test' });

      await cache.get('stat-test'); // Hit
      await cache.get('nonexistent'); // Miss
      await cache.get('stat-test'); // Hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should calculate hit rate', async () => {
      cache.resetStats();

      await cache.set('rate-test', { data: 'test' });

      await cache.get('rate-test'); // Hit
      await cache.get('rate-test'); // Hit
      await cache.get('missing'); // Miss

      const hitRate = cache.getHitRate();
      expect(hitRate).toBeCloseTo(0.666, 2);
    });

    it('should track cache size and entries', async () => {
      await cache.set('size-test-1', { data: 'test 1' });
      await cache.set('size-test-2', { data: 'test 2' });

      const stats = cache.getStats();
      expect(stats.entries).toBe(2);
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should provide storage information', async () => {
      await cache.set('storage-test', { data: 'test' });

      const info = await cache.getStorageInfo();
      expect(info.entries).toBe(1);
      expect(info.size).toBeGreaterThan(0);
      expect(info.maxSize).toBeGreaterThan(0);
      expect(info.utilizationPercent).toBeGreaterThan(0);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent keys', () => {
      const key1 = ResponseCache.generateKey('feature', { param: 'value' });
      const key2 = ResponseCache.generateKey('feature', { param: 'value' });

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different params', () => {
      const key1 = ResponseCache.generateKey('feature', { param: 'value1' });
      const key2 = ResponseCache.generateKey('feature', { param: 'value2' });

      expect(key1).not.toBe(key2);
    });

    it('should handle complex parameters', () => {
      const key = ResponseCache.generateKey('feature', {
        text: 'long text',
        options: { style: 'academic', depth: 'deep' },
        array: [1, 2, 3],
      });

      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
    });
  });

  describe('Invalidation Strategies', () => {
    beforeEach(async () => {
      await cache.set('prefix:key1', { data: 1 });
      await cache.set('prefix:key2', { data: 2 });
      await cache.set('other:key3', { data: 3 });
    });

    it('should invalidate by prefix', async () => {
      await cache.invalidateByPrefix('prefix:');

      const key1 = await cache.get('prefix:key1');
      const key2 = await cache.get('prefix:key2');
      const key3 = await cache.get('other:key3');

      expect(key1).toBeNull();
      expect(key2).toBeNull();
      expect(key3).toBeTruthy();
    });

    it('should invalidate by pattern', async () => {
      await cache.invalidateByPattern(/prefix:.*/);

      const key1 = await cache.get('prefix:key1');
      const key3 = await cache.get('other:key3');

      expect(key1).toBeNull();
      expect(key3).toBeTruthy();
    });

    it('should invalidate by timestamp', async () => {
      const cutoff = Date.now() + 100;

      await new Promise((resolve) => setTimeout(resolve, 200));
      await cache.set('new-key', { data: 'new' });

      await cache.invalidateOlderThan(cutoff);

      const old = await cache.get('prefix:key1');
      const newer = await cache.get('new-key');

      expect(old).toBeNull();
      expect(newer).toBeTruthy();
    });
  });

  describe('Warmup', () => {
    it('should preload keys into memory', async () => {
      await cache.set('warm1', { data: 1 });
      await cache.set('warm2', { data: 2 });

      await cache.warmup(['warm1', 'warm2']);

      // Access should be fast (from memory)
      const result1 = await cache.get('warm1');
      const result2 = await cache.get('warm2');

      expect(result1).toEqual({ data: 1 });
      expect(result2).toEqual({ data: 2 });
    });
  });

  describe('Export/Import', () => {
    it('should export cache entries', async () => {
      await cache.set('export1', { data: 1 });
      await cache.set('export2', { data: 2 });

      const exported = await cache.export();

      expect(exported.length).toBe(2);
      expect(exported.some((e) => e.key === 'export1')).toBe(true);
    });

    it('should import cache entries', async () => {
      const entries = [
        {
          key: 'import1',
          data: { value: 1 },
          timestamp: Date.now(),
          ttl: 10000,
          size: 100,
        },
        {
          key: 'import2',
          data: { value: 2 },
          timestamp: Date.now(),
          ttl: 10000,
          size: 100,
        },
      ];

      await cache.import(entries);

      const result1 = await cache.get('import1');
      const result2 = await cache.get('import2');

      expect(result1).toEqual({ value: 1 });
      expect(result2).toEqual({ value: 2 });
    });

    it('should skip expired entries on import', async () => {
      const entries = [
        {
          key: 'expired',
          data: { value: 1 },
          timestamp: Date.now() - 20000,
          ttl: 10000,
          size: 100,
        },
      ];

      await cache.import(entries);

      const result = await cache.get('expired');
      expect(result).toBeNull();
    });
  });
});
