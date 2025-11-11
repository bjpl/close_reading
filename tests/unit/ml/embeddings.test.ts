import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmbeddingService } from '@/services/ml/embeddings';
import type { EmbeddingCache } from '@/services/ml/cache';

// Mock TensorFlow.js and Universal Sentence Encoder
vi.mock('@tensorflow/tfjs', () => ({
  ready: vi.fn().mockResolvedValue(undefined),
  getBackend: vi.fn().mockReturnValue('cpu'),
}));

vi.mock('@tensorflow-models/universal-sentence-encoder', () => ({
  load: vi.fn().mockResolvedValue({
    embed: vi.fn((texts: string[]) => {
      // Create mock embeddings (512 dimensions for USE)
      const mockVectors = texts.map(() =>
        Array.from({ length: 512 }, () => Math.random())
      );
      return Promise.resolve({
        data: vi.fn().mockResolvedValue(new Float32Array(mockVectors.flat())),
        array: vi.fn().mockResolvedValue(mockVectors),
        dispose: vi.fn(),
      });
    }),
  }),
}));

// Mock the cache
vi.mock('@/services/ml/cache', () => ({
  EmbeddingCache: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({
      memorySize: 0,
      indexedDBSize: 0,
      supabaseSize: 0,
      hitRate: 0,
      totalRequests: 0,
      totalHits: 0,
    }),
  })),
}));

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockCache: EmbeddingCache;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmbeddingService();
    mockCache = (service as any).cache;
  });

  afterEach(() => {
    service.dispose();
  });

  describe('Initialization', () => {
    it('should initialize the model and cache', async () => {
      await service.initialize();

      expect(service.isReady()).toBe(true);
      expect(mockCache.initialize).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      await service.initialize();
      await service.initialize();

      // Should only initialize once
      expect(mockCache.initialize).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent initialization calls', async () => {
      const promise1 = service.initialize();
      const promise2 = service.initialize();

      await Promise.all([promise1, promise2]);

      expect(service.isReady()).toBe(true);
    });

    it('should handle initialization errors', async () => {
      const errorService = new EmbeddingService();
      const use = await import('@tensorflow-models/universal-sentence-encoder');
      vi.mocked(use.load).mockRejectedValueOnce(new Error('Model load failed'));

      await expect(errorService.initialize()).rejects.toThrow('Model load failed');
      expect(errorService.isReady()).toBe(false);
    });
  });

  describe('Single Embedding', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate embedding for text', async () => {
      const text = 'This is a test sentence for embedding generation.';
      const result = await service.embed(text);

      expect(result).toHaveProperty('text', text);
      expect(result).toHaveProperty('vector');
      expect(result).toHaveProperty('modelVersion');
      expect(result).toHaveProperty('timestamp');
      expect(result.vector).toBeInstanceOf(Array);
      expect(result.vector.length).toBe(512); // USE has 512 dimensions
    });

    it('should return cached embedding if available', async () => {
      const text = 'Cached text';
      const cachedEmbedding = {
        text,
        vector: new Array(512).fill(0.5),
        modelVersion: 'tfjs-use-v1',
        timestamp: Date.now(),
      };

      vi.mocked(mockCache.get).mockResolvedValueOnce(cachedEmbedding);

      const result = await service.embed(text);

      expect(result).toEqual(cachedEmbedding);
      expect(mockCache.get).toHaveBeenCalledWith(text, 'tfjs-use-v1');
    });

    it('should cache newly generated embeddings', async () => {
      const text = 'New text to cache';
      await service.embed(text);

      expect(mockCache.set).toHaveBeenCalled();
      const setCalls = vi.mocked(mockCache.set).mock.calls;
      expect(setCalls[0][0]).toBe(text);
      expect(setCalls[0][1]).toHaveProperty('vector');
    });

    it('should handle empty text', async () => {
      const result = await service.embed('');

      expect(result.text).toBe('');
      expect(result.vector).toBeInstanceOf(Array);
    });

    it('should handle very long text', async () => {
      const longText = 'word '.repeat(1000);
      const result = await service.embed(longText);

      expect(result.text).toBe(longText);
      expect(result.vector.length).toBe(512);
    });

    it('should auto-initialize if not ready', async () => {
      const newService = new EmbeddingService();
      expect(newService.isReady()).toBe(false);

      await newService.embed('Test text');

      expect(newService.isReady()).toBe(true);
    });

    it('should handle embedding generation errors', async () => {
      const use = await import('@tensorflow-models/universal-sentence-encoder');
      const mockModel = await use.load();
      vi.mocked(mockModel.embed).mockRejectedValueOnce(new Error('Embedding failed'));

      await expect(service.embed('Test')).rejects.toThrow('Embedding failed');
    });
  });

  describe('Batch Embedding', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate embeddings for multiple texts', async () => {
      const texts = [
        'First sentence',
        'Second sentence',
        'Third sentence',
      ];

      const result = await service.embedBatch(texts);

      expect(result.embeddings).toHaveLength(3);
      expect(result.computed).toBe(3);
      expect(result.cached).toBe(0);
      expect(result.duration).toBeGreaterThan(0);

      result.embeddings.forEach((embedding, i) => {
        expect(embedding.text).toBe(texts[i]);
        expect(embedding.vector.length).toBe(512);
      });
    });

    it('should use cached embeddings when available', async () => {
      const texts = ['Cached 1', 'New 1', 'Cached 2'];
      const cachedEmbedding1 = {
        text: 'Cached 1',
        vector: new Array(512).fill(0.1),
        modelVersion: 'tfjs-use-v1',
        timestamp: Date.now(),
      };
      const cachedEmbedding2 = {
        text: 'Cached 2',
        vector: new Array(512).fill(0.2),
        modelVersion: 'tfjs-use-v1',
        timestamp: Date.now(),
      };

      vi.mocked(mockCache.get)
        .mockResolvedValueOnce(cachedEmbedding1)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(cachedEmbedding2);

      const result = await service.embedBatch(texts);

      expect(result.embeddings).toHaveLength(3);
      expect(result.cached).toBe(2);
      expect(result.computed).toBe(1);
    });

    it('should handle empty array', async () => {
      const result = await service.embedBatch([]);

      expect(result.embeddings).toHaveLength(0);
      expect(result.cached).toBe(0);
      expect(result.computed).toBe(0);
    });

    it('should handle single text in batch', async () => {
      const result = await service.embedBatch(['Single text']);

      expect(result.embeddings).toHaveLength(1);
    });

    it('should handle large batches efficiently', async () => {
      const texts = Array.from({ length: 50 }, (_, i) => `Text ${i}`);
      const result = await service.embedBatch(texts);

      expect(result.embeddings).toHaveLength(50);
      expect(result.computed).toBe(50);
    });

    it('should maintain order in batch results', async () => {
      const texts = ['First', 'Second', 'Third'];
      const result = await service.embedBatch(texts);

      result.embeddings.forEach((embedding, i) => {
        expect(embedding.text).toBe(texts[i]);
      });
    });

    it('should cache all newly computed embeddings', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];
      await service.embedBatch(texts);

      expect(mockCache.set).toHaveBeenCalledTimes(3);
    });

    it('should handle batch generation errors', async () => {
      const use = await import('@tensorflow-models/universal-sentence-encoder');
      const mockModel = await use.load();
      vi.mocked(mockModel.embed).mockRejectedValueOnce(new Error('Batch failed'));

      await expect(service.embedBatch(['Test 1', 'Test 2'])).rejects.toThrow('Batch failed');
    });
  });

  describe('Cache Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should clear cache', async () => {
      await service.clearCache();

      expect(mockCache.clear).toHaveBeenCalled();
    });

    it('should get cache statistics', async () => {
      const stats = await service.getCacheStats();

      expect(stats).toHaveProperty('memorySize');
      expect(stats).toHaveProperty('indexedDBSize');
      expect(stats).toHaveProperty('supabaseSize');
      expect(stats).toHaveProperty('hitRate');
      expect(mockCache.getStats).toHaveBeenCalled();
    });
  });

  describe('Resource Management', () => {
    it('should dispose of model', () => {
      service.dispose();

      expect(service.isReady()).toBe(false);
    });

    it('should be safe to dispose multiple times', () => {
      service.dispose();
      service.dispose();

      expect(service.isReady()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle special characters', async () => {
      const text = 'Text with !@#$%^&*() special chars';
      const result = await service.embed(text);

      expect(result.text).toBe(text);
      expect(result.vector.length).toBe(512);
    });

    it('should handle unicode text', async () => {
      const text = '这是中文文本 🚀 emoji text';
      const result = await service.embed(text);

      expect(result.text).toBe(text);
      expect(result.vector.length).toBe(512);
    });

    it('should handle line breaks', async () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = await service.embed(text);

      expect(result.text).toBe(text);
    });

    it('should generate different embeddings for different texts', async () => {
      const result1 = await service.embed('This is text A');
      const result2 = await service.embed('This is text B');

      expect(result1.vector).not.toEqual(result2.vector);
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should complete embedding generation in reasonable time', async () => {
      const startTime = performance.now();
      await service.embed('Test sentence for performance');
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should be faster with caching', async () => {
      const text = 'Cached performance test';

      // First call - uncached
      await service.embed(text);

      // Mock cache to return result
      const cachedResult = {
        text,
        vector: new Array(512).fill(0.5),
        modelVersion: 'tfjs-use-v1',
        timestamp: Date.now(),
      };
      vi.mocked(mockCache.get).mockResolvedValueOnce(cachedResult);

      // Second call - cached (should be faster)
      const startTime = performance.now();
      await service.embed(text);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(50); // Cached lookup should be very fast
    });
  });
});
