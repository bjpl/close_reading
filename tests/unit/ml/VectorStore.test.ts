/**
 * Unit Tests for Vector Store
 *
 * Tests vector storage, retrieval, similarity search, and cache management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VectorStore, StoredVector } from '../../../src/services/ml/VectorStore';

describe('VectorStore', () => {
  let store: VectorStore;

  beforeEach(async () => {
    store = new VectorStore();
    await store.initialize();
    await store.clear(); // Start with clean slate
  });

  afterEach(async () => {
    await store.clear();
    await store.dispose();
  });

  // Helper function to create test vectors
  const createTestVector = (
    id: string,
    documentId: string,
    dimensions = 384
  ): StoredVector => ({
    id,
    documentId,
    paragraphId: `para-${id}`,
    text: `Test text for vector ${id}`,
    vector: Array.from({ length: dimensions }, () => Math.random()),
    metadata: { test: true },
    timestamp: Date.now(),
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newStore = new VectorStore();
      await expect(newStore.initialize()).resolves.not.toThrow();
      await newStore.dispose();
    });

    it('should handle multiple initialization calls', async () => {
      await store.initialize();
      await store.initialize(); // Should not throw
    });
  });

  describe('Vector Storage', () => {
    it('should store a single vector', async () => {
      const vector = createTestVector('test-1', 'doc-1');

      await store.store(vector);

      const retrieved = await store.get(vector.id);
      expect(retrieved).toEqual(vector);
    });

    it('should store multiple vectors in batch', async () => {
      const vectors = [
        createTestVector('test-1', 'doc-1'),
        createTestVector('test-2', 'doc-1'),
        createTestVector('test-3', 'doc-1'),
      ];

      await store.storeBatch(vectors);

      const stats = await store.getStats();
      expect(stats.totalVectors).toBe(3);
    });

    it('should update existing vector', async () => {
      const vector = createTestVector('test-1', 'doc-1');

      await store.store(vector);

      const updatedVector = {
        ...vector,
        text: 'Updated text',
      };

      await store.store(updatedVector);

      const retrieved = await store.get(vector.id);
      expect(retrieved?.text).toBe('Updated text');
    });

    it('should handle vectors with different dimensions', async () => {
      const vector128 = createTestVector('test-128', 'doc-1', 128);
      const vector384 = createTestVector('test-384', 'doc-1', 384);

      await store.store(vector128);
      await store.store(vector384);

      const retrieved128 = await store.get('test-128');
      const retrieved384 = await store.get('test-384');

      expect(retrieved128?.vector).toHaveLength(128);
      expect(retrieved384?.vector).toHaveLength(384);
    });
  });

  describe('Vector Retrieval', () => {
    it('should retrieve vector by ID', async () => {
      const vector = createTestVector('test-1', 'doc-1');
      await store.store(vector);

      const retrieved = await store.get('test-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-1');
    });

    it('should return null for non-existent vector', async () => {
      const retrieved = await store.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should retrieve all vectors for a document', async () => {
      const doc1Vectors = [
        createTestVector('test-1', 'doc-1'),
        createTestVector('test-2', 'doc-1'),
      ];

      const doc2Vectors = [
        createTestVector('test-3', 'doc-2'),
      ];

      await store.storeBatch([...doc1Vectors, ...doc2Vectors]);

      const doc1Retrieved = await store.getByDocument('doc-1');
      const doc2Retrieved = await store.getByDocument('doc-2');

      expect(doc1Retrieved).toHaveLength(2);
      expect(doc2Retrieved).toHaveLength(1);
    });
  });

  describe('Similarity Search', () => {
    it('should find similar vectors using cosine similarity', async () => {
      // Create vectors with known similarity
      const baseVector = Array.from({ length: 384 }, () => Math.random());

      // Similar vector (with small perturbation)
      const similarVector = baseVector.map(v => v + (Math.random() - 0.5) * 0.1);

      // Dissimilar vector
      const dissimilarVector = Array.from({ length: 384 }, () => Math.random());

      await store.storeBatch([
        {
          id: 'similar',
          documentId: 'doc-1',
          text: 'Similar text',
          vector: similarVector,
          metadata: {},
          timestamp: Date.now(),
        },
        {
          id: 'dissimilar',
          documentId: 'doc-1',
          text: 'Dissimilar text',
          vector: dissimilarVector,
          metadata: {},
          timestamp: Date.now(),
        },
      ]);

      const results = await store.findSimilar(baseVector, {
        threshold: 0.5,
        topK: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.5);
    });

    it('should respect similarity threshold', async () => {
      const baseVector = Array.from({ length: 384 }, () => Math.random());

      await store.storeBatch([
        {
          id: 'test-1',
          documentId: 'doc-1',
          text: 'Test',
          vector: Array.from({ length: 384 }, () => Math.random()),
          metadata: {},
          timestamp: Date.now(),
        },
      ]);

      const resultsLow = await store.findSimilar(baseVector, {
        threshold: 0.1,
        topK: 10,
      });

      const resultsHigh = await store.findSimilar(baseVector, {
        threshold: 0.9,
        topK: 10,
      });

      expect(resultsLow.length).toBeGreaterThanOrEqual(resultsHigh.length);
    });

    it('should respect topK limit', async () => {
      const baseVector = Array.from({ length: 384 }, () => Math.random());

      // Create multiple similar vectors
      const vectors = Array.from({ length: 20 }, (_, i) => ({
        id: `test-${i}`,
        documentId: 'doc-1',
        text: `Test ${i}`,
        vector: baseVector.map(v => v + (Math.random() - 0.5) * 0.1),
        metadata: {},
        timestamp: Date.now(),
      }));

      await store.storeBatch(vectors);

      const results = await store.findSimilar(baseVector, {
        threshold: 0,
        topK: 5,
      });

      expect(results).toHaveLength(5);
    });

    it('should exclude specified IDs from results', async () => {
      const baseVector = Array.from({ length: 384 }, () => Math.random());

      await store.storeBatch([
        {
          id: 'exclude-me',
          documentId: 'doc-1',
          text: 'Test',
          vector: baseVector,
          metadata: {},
          timestamp: Date.now(),
        },
        {
          id: 'include-me',
          documentId: 'doc-1',
          text: 'Test',
          vector: baseVector,
          metadata: {},
          timestamp: Date.now(),
        },
      ]);

      const results = await store.findSimilar(baseVector, {
        threshold: 0,
        topK: 10,
        excludeIds: ['exclude-me'],
      });

      expect(results.some(r => r.id === 'exclude-me')).toBe(false);
      expect(results.some(r => r.id === 'include-me')).toBe(true);
    });

    it('should filter by document ID', async () => {
      const baseVector = Array.from({ length: 384 }, () => Math.random());

      await store.storeBatch([
        {
          id: 'doc1-vec',
          documentId: 'doc-1',
          text: 'Test',
          vector: baseVector,
          metadata: {},
          timestamp: Date.now(),
        },
        {
          id: 'doc2-vec',
          documentId: 'doc-2',
          text: 'Test',
          vector: baseVector,
          metadata: {},
          timestamp: Date.now(),
        },
      ]);

      const results = await store.findSimilar(baseVector, {
        documentId: 'doc-1',
        threshold: 0,
        topK: 10,
      });

      expect(results.every(r => r.documentId === 'doc-1')).toBe(true);
    });

    it('should return results sorted by similarity', async () => {
      const baseVector = Array.from({ length: 384 }, () => Math.random());

      const vectors = Array.from({ length: 10 }, (_, i) => ({
        id: `test-${i}`,
        documentId: 'doc-1',
        text: `Test ${i}`,
        vector: baseVector.map(v => v + (Math.random() - 0.5) * 0.5),
        metadata: {},
        timestamp: Date.now(),
      }));

      await store.storeBatch(vectors);

      const results = await store.findSimilar(baseVector, {
        threshold: 0,
        topK: 10,
      });

      // Check that results are sorted in descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity);
      }
    });
  });

  describe('Performance', () => {
    it('should search 1000 vectors in <50ms (target)', async () => {
      const baseVector = Array.from({ length: 384 }, () => Math.random());

      // Create 1000 vectors
      const vectors = Array.from({ length: 1000 }, (_, i) => ({
        id: `test-${i}`,
        documentId: 'doc-1',
        text: `Test ${i}`,
        vector: Array.from({ length: 384 }, () => Math.random()),
        metadata: {},
        timestamp: Date.now(),
      }));

      await store.storeBatch(vectors);

      const startTime = performance.now();
      const results = await store.findSimilar(baseVector, {
        threshold: 0.5,
        topK: 10,
      });
      const duration = performance.now() - startTime;

      console.log(`Search of 1000 vectors took ${duration.toFixed(2)}ms`);

      expect(results).toBeDefined();
      // Allow some leeway in CI environments
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Cache Management', () => {
    it('should cache retrieved vectors', async () => {
      const vector = createTestVector('test-1', 'doc-1');
      await store.store(vector);

      // First retrieval - cache miss
      await store.get('test-1');

      // Second retrieval - cache hit
      await store.get('test-1');

      const stats = await store.getStats();
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });

    it('should respect cache size limits', async () => {
      // Store many vectors to test cache eviction
      const vectors = Array.from({ length: 15000 }, (_, i) =>
        createTestVector(`test-${i}`, 'doc-1')
      );

      await store.storeBatch(vectors);

      const stats = await store.getStats();
      expect(stats.cacheSize).toBeLessThanOrEqual(10000); // MAX_CACHE_ITEMS
    });
  });

  describe('Vector Deletion', () => {
    it('should delete a single vector', async () => {
      const vector = createTestVector('test-1', 'doc-1');
      await store.store(vector);

      await store.delete('test-1');

      const retrieved = await store.get('test-1');
      expect(retrieved).toBeNull();
    });

    it('should delete all vectors for a document', async () => {
      const vectors = [
        createTestVector('test-1', 'doc-1'),
        createTestVector('test-2', 'doc-1'),
        createTestVector('test-3', 'doc-2'),
      ];

      await store.storeBatch(vectors);

      await store.deleteByDocument('doc-1');

      const doc1Vectors = await store.getByDocument('doc-1');
      const doc2Vectors = await store.getByDocument('doc-2');

      expect(doc1Vectors).toHaveLength(0);
      expect(doc2Vectors).toHaveLength(1);
    });

    it('should clear all vectors', async () => {
      const vectors = Array.from({ length: 10 }, (_, i) =>
        createTestVector(`test-${i}`, 'doc-1')
      );

      await store.storeBatch(vectors);

      await store.clear();

      const stats = await store.getStats();
      expect(stats.totalVectors).toBe(0);
    });
  });

  describe('Metadata Management', () => {
    it('should store and retrieve metadata', async () => {
      await store.setMetadata('test-key', { value: 'test-value' });

      const retrieved = await store.getMetadata('test-key');

      expect(retrieved).toEqual({ value: 'test-value' });
    });

    it('should return null for non-existent metadata', async () => {
      const retrieved = await store.getMetadata('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should track statistics correctly', async () => {
      const vectors = Array.from({ length: 5 }, (_, i) =>
        createTestVector(`test-${i}`, 'doc-1')
      );

      await store.storeBatch(vectors);

      const stats = await store.getStats();

      expect(stats.totalVectors).toBe(5);
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
      expect(stats.totalSearches).toBeGreaterThanOrEqual(0);
    });
  });
});
