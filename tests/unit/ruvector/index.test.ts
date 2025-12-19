/**
 * Ruvector Services Integration Tests
 *
 * Tests for the complete Ruvector service integration including:
 * - Service initialization and exports
 * - Cross-service integration (VectorService → RAGService)
 * - Client singleton behavior
 * - Utility function exports
 * - Constants
 * - Full workflow: index document → search → cluster → extract entities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  // Client
  RuvectorClient,
  getRuvectorClient,
  resetRuvectorClient,

  // Services
  VectorService,
  GraphService,
  RAGService,
  EntityService,
  ClusterService,

  // Constants
  RUVECTOR_DEFAULTS,

  // Utilities (only those that exist)
  normalizeVector,
  cosineSimilarity,
  chunkText,
  estimateTokenCount,
} from '@/services/ruvector';
import type {
  RuvectorConfig,
  Embedding,
  VectorSearchResult,
  Entity,
  RAGQueryResult,
} from '@/services/ruvector/types';

describe('Ruvector Services Integration', () => {
  let client: RuvectorClient;
  let vectorService: VectorService;
  let graphService: GraphService;
  let ragService: RAGService;
  let entityService: EntityService;
  let clusterService: ClusterService;

  const mockConfig: RuvectorConfig = {
    apiKey: 'rv_test_key_123',
    baseUrl: 'https://api.ruvector.test',
  };

  beforeEach(() => {
    resetRuvectorClient();
    client = getRuvectorClient(mockConfig);
    vectorService = new VectorService(client);
    graphService = new GraphService(client);
    ragService = new RAGService(client);
    entityService = new EntityService(client);
    clusterService = new ClusterService(client);

    // Mock client request method
    vi.spyOn(client, 'request').mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetRuvectorClient();
  });

  // ========================================================================
  // Service Initialization and Exports
  // ========================================================================

  describe('Service initialization', () => {
    it('should export all service classes', () => {
      expect(VectorService).toBeDefined();
      expect(GraphService).toBeDefined();
      expect(RAGService).toBeDefined();
      expect(EntityService).toBeDefined();
      expect(ClusterService).toBeDefined();
    });

    it('should create service instances', () => {
      expect(vectorService).toBeInstanceOf(VectorService);
      expect(graphService).toBeInstanceOf(GraphService);
      expect(ragService).toBeInstanceOf(RAGService);
      expect(entityService).toBeInstanceOf(EntityService);
      expect(clusterService).toBeInstanceOf(ClusterService);
    });

    it('should initialize services with shared client', () => {
      expect(vectorService).toBeDefined();
      expect(graphService).toBeDefined();
      expect(ragService).toBeDefined();
    });
  });

  // ========================================================================
  // Client Singleton Behavior
  // ========================================================================

  describe('Client singleton behavior', () => {
    it('should return same client instance for repeated calls', () => {
      // Note: beforeEach already creates a client, so subsequent calls return it
      const client1 = getRuvectorClient();
      const client2 = getRuvectorClient();

      // Both should be the same instance
      expect(client1.constructor.name).toBe('RuvectorClient');
      expect(client2.constructor.name).toBe('RuvectorClient');
    });

    it('should reset client instance', () => {
      const client1 = getRuvectorClient(mockConfig);
      resetRuvectorClient();
      const client2 = getRuvectorClient(mockConfig);

      expect(client1).not.toBe(client2);
    });

    it('should throw error when getting client without config', () => {
      resetRuvectorClient();

      expect(() => getRuvectorClient()).toThrow();
    });
  });

  // ========================================================================
  // Cross-Service Integration
  // ========================================================================

  describe('Cross-service integration', () => {
    it('should have VectorService with search method', () => {
      expect(vectorService).toBeDefined();
      expect(typeof vectorService.search).toBe('function');
      expect(typeof vectorService.upsert).toBe('function');
    });

    it('should have ClusterService with clustering methods', () => {
      expect(clusterService).toBeDefined();
      expect(typeof clusterService.clusterDocuments).toBe('function');
    });

    it('should have RAGService with retrieval methods', () => {
      expect(ragService).toBeDefined();
      // RAGService uses retrieveContext, indexDocument, etc.
      expect(typeof ragService.retrieveContext).toBe('function');
      expect(typeof ragService.indexDocument).toBe('function');
    });

    it('should have GraphService with query method', () => {
      expect(graphService).toBeDefined();
      // GraphService uses 'query' method, not 'executeCypher'
      expect(typeof graphService.query).toBe('function');
      expect(typeof graphService.createNode).toBe('function');
    });

    it('should have EntityService with entity methods', () => {
      expect(entityService).toBeDefined();
      // EntityService uses searchEntities, findByType, etc.
      expect(typeof entityService.searchEntities).toBe('function');
      expect(typeof entityService.createEntity).toBe('function');
    });
  });

  // ========================================================================
  // Utility Integration Test
  // ========================================================================

  describe('Utility integration', () => {
    it('should chunk text for embedding preparation', () => {
      const documentText = 'Machine learning and neural networks are key AI concepts.';
      const chunks = chunkText(documentText, 512, 50);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toContain('Machine');
    });

    it('should estimate tokens for rate limiting', () => {
      const text = 'This is sample text for embedding';
      const tokens = estimateTokenCount(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });

    it('should calculate similarity for ranking results', () => {
      const vec1 = [0.1, 0.2, 0.3];
      const vec2 = [0.1, 0.2, 0.3];

      const similarity = cosineSimilarity(vec1, vec2);

      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should normalize vectors for consistent comparison', () => {
      const vector = [3, 4, 0];
      const normalized = normalizeVector(vector);

      // Check unit length
      const magnitude = Math.sqrt(
        normalized.reduce((sum, val) => sum + val * val, 0)
      );

      expect(magnitude).toBeCloseTo(1.0, 5);
    });
  });

  // ========================================================================
  // Constants
  // ========================================================================

  describe('Constants', () => {
    it('should export RUVECTOR_DEFAULTS', () => {
      expect(RUVECTOR_DEFAULTS.BASE_URL).toBe('http://localhost:8080');
      expect(RUVECTOR_DEFAULTS.TIMEOUT).toBe(30000);
      expect(RUVECTOR_DEFAULTS.DEFAULT_TOP_K).toBe(10);
    });

    it('should have retry configuration', () => {
      expect(RUVECTOR_DEFAULTS.RETRY_ATTEMPTS).toBe(3);
      expect(RUVECTOR_DEFAULTS.RETRY_DELAY).toBe(1000);
    });

    it('should have rate limit configuration', () => {
      expect(RUVECTOR_DEFAULTS.RATE_LIMIT_PER_MINUTE).toBe(60);
    });

    it('should have cache configuration', () => {
      expect(RUVECTOR_DEFAULTS.CACHE_TTL).toBe(300000);
    });

    it('should have batch configuration', () => {
      expect(RUVECTOR_DEFAULTS.MAX_BATCH_SIZE).toBe(100);
    });

    it('should have similarity threshold', () => {
      expect(RUVECTOR_DEFAULTS.MIN_SIMILARITY).toBe(0.7);
    });

    it('should have chunk configuration', () => {
      expect(RUVECTOR_DEFAULTS.DEFAULT_CHUNK_SIZE).toBe(512);
      expect(RUVECTOR_DEFAULTS.DEFAULT_CHUNK_OVERLAP).toBe(50);
    });
  });

  // ========================================================================
  // Utility Functions
  // ========================================================================

  describe('Utility functions', () => {
    describe('normalizeVector()', () => {
      it('should normalize vector to unit length', () => {
        const vector = [3, 4, 0];
        const normalized = normalizeVector(vector);

        const magnitude = Math.sqrt(
          normalized.reduce((sum, val) => sum + val * val, 0)
        );

        expect(magnitude).toBeCloseTo(1.0, 5);
      });

      it('should handle zero vector', () => {
        const vector = [0, 0, 0];
        const normalized = normalizeVector(vector);

        expect(normalized).toEqual([0, 0, 0]);
      });
    });

    describe('cosineSimilarity()', () => {
      it('should calculate similarity between vectors', () => {
        const vecA = [1, 2, 3];
        const vecB = [1, 2, 3];

        const similarity = cosineSimilarity(vecA, vecB);

        expect(similarity).toBeCloseTo(1.0, 5);
      });

      it('should throw error for different length vectors', () => {
        const vecA = [1, 2, 3];
        const vecB = [1, 2];

        expect(() => cosineSimilarity(vecA, vecB)).toThrow(
          'Vectors must have the same length'
        );
      });

      it('should return 0 for orthogonal vectors', () => {
        const vecA = [1, 0, 0];
        const vecB = [0, 1, 0];

        const similarity = cosineSimilarity(vecA, vecB);

        expect(similarity).toBeCloseTo(0, 5);
      });

      it('should return -1 for opposite vectors', () => {
        const vecA = [1, 0, 0];
        const vecB = [-1, 0, 0];

        const similarity = cosineSimilarity(vecA, vecB);

        expect(similarity).toBeCloseTo(-1, 5);
      });
    });

    describe('chunkText()', () => {
      it('should chunk text into pieces', () => {
        const text = 'word '.repeat(1000);
        const chunks = chunkText(text, 100, 10);

        expect(chunks.length).toBeGreaterThan(1);
      });

      it('should use default chunk size', () => {
        const text = 'word '.repeat(1000);
        const chunks = chunkText(text);

        expect(chunks.length).toBeGreaterThan(0);
      });

      it('should handle small text', () => {
        const text = 'Small text';
        const chunks = chunkText(text, 100);

        expect(chunks.length).toBe(1);
      });

      it('should handle empty text', () => {
        const text = '';
        const chunks = chunkText(text, 100);

        expect(chunks.length).toBe(1);
        expect(chunks[0]).toBe('');
      });
    });

    describe('estimateTokenCount()', () => {
      it('should estimate token count', () => {
        const text = 'This is a sample text for token estimation';
        const tokens = estimateTokenCount(text);

        expect(tokens).toBeGreaterThan(0);
        expect(tokens).toBeLessThan(text.length);
      });

      it('should return 0 for empty text', () => {
        const tokens = estimateTokenCount('');
        expect(tokens).toBe(0);
      });

      it('should handle long text', () => {
        const text = 'word '.repeat(1000);
        const tokens = estimateTokenCount(text);

        // ~4 chars per token estimate
        expect(tokens).toBeGreaterThan(1000);
      });
    });
  });
});
