/**
 * VectorService Unit Tests
 *
 * Comprehensive test coverage for vector operations including:
 * - Embedding generation (single and batch)
 * - Vector storage (upsert, delete)
 * - Similarity search
 * - Backward compatibility
 * - Error handling
 * - Edge cases and validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VectorService } from '../../../src/services/ruvector/VectorService';
import type { RuvectorClient } from '../../../src/services/ruvector/client';
import { VectorOperationError } from '../../../src/services/ruvector/types';
import type {
  Embedding,
  VectorSearchOptions,
  VectorUpsertOptions,
  ServiceResponse,
} from '../../../src/services/ruvector/types';

// ============================================================================
// Mock RuvectorClient
// ============================================================================

const createMockClient = (): RuvectorClient => {
  return {
    request: vi.fn(),
    healthCheck: vi.fn(),
    getMetrics: vi.fn(),
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    clearCache: vi.fn(),
    validateApiKey: vi.fn(),
    destroy: vi.fn(),
  } as unknown as RuvectorClient;
};

// ============================================================================
// Test Suite: VectorService
// ============================================================================

describe('VectorService', () => {
  let mockClient: RuvectorClient;
  let vectorService: VectorService;

  beforeEach(() => {
    mockClient = createMockClient();
    vectorService = new VectorService(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Constructor & Initialization
  // ============================================================================

  describe('constructor', () => {
    it('should create instance with valid client', () => {
      expect(vectorService).toBeInstanceOf(VectorService);
    });

    it('should throw error if client is null', () => {
      expect(() => new VectorService(null as unknown as RuvectorClient)).toThrow(
        'RuvectorClient instance is required'
      );
    });

    it('should throw error if client is undefined', () => {
      expect(() => new VectorService(undefined as unknown as RuvectorClient)).toThrow(
        'RuvectorClient instance is required'
      );
    });
  });

  // ============================================================================
  // Embedding Generation - embed()
  // ============================================================================

  describe('embed()', () => {
    it('should generate embedding for valid text', async () => {
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());
      const mockResponse: ServiceResponse<{ embedding: number[] }> = {
        success: true,
        data: { embedding: mockEmbedding },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const result = await vectorService.embed('Hello world');

      expect(result).toEqual(mockEmbedding);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/v1/vector/embed',
        body: { text: 'Hello world' },
      });
    });

    it('should throw VectorOperationError for empty text', async () => {
      await expect(vectorService.embed('')).rejects.toThrow(VectorOperationError);
      await expect(vectorService.embed('')).rejects.toThrow('Text cannot be empty');
    });

    it('should throw VectorOperationError for whitespace-only text', async () => {
      await expect(vectorService.embed('   ')).rejects.toThrow(VectorOperationError);
      await expect(vectorService.embed('\t\n  ')).rejects.toThrow('Text cannot be empty');
    });

    it('should throw VectorOperationError when API returns unsuccessful response', async () => {
      const mockResponse: ServiceResponse<{ embedding: number[] }> = {
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'API rate limit exceeded',
        },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await expect(vectorService.embed('test text')).rejects.toThrow(VectorOperationError);
      await expect(vectorService.embed('test text')).rejects.toThrow('Failed to generate embedding');
    });

    it('should throw VectorOperationError when API returns no embedding data', async () => {
      const mockResponse: ServiceResponse<{ embedding: number[] }> = {
        success: true,
        data: undefined,
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await expect(vectorService.embed('test')).rejects.toThrow(VectorOperationError);
    });

    it('should wrap network errors in VectorOperationError', async () => {
      vi.mocked(mockClient.request).mockRejectedValue(new Error('Network timeout'));

      await expect(vectorService.embed('test')).rejects.toThrow(VectorOperationError);
      await expect(vectorService.embed('test')).rejects.toThrow('Embedding generation failed');
    });
  });

  // ============================================================================
  // Batch Embedding Generation - embedBatch()
  // ============================================================================

  describe('embedBatch()', () => {
    it('should generate embeddings for multiple texts', async () => {
      const mockEmbeddings = [
        new Array(1536).fill(0).map(() => Math.random()),
        new Array(1536).fill(0).map(() => Math.random()),
      ];
      const mockResponse: ServiceResponse<{ embeddings: number[][] }> = {
        success: true,
        data: { embeddings: mockEmbeddings },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const result = await vectorService.embedBatch(['text1', 'text2']);

      expect(result).toEqual(mockEmbeddings);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/v1/vector/embed-batch',
        body: { texts: ['text1', 'text2'] },
      });
    });

    it('should return empty array for empty input', async () => {
      const result = await vectorService.embedBatch([]);
      expect(result).toEqual([]);
      expect(mockClient.request).not.toHaveBeenCalled();
    });

    it('should throw error for texts containing empty strings', async () => {
      await expect(vectorService.embedBatch(['valid text', ''])).rejects.toThrow(
        VectorOperationError
      );
      await expect(vectorService.embedBatch(['valid text', ''])).rejects.toThrow(
        'All texts must be non-empty'
      );
    });

    it('should process large batches in chunks (default batch size)', async () => {
      const texts = new Array(100).fill('test text');
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());

      // Mock response for each batch
      const mockResponse: ServiceResponse<{ embeddings: number[][] }> = {
        success: true,
        data: { embeddings: new Array(50).fill(mockEmbedding) },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const result = await vectorService.embedBatch(texts);

      // Should make 2 calls (50 items per batch by default)
      expect(mockClient.request).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(100);
    });

    it('should throw VectorOperationError when batch processing fails', async () => {
      const mockResponse: ServiceResponse<{ embeddings: number[][] }> = {
        success: false,
        error: {
          code: 'BATCH_ERROR',
          message: 'Batch processing failed',
        },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await expect(vectorService.embedBatch(['text1', 'text2'])).rejects.toThrow(
        VectorOperationError
      );
      await expect(vectorService.embedBatch(['text1', 'text2'])).rejects.toThrow(
        'Batch embedding failed for batch starting at index 0'
      );
    });

    it('should handle whitespace in texts array', async () => {
      await expect(vectorService.embedBatch(['valid', '  ', 'text'])).rejects.toThrow(
        VectorOperationError
      );
    });
  });

  // ============================================================================
  // Vector Upsert - upsert()
  // ============================================================================

  describe('upsert()', () => {
    const validEmbeddings: Embedding[] = [
      {
        id: 'emb-1',
        vector: new Array(1536).fill(0.1),
        text: 'First paragraph',
        metadata: { documentId: 'doc-1' },
      },
      {
        id: 'emb-2',
        vector: new Array(1536).fill(0.2),
        text: 'Second paragraph',
        metadata: { documentId: 'doc-1' },
      },
    ];

    it('should upsert embeddings successfully', async () => {
      const mockResponse: ServiceResponse<any> = {
        success: true,
        data: {
          upsertedCount: 2,
          ids: ['emb-1', 'emb-2'],
        },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const result = await vectorService.upsert(validEmbeddings);

      expect(result.upsertedCount).toBe(2);
      expect(result.ids).toEqual(['emb-1', 'emb-2']);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/v1/vector/upsert',
        body: {
          embeddings: validEmbeddings,
          namespace: undefined,
          metadata: {},
        },
      });
    });

    it('should support namespace isolation', async () => {
      const mockResponse: ServiceResponse<any> = {
        success: true,
        data: { upsertedCount: 2, ids: ['emb-1', 'emb-2'] },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const options: VectorUpsertOptions = {
        namespace: 'document-embeddings',
      };

      await vectorService.upsert(validEmbeddings, options);

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            namespace: 'document-embeddings',
          }),
        })
      );
    });

    it('should return empty result for empty embeddings array', async () => {
      const result = await vectorService.upsert([]);

      expect(result).toEqual({
        upsertedCount: 0,
        ids: [],
      });
      expect(mockClient.request).not.toHaveBeenCalled();
    });

    it('should throw error for embedding without id', async () => {
      const invalidEmbeddings = [
        {
          id: '',
          vector: [0.1, 0.2],
          text: 'text',
        },
      ] as Embedding[];

      await expect(vectorService.upsert(invalidEmbeddings)).rejects.toThrow(
        VectorOperationError
      );
      await expect(vectorService.upsert(invalidEmbeddings)).rejects.toThrow(
        'Embedding ID is required'
      );
    });

    it('should throw error for embedding with invalid vector', async () => {
      const invalidEmbeddings = [
        {
          id: 'emb-1',
          vector: null as unknown as number[],
          text: 'text',
        },
      ] as Embedding[];

      await expect(vectorService.upsert(invalidEmbeddings)).rejects.toThrow(
        VectorOperationError
      );
    });

    it('should throw error for embedding with empty vector', async () => {
      const invalidEmbeddings: Embedding[] = [
        {
          id: 'emb-1',
          vector: [],
          text: 'text',
        },
      ];

      await expect(vectorService.upsert(invalidEmbeddings)).rejects.toThrow(
        VectorOperationError
      );
      await expect(vectorService.upsert(invalidEmbeddings)).rejects.toThrow(
        'Empty vector for embedding emb-1'
      );
    });

    it('should throw error for embedding without text', async () => {
      const invalidEmbeddings = [
        {
          id: 'emb-1',
          vector: [0.1, 0.2],
          text: '',
        },
      ] as Embedding[];

      await expect(vectorService.upsert(invalidEmbeddings)).rejects.toThrow(
        VectorOperationError
      );
      await expect(vectorService.upsert(invalidEmbeddings)).rejects.toThrow(
        'Text is required for embedding emb-1'
      );
    });

    it('should throw error for vectors with different dimensions', async () => {
      const invalidEmbeddings: Embedding[] = [
        {
          id: 'emb-1',
          vector: [0.1, 0.2, 0.3],
          text: 'text1',
        },
        {
          id: 'emb-2',
          vector: [0.1, 0.2],
          text: 'text2',
        },
      ];

      await expect(vectorService.upsert(invalidEmbeddings)).rejects.toThrow(
        VectorOperationError
      );
      await expect(vectorService.upsert(invalidEmbeddings)).rejects.toThrow(
        'All embeddings must have vectors of the same dimension'
      );
    });

    it('should throw error for vector containing NaN', async () => {
      const invalidEmbeddings: Embedding[] = [
        {
          id: 'emb-1',
          vector: [0.1, NaN, 0.3],
          text: 'text',
        },
      ];

      await expect(vectorService.upsert(invalidEmbeddings)).rejects.toThrow(
        VectorOperationError
      );
      await expect(vectorService.upsert(invalidEmbeddings)).rejects.toThrow(
        'Vector must contain only valid numbers'
      );
    });

    it('should track partial failures in batch upsert', async () => {
      const mockResponse: ServiceResponse<any> = {
        success: true,
        data: {
          upsertedCount: 1,
          ids: ['emb-1'],
          errors: [{ id: 'emb-2', error: 'Invalid vector dimension' }],
        },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const result = await vectorService.upsert(validEmbeddings);

      expect(result.upsertedCount).toBe(1);
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);
    });
  });

  // ============================================================================
  // Vector Search - search()
  // ============================================================================

  describe('search()', () => {
    const queryVector = new Array(1536).fill(0.5);

    it('should search for similar vectors', async () => {
      const mockResults = [
        {
          id: 'emb-1',
          score: 0.95,
          text: 'Similar text',
          metadata: { documentId: 'doc-1' },
        },
      ];

      const mockResponse: ServiceResponse<any> = {
        success: true,
        data: { results: mockResults },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const results = await vectorService.search(queryVector);

      expect(results).toEqual(mockResults);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/v1/vector/search',
        body: {
          vector: queryVector,
          topK: 10,
          minSimilarity: 0.5,
          includeMetadata: true,
          filter: undefined,
          namespace: undefined,
        },
      });
    });

    it('should support custom search options', async () => {
      const mockResponse: ServiceResponse<any> = {
        success: true,
        data: { results: [] },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const options: VectorSearchOptions = {
        topK: 5,
        minSimilarity: 0.7,
        namespace: 'document-embeddings',
        filter: { documentId: 'doc-1' },
      };

      await vectorService.search(queryVector, options);

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            topK: 5,
            minSimilarity: 0.7,
            namespace: 'document-embeddings',
            filter: { documentId: 'doc-1' },
          }),
        })
      );
    });

    it('should throw error for empty query vector', async () => {
      await expect(vectorService.search([])).rejects.toThrow(VectorOperationError);
      await expect(vectorService.search([])).rejects.toThrow('Query vector cannot be empty');
    });

    it('should throw error when search fails', async () => {
      const mockResponse: ServiceResponse<any> = {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Search failed',
        },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await expect(vectorService.search(queryVector)).rejects.toThrow(VectorOperationError);
      await expect(vectorService.search(queryVector)).rejects.toThrow('Vector search failed');
    });
  });

  // ============================================================================
  // Vector Delete - delete()
  // ============================================================================

  describe('delete()', () => {
    it('should delete vectors by IDs', async () => {
      const mockResponse: ServiceResponse<void> = {
        success: true,
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await vectorService.delete(['emb-1', 'emb-2']);

      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'DELETE',
        path: '/v1/vector/delete',
        body: {
          ids: ['emb-1', 'emb-2'],
          namespace: undefined,
          deleteAll: false,
          filter: undefined,
        },
      });
    });

    it('should support namespace in delete operations', async () => {
      const mockResponse: ServiceResponse<void> = { success: true };
      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await vectorService.delete(['emb-1'], { namespace: 'test-namespace' });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            namespace: 'test-namespace',
          }),
        })
      );
    });

    it('should handle empty IDs array gracefully', async () => {
      await vectorService.delete([]);
      expect(mockClient.request).not.toHaveBeenCalled();
    });

    it('should throw error when delete fails', async () => {
      const mockResponse: ServiceResponse<void> = {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Delete failed',
        },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await expect(vectorService.delete(['emb-1'])).rejects.toThrow(VectorOperationError);
    });

    it('should support deleteAll flag', async () => {
      const mockResponse: ServiceResponse<void> = { success: true };
      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await vectorService.delete([], { deleteAll: true, namespace: 'test' });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            ids: [],
            deleteAll: true,
          }),
        })
      );
    });
  });

  // ============================================================================
  // Advanced Operations - findSimilar()
  // ============================================================================

  describe('findSimilar()', () => {
    it('should combine embedding and search operations', async () => {
      const mockEmbedding = new Array(1536).fill(0.5);
      const mockResults = [
        {
          id: 'emb-1',
          score: 0.92,
          text: 'Similar content',
          metadata: {},
        },
      ];

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({
          success: true,
          data: { embedding: mockEmbedding },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { results: mockResults },
        });

      const results = await vectorService.findSimilar('quantum mechanics');

      expect(results).toEqual(mockResults);
      expect(mockClient.request).toHaveBeenCalledTimes(2);
    });

    it('should pass search options to search method', async () => {
      const mockEmbedding = new Array(1536).fill(0.5);

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({
          success: true,
          data: { embedding: mockEmbedding },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { results: [] },
        });

      const options: VectorSearchOptions = {
        topK: 20,
        namespace: 'physics-papers',
      };

      await vectorService.findSimilar('test query', options);

      expect(mockClient.request).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          body: expect.objectContaining({
            topK: 20,
            namespace: 'physics-papers',
          }),
        })
      );
    });
  });

  // ============================================================================
  // Backward Compatibility - migrateFromSimilarity()
  // ============================================================================

  describe('migrateFromSimilarity()', () => {
    it('should migrate old format embeddings to Ruvector', async () => {
      const oldEmbeddings = new Map([
        ['para-1', { text: 'First paragraph', vector: [0.1, 0.2, 0.3] }],
        ['para-2', { text: 'Second paragraph', vector: [0.4, 0.5, 0.6], metadata: { custom: true } }],
      ]);

      const mockResponse: ServiceResponse<any> = {
        success: true,
        data: {
          upsertedCount: 2,
          ids: ['para-1', 'para-2'],
        },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const result = await vectorService.migrateFromSimilarity(oldEmbeddings);

      expect(result.upsertedCount).toBe(2);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            namespace: 'migrated-similarity',
            metadata: expect.objectContaining({
              source: 'similarity-service',
            }),
          }),
        })
      );
    });

    it('should return empty result for empty map', async () => {
      const result = await vectorService.migrateFromSimilarity(new Map());

      expect(result).toEqual({
        upsertedCount: 0,
        ids: [],
      });
      expect(mockClient.request).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Local Calculation - cosineSimilarity()
  // ============================================================================

  describe('cosineSimilarity()', () => {
    it('should calculate similarity for identical vectors', () => {
      const vec = [1, 2, 3];
      const similarity = vectorService.cosineSimilarity(vec, vec);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should calculate similarity for orthogonal vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      const similarity = vectorService.cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(0, 5);
    });

    it('should calculate similarity for opposite vectors', () => {
      const vecA = [1, 2, 3];
      const vecB = [-1, -2, -3];
      const similarity = vectorService.cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(-1, 5);
    });

    it('should return 0 for zero vectors', () => {
      const vecA = [0, 0, 0];
      const vecB = [1, 2, 3];
      const similarity = vectorService.cosineSimilarity(vecA, vecB);
      expect(similarity).toBe(0);
    });

    it('should throw error for vectors of different lengths', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2];
      expect(() => vectorService.cosineSimilarity(vecA, vecB)).toThrow(
        'Vectors must have the same length'
      );
    });

    it('should throw error for null vectors', () => {
      expect(() => vectorService.cosineSimilarity(null as any, [1, 2])).toThrow(
        'Both vectors are required'
      );
      expect(() => vectorService.cosineSimilarity([1, 2], null as any)).toThrow(
        'Both vectors are required'
      );
    });

    it('should handle high-dimensional vectors accurately', () => {
      const dim = 1536;
      const vecA = new Array(dim).fill(0).map((_, i) => Math.sin(i));
      const vecB = new Array(dim).fill(0).map((_, i) => Math.cos(i));

      const similarity = vectorService.cosineSimilarity(vecA, vecB);

      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // Statistics - getStats()
  // ============================================================================

  describe('getStats()', () => {
    it('should retrieve vector statistics', async () => {
      const mockStats = {
        totalVectors: 1000,
        dimensions: 1536,
        namespaces: ['default', 'documents'],
        storageSize: '10MB',
      };

      const mockResponse: ServiceResponse<any> = {
        success: true,
        data: mockStats,
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      const stats = await vectorService.getStats();

      expect(stats).toEqual(mockStats);
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/v1/vector/stats',
        params: undefined,
      });
    });

    it('should support namespace filtering in stats', async () => {
      const mockResponse: ServiceResponse<any> = {
        success: true,
        data: { totalVectors: 100, dimensions: 1536, namespaces: ['test'], storageSize: '1MB' },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await vectorService.getStats('test-namespace');

      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/v1/vector/stats',
        params: { namespace: 'test-namespace' },
      });
    });

    it('should throw error when stats retrieval fails', async () => {
      const mockResponse: ServiceResponse<any> = {
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to get stats',
        },
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResponse);

      await expect(vectorService.getStats()).rejects.toThrow(VectorOperationError);
    });
  });
});
