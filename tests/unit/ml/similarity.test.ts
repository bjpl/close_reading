import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  calculateSimilarities,
  findSimilarParagraphs,
  calculateSimilarityMatrix,
  clusterBySimilarity,
  getSimilarityStats,
} from '@/services/ml/similarity';
import type { EmbeddingVector } from '@/services/ml/embeddings';

describe('Similarity Service', () => {
  const createMockVector = (length: number, value: number): number[] => {
    return new Array(length).fill(value);
  };

  const createMockEmbedding = (id: string, text: string, vectorValue: number): EmbeddingVector => ({
    text,
    vector: createMockVector(512, vectorValue),
    modelVersion: 'test-v1',
    timestamp: Date.now(),
  });

  describe('cosineSimilarity', () => {
    it('should calculate similarity between identical vectors', () => {
      const vecA = [1, 2, 3, 4, 5];
      const vecB = [1, 2, 3, 4, 5];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should calculate similarity between orthogonal vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(0.0, 5);
    });

    it('should calculate similarity between opposite vectors', () => {
      const vecA = [1, 1, 1];
      const vecB = [-1, -1, -1];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it('should calculate partial similarity', () => {
      const vecA = [1, 2, 3];
      const vecB = [2, 3, 4];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeGreaterThan(0.9);
      expect(similarity).toBeLessThan(1.0);
    });

    it('should handle zero vectors', () => {
      const vecA = [0, 0, 0];
      const vecB = [1, 2, 3];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBe(0);
    });

    it('should handle vectors with negative values', () => {
      const vecA = [1, -2, 3];
      const vecB = [2, -1, 4];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeGreaterThan(0);
    });

    it('should throw error for vectors of different lengths', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2];

      expect(() => cosineSimilarity(vecA, vecB)).toThrow('Vectors must have the same length');
    });

    it('should handle very small values', () => {
      const vecA = [0.0001, 0.0002, 0.0003];
      const vecB = [0.0001, 0.0002, 0.0003];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle very large values', () => {
      const vecA = [1000000, 2000000, 3000000];
      const vecB = [1000000, 2000000, 3000000];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });
  });

  describe('calculateSimilarities', () => {
    it('should calculate similarities for multiple targets', () => {
      const queryVector = [1, 2, 3];
      const targets = [
        { id: 'para-1', text: 'Text 1', vector: [1, 2, 3] },
        { id: 'para-2', text: 'Text 2', vector: [2, 3, 4] },
        { id: 'para-3', text: 'Text 3', vector: [-1, -2, -3] },
      ];

      const results = calculateSimilarities(queryVector, targets);

      expect(results).toHaveLength(3);
      expect(results[0].paragraphId).toBe('para-1');
      expect(results[0].score).toBeCloseTo(1.0, 5);
      expect(results[0].rank).toBe(1);
    });

    it('should sort results by score descending', () => {
      const queryVector = [1, 0, 0];
      const targets = [
        { id: 'para-1', text: 'Text 1', vector: [0.5, 0.5, 0] }, // Lower similarity
        { id: 'para-2', text: 'Text 2', vector: [1, 0, 0] }, // Perfect match
        { id: 'para-3', text: 'Text 3', vector: [0.3, 0.7, 0] }, // Lowest similarity
      ];

      const results = calculateSimilarities(queryVector, targets);

      expect(results[0].paragraphId).toBe('para-2'); // Highest score (perfect match)
      expect(results[1].paragraphId).toBe('para-1'); // Medium score
      expect(results[2].paragraphId).toBe('para-3'); // Lowest score
    });

    it('should assign ranks correctly', () => {
      const queryVector = [1, 1, 1];
      const targets = [
        { id: 'para-1', text: 'Text 1', vector: [1, 1, 1] },
        { id: 'para-2', text: 'Text 2', vector: [1, 1, 0] },
      ];

      const results = calculateSimilarities(queryVector, targets);

      expect(results[0].rank).toBe(1);
      expect(results[1].rank).toBe(2);
    });

    it('should handle empty targets array', () => {
      const queryVector = [1, 2, 3];
      const targets: Array<{ id: string; text: string; vector: number[] }> = [];

      const results = calculateSimilarities(queryVector, targets);

      expect(results).toHaveLength(0);
    });
  });

  describe('findSimilarParagraphs', () => {
    it('should find similar paragraphs above threshold', () => {
      const queryEmbedding = createMockEmbedding('query', 'Query text', 1.0);
      const candidates = new Map<string, EmbeddingVector>([
        ['para-1', createMockEmbedding('para-1', 'Similar text', 0.95)],
        ['para-2', createMockEmbedding('para-2', 'Very different', 0.1)],
        ['para-3', createMockEmbedding('para-3', 'Also similar', 0.9)],
      ]);

      const results = findSimilarParagraphs(queryEmbedding, candidates, {
        minScore: 0.5,
        maxResults: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should respect maxResults limit', () => {
      const queryEmbedding = createMockEmbedding('query', 'Query text', 1.0);
      const candidates = new Map<string, EmbeddingVector>();

      for (let i = 0; i < 20; i++) {
        candidates.set(`para-${i}`, createMockEmbedding(`para-${i}`, `Text ${i}`, 0.9));
      }

      const results = findSimilarParagraphs(queryEmbedding, candidates, {
        minScore: 0.5,
        maxResults: 5,
      });

      expect(results).toHaveLength(5);
    });

    it('should exclude specified IDs', () => {
      const queryEmbedding = createMockEmbedding('query', 'Query text', 1.0);
      const candidates = new Map<string, EmbeddingVector>([
        ['para-1', createMockEmbedding('para-1', 'Text 1', 0.9)],
        ['para-2', createMockEmbedding('para-2', 'Text 2', 0.85)],
        ['para-3', createMockEmbedding('para-3', 'Text 3', 0.8)],
      ]);

      const results = findSimilarParagraphs(queryEmbedding, candidates, {
        excludeIds: new Set(['para-1', 'para-3']),
        minScore: 0.5,
        maxResults: 10,
      });

      expect(results).toHaveLength(1);
      expect(results[0].paragraphId).toBe('para-2');
    });

    it('should use default options when not provided', () => {
      const queryEmbedding = createMockEmbedding('query', 'Query text', 1.0);
      const candidates = new Map<string, EmbeddingVector>([
        ['para-1', createMockEmbedding('para-1', 'Text 1', 0.95)],
      ]);

      const results = findSimilarParagraphs(queryEmbedding, candidates);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty candidates map', () => {
      const queryEmbedding = createMockEmbedding('query', 'Query text', 1.0);
      const candidates = new Map<string, EmbeddingVector>();

      const results = findSimilarParagraphs(queryEmbedding, candidates);

      expect(results).toHaveLength(0);
    });
  });

  describe('calculateSimilarityMatrix', () => {
    it('should create symmetric matrix', () => {
      const embeddings = [
        createMockEmbedding('1', 'Text 1', 1.0),
        createMockEmbedding('2', 'Text 2', 0.9),
        createMockEmbedding('3', 'Text 3', 0.8),
      ];

      const matrix = calculateSimilarityMatrix(embeddings);

      expect(matrix).toHaveLength(3);
      expect(matrix[0]).toHaveLength(3);

      // Check symmetry
      for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix.length; j++) {
          expect(matrix[i][j]).toBeCloseTo(matrix[j][i], 5);
        }
      }
    });

    it('should have 1.0 on diagonal', () => {
      const embeddings = [
        createMockEmbedding('1', 'Text 1', 1.0),
        createMockEmbedding('2', 'Text 2', 0.9),
      ];

      const matrix = calculateSimilarityMatrix(embeddings);

      expect(matrix[0][0]).toBe(1.0);
      expect(matrix[1][1]).toBe(1.0);
    });

    it('should handle single embedding', () => {
      const embeddings = [createMockEmbedding('1', 'Text 1', 1.0)];

      const matrix = calculateSimilarityMatrix(embeddings);

      expect(matrix).toHaveLength(1);
      expect(matrix[0][0]).toBe(1.0);
    });

    it('should handle empty array', () => {
      const embeddings: EmbeddingVector[] = [];

      const matrix = calculateSimilarityMatrix(embeddings);

      expect(matrix).toHaveLength(0);
    });

    it('should calculate correct similarities', () => {
      const embeddings = [
        { ...createMockEmbedding('1', 'Text 1', 1.0), vector: [1, 0, 0] },
        { ...createMockEmbedding('2', 'Text 2', 0.9), vector: [0, 1, 0] },
      ];

      const matrix = calculateSimilarityMatrix(embeddings);

      // Orthogonal vectors should have 0 similarity
      expect(matrix[0][1]).toBeCloseTo(0.0, 5);
      expect(matrix[1][0]).toBeCloseTo(0.0, 5);
    });
  });

  describe('clusterBySimilarity', () => {
    it('should cluster similar embeddings', () => {
      const embeddings = new Map<string, EmbeddingVector>([
        ['1', { ...createMockEmbedding('1', 'Text 1', 1.0), vector: [1, 0, 0] }],
        ['2', { ...createMockEmbedding('2', 'Text 2', 1.0), vector: [0.9, 0, 0] }],
        ['3', { ...createMockEmbedding('3', 'Text 3', 0.0), vector: [0, 1, 0] }],
      ]);

      const clusters = clusterBySimilarity(embeddings, 0.5);

      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.every(c => c.members.length > 0)).toBe(true);
    });

    it('should create separate clusters for dissimilar items', () => {
      const embeddings = new Map<string, EmbeddingVector>([
        ['1', { ...createMockEmbedding('1', 'Text 1', 1.0), vector: [1, 0, 0] }],
        ['2', { ...createMockEmbedding('2', 'Text 2', 0.0), vector: [0, 1, 0] }],
        ['3', { ...createMockEmbedding('3', 'Text 3', 0.0), vector: [0, 0, 1] }],
      ]);

      const clusters = clusterBySimilarity(embeddings, 0.9);

      // With high threshold, dissimilar items should be in separate clusters
      expect(clusters.length).toBeGreaterThan(1);
    });

    it('should assign each item to exactly one cluster', () => {
      const embeddings = new Map<string, EmbeddingVector>([
        ['1', createMockEmbedding('1', 'Text 1', 1.0)],
        ['2', createMockEmbedding('2', 'Text 2', 0.9)],
        ['3', createMockEmbedding('3', 'Text 3', 0.8)],
      ]);

      const clusters = clusterBySimilarity(embeddings);

      const allMembers = clusters.flatMap(c => c.members);
      const uniqueMembers = new Set(allMembers);

      expect(allMembers.length).toBe(uniqueMembers.size);
      expect(uniqueMembers.size).toBe(embeddings.size);
    });

    it('should calculate cluster centroids', () => {
      const embeddings = new Map<string, EmbeddingVector>([
        ['1', createMockEmbedding('1', 'Text 1', 1.0)],
        ['2', createMockEmbedding('2', 'Text 2', 0.9)],
      ]);

      const clusters = clusterBySimilarity(embeddings);

      clusters.forEach(cluster => {
        expect(cluster.centroid).toBeDefined();
        expect(cluster.centroid.length).toBeGreaterThan(0);
      });
    });

    it('should calculate average similarity', () => {
      const embeddings = new Map<string, EmbeddingVector>([
        ['1', createMockEmbedding('1', 'Text 1', 1.0)],
        ['2', createMockEmbedding('2', 'Text 2', 0.9)],
      ]);

      const clusters = clusterBySimilarity(embeddings);

      clusters.forEach(cluster => {
        expect(cluster.avgSimilarity).toBeGreaterThanOrEqual(0);
        expect(cluster.avgSimilarity).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty embeddings map', () => {
      const embeddings = new Map<string, EmbeddingVector>();

      const clusters = clusterBySimilarity(embeddings);

      expect(clusters).toHaveLength(0);
    });

    it('should handle single embedding', () => {
      const embeddings = new Map<string, EmbeddingVector>([
        ['1', createMockEmbedding('1', 'Text 1', 1.0)],
      ]);

      const clusters = clusterBySimilarity(embeddings);

      expect(clusters).toHaveLength(1);
      expect(clusters[0].members).toHaveLength(1);
      expect(clusters[0].avgSimilarity).toBe(1.0);
    });

    it('should respect threshold parameter', () => {
      const embeddings = new Map<string, EmbeddingVector>([
        ['1', { ...createMockEmbedding('1', 'Text 1', 1.0), vector: [1, 0] }],
        ['2', { ...createMockEmbedding('2', 'Text 2', 0.5), vector: [0.5, 0.5] }],
      ]);

      const strictClusters = clusterBySimilarity(embeddings, 0.9);
      const looseClusters = clusterBySimilarity(embeddings, 0.3);

      // Stricter threshold should produce more clusters
      expect(strictClusters.length).toBeGreaterThanOrEqual(looseClusters.length);
    });
  });

  describe('getSimilarityStats', () => {
    it('should calculate mean correctly', () => {
      const similarities = [0.5, 0.6, 0.7, 0.8, 0.9];

      const stats = getSimilarityStats(similarities);

      expect(stats.mean).toBeCloseTo(0.7, 5);
    });

    it('should calculate median for odd count', () => {
      const similarities = [0.1, 0.5, 0.9];

      const stats = getSimilarityStats(similarities);

      expect(stats.median).toBe(0.5);
    });

    it('should calculate median for even count', () => {
      const similarities = [0.1, 0.4, 0.6, 0.9];

      const stats = getSimilarityStats(similarities);

      expect(stats.median).toBe(0.5); // (0.4 + 0.6) / 2
    });

    it('should calculate min and max', () => {
      const similarities = [0.2, 0.8, 0.5, 0.1, 0.9];

      const stats = getSimilarityStats(similarities);

      expect(stats.min).toBe(0.1);
      expect(stats.max).toBe(0.9);
    });

    it('should calculate standard deviation', () => {
      const similarities = [0.5, 0.5, 0.5, 0.5];

      const stats = getSimilarityStats(similarities);

      expect(stats.stdDev).toBeCloseTo(0.0, 5);
    });

    it('should handle empty array', () => {
      const similarities: number[] = [];

      const stats = getSimilarityStats(similarities);

      expect(stats.mean).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.stdDev).toBe(0);
    });

    it('should handle single value', () => {
      const similarities = [0.5];

      const stats = getSimilarityStats(similarities);

      expect(stats.mean).toBe(0.5);
      expect(stats.median).toBe(0.5);
      expect(stats.min).toBe(0.5);
      expect(stats.max).toBe(0.5);
      expect(stats.stdDev).toBe(0);
    });

    it('should handle negative values', () => {
      const similarities = [-0.5, 0, 0.5];

      const stats = getSimilarityStats(similarities);

      expect(stats.mean).toBeCloseTo(0, 5);
      expect(stats.min).toBe(-0.5);
      expect(stats.max).toBe(0.5);
    });

    it('should not modify input array', () => {
      const similarities = [0.3, 0.1, 0.9, 0.5];
      const original = [...similarities];

      getSimilarityStats(similarities);

      expect(similarities).toEqual(original);
    });
  });

  describe('Edge Cases and Performance', () => {
    it('should handle high-dimensional vectors', () => {
      const vecA = createMockVector(512, 1.0);
      const vecB = createMockVector(512, 1.0);

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle sparse vectors', () => {
      const vecA = new Array(100).fill(0);
      vecA[0] = 1;
      const vecB = new Array(100).fill(0);
      vecB[0] = 1;

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle vectors with mixed positive and negative values', () => {
      const vecA = [1, -1, 1, -1];
      const vecB = [1, -1, 1, -1];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle very similar but not identical vectors', () => {
      const vecA = [1.0, 2.0, 3.0];
      const vecB = [1.00001, 2.00001, 3.00001];

      const similarity = cosineSimilarity(vecA, vecB);

      expect(similarity).toBeGreaterThan(0.999);
    });
  });
});
