import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  calculateSimilarities,
  findSimilarParagraphs,
  calculateSimilarityMatrix,
  clusterBySimilarity,
  getSimilarityStats,
  type SimilarityResult,
  type Cluster,
} from '@/services/ml/similarity';
import type { EmbeddingVector } from '@/services/ml/embeddings';

describe('Similarity Service', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vecA = [1, 2, 3, 4, 5];
      const vecB = [1, 2, 3, 4, 5];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(0.0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vecA = [1, 2, 3];
      const vecB = [-1, -2, -3];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it('should handle vectors with different magnitudes', () => {
      const vecA = [1, 2, 3];
      const vecB = [2, 4, 6]; // Same direction, different magnitude
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should throw error for vectors of different lengths', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2];
      expect(() => cosineSimilarity(vecA, vecB)).toThrow(
        'Vectors must have the same length'
      );
    });

    it('should handle zero vectors', () => {
      const vecA = [0, 0, 0];
      const vecB = [1, 2, 3];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBe(0);
    });

    it('should be commutative', () => {
      const vecA = [1, 2, 3, 4];
      const vecB = [5, 6, 7, 8];
      const simAB = cosineSimilarity(vecA, vecB);
      const simBA = cosineSimilarity(vecB, vecA);
      expect(simAB).toBeCloseTo(simBA, 5);
    });

    it('should calculate similarity correctly for real embeddings', () => {
      // Similar sentences should have high similarity
      const sentence1 = [0.5, 0.8, 0.3, 0.7]; // Simulated embedding
      const sentence2 = [0.6, 0.7, 0.4, 0.8]; // Similar embedding
      const similarity = cosineSimilarity(sentence1, sentence2);
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should handle high-dimensional vectors', () => {
      const vecA = Array.from({ length: 512 }, () => Math.random());
      const vecB = Array.from({ length: 512 }, () => Math.random());
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateSimilarities', () => {
    it('should calculate similarities and rank results', () => {
      const queryVector = [1, 0, 0];
      const targets = [
        { id: '1', text: 'Most similar', vector: [0.9, 0.1, 0] },
        { id: '2', text: 'Least similar', vector: [0, 0, 1] },
        { id: '3', text: 'Somewhat similar', vector: [0.5, 0.5, 0] },
      ];

      const results = calculateSimilarities(queryVector, targets);

      expect(results).toHaveLength(3);
      expect(results[0].paragraphId).toBe('1'); // Highest similarity
      expect(results[0].rank).toBe(1);
      expect(results[2].paragraphId).toBe('2'); // Lowest similarity
      expect(results[2].rank).toBe(3);
    });

    it('should sort results by score in descending order', () => {
      const queryVector = [1, 1, 1];
      const targets = [
        { id: '1', text: 'Low', vector: [0.1, 0.1, 0.1] },
        { id: '2', text: 'High', vector: [1, 1, 1] },
        { id: '3', text: 'Medium', vector: [0.5, 0.5, 0.5] },
      ];

      const results = calculateSimilarities(queryVector, targets);

      expect(results[0].score).toBeGreaterThan(results[1].score);
      expect(results[1].score).toBeGreaterThan(results[2].score);
    });

    it('should include text and paragraph ID in results', () => {
      const queryVector = [1, 0, 0];
      const targets = [
        { id: 'para-1', text: 'First paragraph', vector: [1, 0, 0] },
      ];

      const results = calculateSimilarities(queryVector, targets);

      expect(results[0].paragraphId).toBe('para-1');
      expect(results[0].text).toBe('First paragraph');
    });

    it('should handle single target', () => {
      const queryVector = [1, 2, 3];
      const targets = [{ id: '1', text: 'Only one', vector: [1, 2, 3] }];

      const results = calculateSimilarities(queryVector, targets);

      expect(results).toHaveLength(1);
      expect(results[0].rank).toBe(1);
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
      const queryEmbedding: EmbeddingVector = {
        text: 'Query text',
        vector: [1, 0, 0],
        modelVersion: 'test-v1',
        timestamp: Date.now(),
      };

      const candidates = new Map<string, EmbeddingVector>([
        [
          'para-1',
          {
            text: 'Very similar',
            vector: [0.95, 0.05, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
        [
          'para-2',
          {
            text: 'Not similar',
            vector: [0, 0, 1],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
        [
          'para-3',
          {
            text: 'Somewhat similar',
            vector: [0.7, 0.3, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
      ]);

      const results = findSimilarParagraphs(queryEmbedding, candidates, {
        minScore: 0.6,
        maxResults: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.score >= 0.6)).toBe(true);
    });

    it('should respect maxResults option', () => {
      const queryEmbedding: EmbeddingVector = {
        text: 'Query',
        vector: [1, 0, 0],
        modelVersion: 'test-v1',
        timestamp: Date.now(),
      };

      const candidates = new Map<string, EmbeddingVector>();
      for (let i = 0; i < 20; i++) {
        candidates.set(`para-${i}`, {
          text: `Paragraph ${i}`,
          vector: [0.8, 0.2, 0],
          modelVersion: 'test-v1',
          timestamp: Date.now(),
        });
      }

      const results = findSimilarParagraphs(queryEmbedding, candidates, {
        minScore: 0.5,
        maxResults: 5,
      });

      expect(results).toHaveLength(5);
    });

    it('should exclude specified IDs', () => {
      const queryEmbedding: EmbeddingVector = {
        text: 'Query',
        vector: [1, 0, 0],
        modelVersion: 'test-v1',
        timestamp: Date.now(),
      };

      const candidates = new Map<string, EmbeddingVector>([
        [
          'para-1',
          {
            text: 'First',
            vector: [1, 0, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
        [
          'para-2',
          {
            text: 'Second',
            vector: [0.9, 0.1, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
      ]);

      const results = findSimilarParagraphs(queryEmbedding, candidates, {
        excludeIds: new Set(['para-1']),
        minScore: 0,
      });

      expect(results.every((r) => r.paragraphId !== 'para-1')).toBe(true);
    });

    it('should use default options when not provided', () => {
      const queryEmbedding: EmbeddingVector = {
        text: 'Query',
        vector: [1, 0, 0],
        modelVersion: 'test-v1',
        timestamp: Date.now(),
      };

      const candidates = new Map<string, EmbeddingVector>([
        [
          'para-1',
          {
            text: 'High similarity',
            vector: [0.9, 0.1, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
      ]);

      const results = findSimilarParagraphs(queryEmbedding, candidates);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('calculateSimilarityMatrix', () => {
    it('should create symmetric similarity matrix', () => {
      const embeddings: EmbeddingVector[] = [
        {
          text: 'Text 1',
          vector: [1, 0, 0],
          modelVersion: 'test-v1',
          timestamp: Date.now(),
        },
        {
          text: 'Text 2',
          vector: [0, 1, 0],
          modelVersion: 'test-v1',
          timestamp: Date.now(),
        },
        {
          text: 'Text 3',
          vector: [0, 0, 1],
          modelVersion: 'test-v1',
          timestamp: Date.now(),
        },
      ];

      const matrix = calculateSimilarityMatrix(embeddings);

      expect(matrix).toHaveLength(3);
      expect(matrix[0]).toHaveLength(3);

      // Check symmetry
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          expect(matrix[i][j]).toBeCloseTo(matrix[j][i], 5);
        }
      }
    });

    it('should have 1.0 on diagonal (self-similarity)', () => {
      const embeddings: EmbeddingVector[] = [
        {
          text: 'Text 1',
          vector: [1, 2, 3],
          modelVersion: 'test-v1',
          timestamp: Date.now(),
        },
        {
          text: 'Text 2',
          vector: [4, 5, 6],
          modelVersion: 'test-v1',
          timestamp: Date.now(),
        },
      ];

      const matrix = calculateSimilarityMatrix(embeddings);

      expect(matrix[0][0]).toBe(1.0);
      expect(matrix[1][1]).toBe(1.0);
    });

    it('should handle single embedding', () => {
      const embeddings: EmbeddingVector[] = [
        {
          text: 'Only one',
          vector: [1, 2, 3],
          modelVersion: 'test-v1',
          timestamp: Date.now(),
        },
      ];

      const matrix = calculateSimilarityMatrix(embeddings);

      expect(matrix).toHaveLength(1);
      expect(matrix[0]).toHaveLength(1);
      expect(matrix[0][0]).toBe(1.0);
    });

    it('should handle empty embeddings array', () => {
      const embeddings: EmbeddingVector[] = [];
      const matrix = calculateSimilarityMatrix(embeddings);
      expect(matrix).toHaveLength(0);
    });
  });

  describe('clusterBySimilarity', () => {
    it('should group similar embeddings into clusters', () => {
      const embeddings = new Map<string, EmbeddingVector>([
        [
          'para-1',
          {
            text: 'Group A1',
            vector: [1, 0, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
        [
          'para-2',
          {
            text: 'Group A2',
            vector: [0.9, 0.1, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
        [
          'para-3',
          {
            text: 'Group B1',
            vector: [0, 1, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
      ]);

      const clusters = clusterBySimilarity(embeddings, 0.7);

      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.every((c) => c.members.length > 0)).toBe(true);
    });

    it('should calculate cluster centroids', () => {
      const embeddings = new Map<string, EmbeddingVector>([
        [
          'para-1',
          {
            text: 'Text 1',
            vector: [1, 0, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
        [
          'para-2',
          {
            text: 'Text 2',
            vector: [0.9, 0.1, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
      ]);

      const clusters = clusterBySimilarity(embeddings, 0.7);

      expect(clusters[0].centroid).toBeDefined();
      expect(clusters[0].centroid.length).toBeGreaterThan(0);
    });

    it('should assign unique cluster IDs', () => {
      const embeddings = new Map<string, EmbeddingVector>([
        [
          'para-1',
          {
            text: 'Text 1',
            vector: [1, 0, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
        [
          'para-2',
          {
            text: 'Text 2',
            vector: [0, 1, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
      ]);

      const clusters = clusterBySimilarity(embeddings, 0.7);

      const ids = clusters.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should respect similarity threshold', () => {
      const embeddings = new Map<string, EmbeddingVector>([
        [
          'para-1',
          {
            text: 'Very different 1',
            vector: [1, 0, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
        [
          'para-2',
          {
            text: 'Very different 2',
            vector: [0, 1, 0],
            modelVersion: 'test-v1',
            timestamp: Date.now(),
          },
        ],
      ]);

      // High threshold should create separate clusters
      const clusters = clusterBySimilarity(embeddings, 0.99);

      expect(clusters.length).toBe(2);
      expect(clusters.every((c) => c.members.length === 1)).toBe(true);
    });
  });

  describe('getSimilarityStats', () => {
    it('should calculate statistical measures correctly', () => {
      const similarities = [0.5, 0.6, 0.7, 0.8, 0.9];

      const stats = getSimilarityStats(similarities);

      expect(stats.mean).toBeCloseTo(0.7, 1);
      expect(stats.median).toBe(0.7);
      expect(stats.min).toBe(0.5);
      expect(stats.max).toBe(0.9);
      expect(stats.stdDev).toBeGreaterThan(0);
    });

    it('should handle even number of values for median', () => {
      const similarities = [0.1, 0.2, 0.3, 0.4];

      const stats = getSimilarityStats(similarities);

      expect(stats.median).toBe(0.25); // (0.2 + 0.3) / 2
    });

    it('should handle odd number of values for median', () => {
      const similarities = [0.1, 0.2, 0.3];

      const stats = getSimilarityStats(similarities);

      expect(stats.median).toBe(0.2);
    });

    it('should handle single value', () => {
      const similarities = [0.75];

      const stats = getSimilarityStats(similarities);

      expect(stats.mean).toBe(0.75);
      expect(stats.median).toBe(0.75);
      expect(stats.min).toBe(0.75);
      expect(stats.max).toBe(0.75);
      expect(stats.stdDev).toBe(0);
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

    it('should calculate standard deviation correctly', () => {
      const similarities = [1, 1, 1]; // No variance

      const stats = getSimilarityStats(similarities);

      expect(stats.stdDev).toBe(0);

      const variedSimilarities = [0, 0.5, 1]; // High variance

      const variedStats = getSimilarityStats(variedSimilarities);

      expect(variedStats.stdDev).toBeGreaterThan(0);
    });

    it('should handle negative similarities', () => {
      const similarities = [-0.5, 0, 0.5];

      const stats = getSimilarityStats(similarities);

      expect(stats.mean).toBeCloseTo(0, 5);
      expect(stats.min).toBe(-0.5);
      expect(stats.max).toBe(0.5);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large numbers of comparisons efficiently', () => {
      const queryVector = Array.from({ length: 512 }, () => Math.random());
      const targets = Array.from({ length: 1000 }, (_, i) => ({
        id: `para-${i}`,
        text: `Paragraph ${i}`,
        vector: Array.from({ length: 512 }, () => Math.random()),
      }));

      const startTime = performance.now();
      const results = calculateSimilarities(queryVector, targets);
      const duration = performance.now() - startTime;

      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should efficiently cluster large datasets', () => {
      const embeddings = new Map<string, EmbeddingVector>();
      for (let i = 0; i < 100; i++) {
        embeddings.set(`para-${i}`, {
          text: `Text ${i}`,
          vector: Array.from({ length: 128 }, () => Math.random()),
          modelVersion: 'test-v1',
          timestamp: Date.now(),
        });
      }

      const startTime = performance.now();
      const clusters = clusterBySimilarity(embeddings, 0.7);
      const duration = performance.now() - startTime;

      expect(clusters.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small similarity scores', () => {
      const vecA = [0.001, 0.001, 0.001];
      const vecB = [0.002, 0.002, 0.002];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle very large similarity scores', () => {
      const vecA = [1000, 2000, 3000];
      const vecB = [1000, 2000, 3000];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle mixed positive and negative values', () => {
      const vecA = [1, -1, 1, -1];
      const vecB = [-1, 1, -1, 1];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(-1.0, 5);
    });
  });
});
