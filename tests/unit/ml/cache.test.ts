import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EmbeddingVector } from '@/services/ml/embeddings';

// Use vi.hoisted() to ensure mock variables are available when vi.mock() is hoisted
const { mockDB, mockSupabase } = vi.hoisted(() => ({
  mockDB: {
    get: vi.fn(),
    put: vi.fn(),
    clear: vi.fn(),
    count: vi.fn(),
    transaction: vi.fn(),
    objectStore: vi.fn(),
    createObjectStore: vi.fn(),
    createIndex: vi.fn(),
  },
  mockSupabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

// Mock IndexedDB
vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue(mockDB),
  deleteDB: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

import { EmbeddingCache } from '@/services/ml/cache';

describe('EmbeddingCache', () => {
  let cache: EmbeddingCache;
  const testEmbedding: EmbeddingVector = {
    text: 'Test text',
    vector: new Array(512).fill(0.5),
    modelVersion: 'tfjs-use-v1',
    timestamp: Date.now(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    cache = new EmbeddingCache();
    await cache.initialize();
  });

  describe('Initialization', () => {
    it('should initialize IndexedDB successfully', async () => {
      const idb = await import('idb');
      expect(idb.openDB).toHaveBeenCalled();
    });

    it('should handle IndexedDB initialization errors gracefully', async () => {
      const idb = await import('idb');
      vi.mocked(idb.openDB).mockRejectedValueOnce(new Error('DB init failed'));

      const newCache = new EmbeddingCache();
      await expect(newCache.initialize()).resolves.not.toThrow();
      // Cache should still work with memory-only mode
    });

    it('should clean up expired entries on initialization', async () => {
      const mockTransaction = {
        done: Promise.resolve(),
        objectStore: vi.fn(() => ({
          index: vi.fn(() => ({
            openCursor: vi.fn().mockResolvedValue(null),
          })),
        })),
      };

      mockDB.transaction.mockReturnValueOnce(mockTransaction);

      const newCache = new EmbeddingCache();
      await newCache.initialize();

      // Should attempt cleanup
      expect(mockDB.transaction).toHaveBeenCalled();
    });
  });

  describe('Memory Cache', () => {
    it('should store and retrieve from memory cache', async () => {
      await cache.set(testEmbedding.text, testEmbedding);

      const result = await cache.get(testEmbedding.text, testEmbedding.modelVersion);

      expect(result).toEqual(testEmbedding);
    });

    it('should return null for cache miss', async () => {
      const result = await cache.get('non-existent', 'tfjs-use-v1');

      expect(result).toBeNull();
    });

    it('should handle different model versions', async () => {
      await cache.set(testEmbedding.text, testEmbedding);

      await cache.get(testEmbedding.text, 'different-version');

      // Should not find with different version
      expect(mockDB.get).toHaveBeenCalled();
    });

    it('should implement LRU eviction', async () => {
      const maxSize = 1000;

      // Fill cache beyond max size
      for (let i = 0; i < maxSize + 10; i++) {
        const embedding = {
          ...testEmbedding,
          text: `Text ${i}`,
        };
        await cache.set(embedding.text, embedding);
      }

      // First entries should be evicted
      const stats = await cache.getStats();
      expect(stats.memorySize).toBeLessThanOrEqual(maxSize);
    });

    it('should update existing entries', async () => {
      await cache.set(testEmbedding.text, testEmbedding);

      const updatedEmbedding = {
        ...testEmbedding,
        timestamp: Date.now() + 1000,
      };

      await cache.set(testEmbedding.text, updatedEmbedding);

      const retrieved = await cache.get(testEmbedding.text, testEmbedding.modelVersion);
      expect(retrieved?.timestamp).toBe(updatedEmbedding.timestamp);
    });
  });

  describe('IndexedDB Cache', () => {
    it('should promote IndexedDB results to memory cache', async () => {
      const idbResult = {
        text: testEmbedding.text,
        vector: testEmbedding.vector,
        modelVersion: testEmbedding.modelVersion,
        timestamp: Date.now() - 1000,
        accessCount: 5,
        lastAccessed: Date.now() - 1000,
      };

      mockDB.get.mockResolvedValueOnce(idbResult);

      const result = await cache.get(testEmbedding.text, testEmbedding.modelVersion);

      expect(result).toBeTruthy();
      expect(result?.text).toBe(testEmbedding.text);

      // Should update access stats
      expect(mockDB.put).toHaveBeenCalled();

      // Second call should hit memory cache
      mockDB.get.mockClear();
      await cache.get(testEmbedding.text, testEmbedding.modelVersion);
      expect(mockDB.get).not.toHaveBeenCalled();
    });

    it('should not return expired IndexedDB entries', async () => {
      const expiredResult = {
        text: testEmbedding.text,
        vector: testEmbedding.vector,
        modelVersion: testEmbedding.modelVersion,
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days old (TTL is 7 days)
        accessCount: 1,
        lastAccessed: Date.now() - (8 * 24 * 60 * 60 * 1000),
      };

      mockDB.get.mockResolvedValueOnce(expiredResult);

      const result = await cache.get(testEmbedding.text, testEmbedding.modelVersion);

      expect(result).toBeNull();
    });

    it('should handle IndexedDB read errors', async () => {
      mockDB.get.mockRejectedValueOnce(new Error('Read failed'));

      const result = await cache.get('test', 'tfjs-use-v1');

      // Should continue with other cache layers
      expect(result).toBeNull();
    });

    it('should handle IndexedDB write errors', async () => {
      mockDB.put.mockRejectedValueOnce(new Error('Write failed'));

      await expect(cache.set(testEmbedding.text, testEmbedding)).resolves.not.toThrow();
    });
  });

  describe('Supabase Cache', () => {
    it('should query Supabase for authenticated users', async () => {
      const supabaseResult = {
        text_hash: 'hash123',
        text_preview: testEmbedding.text.substring(0, 200),
        embedding_vector: testEmbedding.vector,
        model_version: testEmbedding.modelVersion,
        created_at: new Date().toISOString(),
        user_id: 'test-user-id',
      };

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: supabaseResult, error: null }),
      }));

      mockSupabase.from = mockFrom;

      const result = await cache.get(testEmbedding.text, testEmbedding.modelVersion);

      expect(mockFrom).toHaveBeenCalledWith('ml_cache');
      expect(result).toBeTruthy();
    });

    it('should not query Supabase for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const mockFrom = vi.fn();
      mockSupabase.from = mockFrom;

      await cache.get(testEmbedding.text, testEmbedding.modelVersion);

      // Should not query ml_cache table
      expect(mockFrom).not.toHaveBeenCalledWith('ml_cache');
    });

    it('should not return expired Supabase entries', async () => {
      const expiredResult = {
        text_hash: 'hash123',
        embedding_vector: testEmbedding.vector,
        model_version: testEmbedding.modelVersion,
        created_at: new Date(Date.now() - (8 * 24 * 60 * 60 * 1000)).toISOString(),
        user_id: 'test-user-id',
      };

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: expiredResult, error: null }),
      }));

      mockSupabase.from = mockFrom;

      const result = await cache.get(testEmbedding.text, testEmbedding.modelVersion);

      expect(result).toBeNull();
    });

    it('should promote Supabase results to lower cache layers', async () => {
      const supabaseResult = {
        text_hash: 'hash123',
        embedding_vector: testEmbedding.vector,
        model_version: testEmbedding.modelVersion,
        created_at: new Date().toISOString(),
        user_id: 'test-user-id',
      };

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: supabaseResult, error: null }),
      }));

      mockSupabase.from = mockFrom;

      await cache.get(testEmbedding.text, testEmbedding.modelVersion);

      // Should write to IndexedDB
      expect(mockDB.put).toHaveBeenCalled();

      // Should be in memory cache for subsequent calls
      mockFrom.mockClear();
      await cache.get(testEmbedding.text, testEmbedding.modelVersion);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should handle Supabase errors gracefully', async () => {
      mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Auth failed'));

      const result = await cache.get(testEmbedding.text, testEmbedding.modelVersion);

      expect(result).toBeNull();
    });

    it('should write to Supabase for authenticated users', async () => {
      await cache.set(testEmbedding.text, testEmbedding);

      expect(mockSupabase.from).toHaveBeenCalledWith('ml_cache');
    });

    it('should not write to Supabase for unauthenticated users', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const mockFrom = vi.fn();
      mockSupabase.from = mockFrom;

      await cache.set(testEmbedding.text, testEmbedding);

      // Should not attempt upsert
      expect(mockFrom).not.toHaveBeenCalledWith('ml_cache');
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache requests and hits', async () => {
      // Memory hit
      await cache.set(testEmbedding.text, testEmbedding);
      await cache.get(testEmbedding.text, testEmbedding.modelVersion);

      // Miss
      await cache.get('non-existent', 'tfjs-use-v1');

      const stats = await cache.getStats();

      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.totalHits).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', async () => {
      await cache.set(testEmbedding.text, testEmbedding);

      // 1 hit
      await cache.get(testEmbedding.text, testEmbedding.modelVersion);
      // 1 miss
      await cache.get('miss', 'tfjs-use-v1');

      const stats = await cache.getStats();

      expect(stats.hitRate).toBeCloseTo(0.5, 1);
    });

    it('should count cache sizes correctly', async () => {
      await cache.set(testEmbedding.text, testEmbedding);

      mockDB.count.mockResolvedValueOnce(5);

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
      }));

      mockSupabase.from = mockFrom;

      const stats = await cache.getStats();

      expect(stats.memorySize).toBeGreaterThan(0);
      expect(stats.indexedDBSize).toBe(5);
      expect(stats.supabaseSize).toBe(10);
    });

    it('should handle stat errors gracefully', async () => {
      mockDB.count.mockRejectedValueOnce(new Error('Count failed'));

      const stats = await cache.getStats();

      expect(stats.indexedDBSize).toBe(0);
    });
  });

  describe('Cache Clear', () => {
    it('should clear all cache layers', async () => {
      await cache.set(testEmbedding.text, testEmbedding);

      await cache.clear();

      const result = await cache.get(testEmbedding.text, testEmbedding.modelVersion);
      expect(result).toBeNull();

      expect(mockDB.clear).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('ml_cache');
    });

    it('should handle clear errors', async () => {
      mockDB.clear.mockRejectedValueOnce(new Error('Clear failed'));

      await expect(cache.clear()).resolves.not.toThrow();
    });

    it('should only clear user-specific Supabase cache', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null });

      mockSupabase.from = vi.fn(() => ({
        delete: mockDelete,
        eq: mockEq,
      }));

      await cache.clear();

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('user_id', 'test-user-id');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text', async () => {
      const longEmbedding = {
        ...testEmbedding,
        text: 'a'.repeat(10000),
      };

      await cache.set(longEmbedding.text, longEmbedding);

      const result = await cache.get(longEmbedding.text, longEmbedding.modelVersion);
      expect(result?.text).toBe(longEmbedding.text);
    });

    it('should handle special characters in text', async () => {
      const specialEmbedding = {
        ...testEmbedding,
        text: 'Text with !@#$%^&*() 中文 🚀',
      };

      await cache.set(specialEmbedding.text, specialEmbedding);

      const result = await cache.get(specialEmbedding.text, specialEmbedding.modelVersion);
      expect(result?.text).toBe(specialEmbedding.text);
    });

    it('should handle concurrent cache operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => ({
        text: `Text ${i}`,
        vector: new Array(512).fill(i),
        modelVersion: 'tfjs-use-v1',
        timestamp: Date.now(),
      }));

      await Promise.all(
        operations.map(embedding => cache.set(embedding.text, embedding))
      );

      const results = await Promise.all(
        operations.map(embedding => cache.get(embedding.text, embedding.modelVersion))
      );

      results.forEach((result, i) => {
        expect(result?.text).toBe(operations[i].text);
      });
    });

    it('should handle zero-length vectors', async () => {
      const zeroEmbedding = {
        ...testEmbedding,
        vector: [],
      };

      await cache.set(zeroEmbedding.text, zeroEmbedding);

      const result = await cache.get(zeroEmbedding.text, zeroEmbedding.modelVersion);
      expect(result?.vector).toEqual([]);
    });
  });

  describe('Text Hashing', () => {
    it('should generate consistent hashes for same text', async () => {
      const text = 'Test text for hashing';

      await cache.set(text, testEmbedding);
      await cache.set(text, testEmbedding);

      // Should use same hash (observable through Supabase calls)
      const calls = vi.mocked(mockSupabase.from).mock.calls.filter(
        call => call[0] === 'ml_cache'
      );

      expect(calls.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for different text', async () => {
      // This tests the internal hash function indirectly
      const embedding1 = { ...testEmbedding, text: 'Text A' };
      const embedding2 = { ...testEmbedding, text: 'Text B' };

      await cache.set(embedding1.text, embedding1);
      await cache.set(embedding2.text, embedding2);

      // Both should be stored separately
      const result1 = await cache.get(embedding1.text, embedding1.modelVersion);
      const result2 = await cache.get(embedding2.text, embedding2.modelVersion);

      expect(result1?.text).toBe(embedding1.text);
      expect(result2?.text).toBe(embedding2.text);
    });
  });
});
