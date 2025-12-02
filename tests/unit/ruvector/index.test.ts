/**
 * Ruvector Services Integration Tests
 *
 * Tests for the complete Ruvector service integration including:
 * - Service initialization and exports
 * - Cross-service integration (VectorService → RAGService)
 * - Client singleton behavior
 * - Utility function exports
 * - Constants and type guards
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
  VECTOR_DIMENSIONS,
  GRAPH_RELATIONSHIP_TYPES,
  ENTITY_TYPES,
  CLUSTERING_ALGORITHMS,

  // Utilities
  validateVectorDimensions,
  normalizeVector,
  cosineSimilarity,
  buildNamespaceKey,
  chunkText,
  estimateTokenCount,
  formatRuvectorError,

  // Type guards
  isRuvectorError,
  isVectorSearchResult,
  isGraphNode,
  isEntity,
  isCluster,
} from '@/services/ruvector';
import type {
  RuvectorConfig,
  Embedding,
  VectorSearchResult,
  GraphNode,
  Entity,
  Cluster,
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
    it('should return same client instance', () => {
      const client1 = getRuvectorClient(mockConfig);
      const client2 = getRuvectorClient(mockConfig);

      expect(client1).toBe(client2);
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
    it('should index document and perform semantic search', async () => {
      const embeddings: Embedding[] = [
        {
          id: 'emb-1',
          vector: Array(1536).fill(0.5),
          text: 'Machine learning is a subset of artificial intelligence',
          metadata: { documentId: 'doc-1' },
        },
        {
          id: 'emb-2',
          vector: Array(1536).fill(0.6),
          text: 'Neural networks are inspired by biological neurons',
          metadata: { documentId: 'doc-1' },
        },
      ];

      const mockSearchResults: VectorSearchResult[] = [
        {
          id: 'emb-1',
          score: 0.95,
          text: 'Machine learning is a subset of artificial intelligence',
          metadata: { documentId: 'doc-1' },
        },
      ];

      vi.mocked(client.request)
        .mockResolvedValueOnce({ upsertedCount: 2, ids: ['emb-1', 'emb-2'] })
        .mockResolvedValueOnce({ results: mockSearchResults });

      // Index embeddings
      await vectorService.upsert(embeddings);

      // Search
      const results = await vectorService.search('artificial intelligence', {
        topK: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(0.9);
    });

    it('should cluster documents and extract entities', async () => {
      const documentIds = ['doc-1', 'doc-2'];

      const _mockClusterResult = {
        clusters: [
          {
            id: 'cluster-1',
            members: ['emb-1', 'emb-2', 'emb-3'],
            size: 3,
            cohesion: 0.85,
          },
        ],
        outliers: [],
        totalClusters: 1,
      };

      const mockEntities: Entity[] = [
        {
          id: 'entity-1',
          type: 'Concept',
          name: 'Machine Learning',
          properties: { category: 'AI' },
        },
      ];

      vi.mocked(client.request)
        .mockResolvedValueOnce({ embedding_ids: ['emb-1', 'emb-2', 'emb-3'] })
        .mockResolvedValueOnce({ embeddings: [] })
        .mockResolvedValueOnce({ entities: mockEntities });

      // Cluster documents
      const clusterResult = await clusterService.clusterDocuments(
        documentIds
      );

      // Extract entities
      const entities = await entityService.findByDocuments(documentIds);

      expect(clusterResult.clusters.length).toBeGreaterThan(0);
      expect(entities.length).toBeGreaterThan(0);
    });

    it('should perform RAG query with vector search', async () => {
      const query = 'What is machine learning?';

      const mockRagResult: RAGQueryResult = {
        answer: 'Machine learning is a subset of AI...',
        context: {
          chunks: [
            {
              text: 'Machine learning is a subset of artificial intelligence',
              score: 0.95,
            },
          ],
          documentIds: ['doc-1'],
          totalChunks: 1,
        },
        confidence: 0.9,
        sources: [
          {
            documentId: 'doc-1',
            text: 'Machine learning is...',
            relevance: 0.95,
          },
        ],
      };

      vi.mocked(client.request).mockResolvedValue(mockRagResult);

      const result = await ragService.query(query);

      expect(result.answer).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.sources.length).toBeGreaterThan(0);
    });

    it('should create graph relationships from entities', async () => {
      const entities: Entity[] = [
        {
          id: 'entity-1',
          type: 'Concept',
          name: 'Machine Learning',
          properties: {},
        },
        {
          id: 'entity-2',
          type: 'Concept',
          name: 'Neural Networks',
          properties: {},
        },
      ];

      vi.mocked(client.request).mockResolvedValue({
        nodes: [],
        relationships: [
          {
            id: 'rel-1',
            type: 'RELATED_TO',
            startNode: 'entity-1',
            endNode: 'entity-2',
            properties: {},
          },
        ],
      });

      const query = `
        MATCH (a {id: $id1}), (b {id: $id2})
        CREATE (a)-[:RELATED_TO]->(b)
      `;

      const result = await graphService.executeCypher(query, {
        parameters: { id1: entities[0].id, id2: entities[1].id },
      });

      expect(result.relationships.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // Full Workflow Test
  // ========================================================================

  describe('Full workflow: index → search → cluster → extract', () => {
    it('should complete end-to-end document processing workflow', async () => {
      const documentText = 'Machine learning and neural networks are key AI concepts.';
      const chunks = chunkText(documentText, 512, 50);

      // Step 1: Index document chunks
      const embeddings: Embedding[] = chunks.map((chunk, idx) => ({
        id: `emb-${idx}`,
        vector: Array(1536).fill(Math.random()),
        text: chunk,
        metadata: { documentId: 'doc-1', chunkIndex: idx },
      }));

      vi.mocked(client.request).mockResolvedValueOnce({
        upsertedCount: embeddings.length,
        ids: embeddings.map(e => e.id),
      });

      await vectorService.upsert(embeddings);

      // Step 2: Search for similar content
      vi.mocked(client.request).mockResolvedValueOnce({
        results: [
          {
            id: 'emb-0',
            score: 0.95,
            text: chunks[0],
          },
        ],
      });

      const searchResults = await vectorService.search('neural networks');

      expect(searchResults.length).toBeGreaterThan(0);

      // Step 3: Cluster similar paragraphs
      vi.mocked(client.request)
        .mockResolvedValueOnce({
          embedding_ids: embeddings.map(e => e.id),
        })
        .mockResolvedValueOnce({ embeddings })
        .mockResolvedValueOnce({
          clusters: [
            {
              id: 'cluster-1',
              members: embeddings.map(e => e.id),
              size: embeddings.length,
              cohesion: 0.85,
            },
          ],
          outliers: [],
          totalClusters: 1,
        });

      const clusters = await clusterService.clusterDocuments(['doc-1']);

      expect(clusters.clusters.length).toBeGreaterThan(0);

      // Step 4: Extract entities
      vi.mocked(client.request).mockResolvedValueOnce({
        entities: [
          {
            id: 'entity-1',
            type: 'Concept',
            name: 'Machine Learning',
            properties: {},
          },
          {
            id: 'entity-2',
            type: 'Concept',
            name: 'Neural Networks',
            properties: {},
          },
        ],
      });

      const entities = await entityService.findByDocuments(['doc-1']);

      expect(entities.length).toBe(2);

      // Verify all steps completed successfully
      expect(searchResults).toBeDefined();
      expect(clusters).toBeDefined();
      expect(entities).toBeDefined();
    });
  });

  // ========================================================================
  // Constants and Type Guards
  // ========================================================================

  describe('Constants', () => {
    it('should export RUVECTOR_DEFAULTS', () => {
      expect(RUVECTOR_DEFAULTS.BASE_URL).toBe('https://api.ruvector.ai');
      expect(RUVECTOR_DEFAULTS.TIMEOUT).toBe(30000);
      expect(RUVECTOR_DEFAULTS.DEFAULT_TOP_K).toBe(10);
    });

    it('should export VECTOR_DIMENSIONS', () => {
      expect(VECTOR_DIMENSIONS.OPENAI_ADA_002).toBe(1536);
      expect(VECTOR_DIMENSIONS.CLAUDE).toBe(768);
    });

    it('should export GRAPH_RELATIONSHIP_TYPES', () => {
      expect(GRAPH_RELATIONSHIP_TYPES.RELATED).toBe('RELATED_TO');
      expect(GRAPH_RELATIONSHIP_TYPES.SUPPORTS).toBe('SUPPORTS');
    });

    it('should export ENTITY_TYPES', () => {
      expect(ENTITY_TYPES.PARAGRAPH).toBe('Paragraph');
      expect(ENTITY_TYPES.DOCUMENT).toBe('Document');
    });

    it('should export CLUSTERING_ALGORITHMS', () => {
      expect(CLUSTERING_ALGORITHMS.KMEANS).toBe('kmeans');
      expect(CLUSTERING_ALGORITHMS.GNN).toBe('gnn');
    });
  });

  describe('Type guards', () => {
    it('should validate VectorSearchResult', () => {
      const validResult: VectorSearchResult = {
        id: 'emb-1',
        score: 0.95,
        text: 'Sample text',
      };

      const invalidResult = {
        id: 'emb-1',
        // Missing score and text
      };

      expect(isVectorSearchResult(validResult)).toBe(true);
      expect(isVectorSearchResult(invalidResult)).toBe(false);
      expect(isVectorSearchResult(null)).toBe(false);
    });

    it('should validate GraphNode', () => {
      const validNode: GraphNode = {
        id: 'node-1',
        labels: ['Paragraph'],
        properties: { text: 'Sample' },
      };

      expect(isGraphNode(validNode)).toBe(true);
      expect(isGraphNode({})).toBe(false);
    });

    it('should validate Entity', () => {
      const validEntity: Entity = {
        id: 'entity-1',
        type: 'Concept',
        name: 'Machine Learning',
        properties: {},
      };

      expect(isEntity(validEntity)).toBe(true);
      expect(isEntity({})).toBe(false);
    });

    it('should validate Cluster', () => {
      const validCluster: Cluster = {
        id: 'cluster-1',
        members: ['emb-1', 'emb-2'],
        size: 2,
        cohesion: 0.85,
      };

      expect(isCluster(validCluster)).toBe(true);
      expect(isCluster({})).toBe(false);
    });

    it('should validate RuvectorError', () => {
      const error = new Error('Test error');
      const ruvectorError = {
        name: 'RuvectorError',
        message: 'API error',
        code: 'API_ERROR',
      };

      expect(isRuvectorError(error)).toBe(false);
      expect(isRuvectorError(ruvectorError)).toBe(false);
    });
  });

  // ========================================================================
  // Utility Functions
  // ========================================================================

  describe('Utility functions', () => {
    describe('validateVectorDimensions()', () => {
      it('should validate correct dimensions', () => {
        const vector = Array(1536).fill(0.5);

        expect(validateVectorDimensions(vector, 1536)).toBe(true);
      });

      it('should reject incorrect dimensions', () => {
        const vector = Array(512).fill(0.5);

        expect(validateVectorDimensions(vector, 1536)).toBe(false);
      });
    });

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
    });

    describe('buildNamespaceKey()', () => {
      it('should build namespace key with all parameters', () => {
        const key = buildNamespaceKey('user-1', 'project-1', 'doc-1');

        expect(key).toBe('user-1:project-1:doc-1');
      });

      it('should build namespace key with partial parameters', () => {
        const key = buildNamespaceKey('user-1', 'project-1');

        expect(key).toBe('user-1:project-1');
      });

      it('should build namespace key with userId only', () => {
        const key = buildNamespaceKey('user-1');

        expect(key).toBe('user-1');
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
    });

    describe('estimateTokenCount()', () => {
      it('should estimate token count', () => {
        const text = 'This is a sample text for token estimation';
        const tokens = estimateTokenCount(text);

        expect(tokens).toBeGreaterThan(0);
        expect(tokens).toBeLessThan(text.length);
      });
    });

    describe('formatRuvectorError()', () => {
      it('should format Error object', () => {
        const error = new Error('Test error');
        const formatted = formatRuvectorError(error);

        expect(formatted).toBe('Test error');
      });

      it('should format object with message', () => {
        const error = { message: 'API error', code: 'API_ERROR' };
        const formatted = formatRuvectorError(error);

        expect(formatted).toBe('API error');
      });

      it('should format string error', () => {
        const error = 'Simple error string';
        const formatted = formatRuvectorError(error);

        expect(formatted).toBe('Simple error string');
      });
    });
  });
});
