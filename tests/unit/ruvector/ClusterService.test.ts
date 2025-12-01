/**
 * ClusterService Unit Tests
 *
 * Comprehensive test coverage for Ruvector ClusterService including:
 * - Basic clustering (kmeans, dbscan, hierarchical, gnn)
 * - Document and namespace clustering
 * - GNN-powered clustering and training
 * - Hierarchical cluster analysis
 * - Cluster visualization
 * - Theme discovery
 * - Backward compatibility with similarity.ts
 * - K-means++ initialization
 * - Silhouette score calculation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClusterService } from '@/services/ruvector/ClusterService';
import type { RuvectorClient } from '@/services/ruvector/client';
import type {
  Embedding,
  ClusterConfig,
  ClusteringResult,
  Cluster,
  ClusterAnalysis,
  ClusterVisualization,
  HierarchicalCluster,
  GNNClusteringOptions,
} from '@/services/ruvector/types';
import type {
  ThemeDiscoveryResult,
  GNNTrainingData,
  GNNModelMetadata,
} from '@/services/ruvector/ClusterService';

describe('ClusterService', () => {
  let mockClient: RuvectorClient;
  let mockVectorService: any;
  let service: ClusterService;

  const createMockEmbedding = (id: string, vector?: number[]): Embedding => ({
    id,
    vector: vector || [1, 2, 3, 4, 5],
    text: `Sample text ${id}`,
    metadata: { documentId: 'doc-1' },
    created_at: new Date().toISOString(),
  });

  const createMockCluster = (id: string, memberCount: number): Cluster => ({
    id,
    members: Array(memberCount)
      .fill(0)
      .map((_, i) => `emb-${i}`),
    centroid: [1, 2, 3, 4, 5],
    size: memberCount,
    cohesion: 0.85,
  });

  beforeEach(() => {
    mockClient = {
      request: vi.fn(),
    } as unknown as RuvectorClient;

    mockVectorService = {
      getByIds: vi.fn(),
    };

    service = new ClusterService(mockClient, mockVectorService);
  });

  // ========================================================================
  // Basic Clustering Methods
  // ========================================================================

  describe('cluster()', () => {
    it('should cluster embeddings using kmeans by default', async () => {
      const embeddingIds = ['emb-1', 'emb-2', 'emb-3', 'emb-4'];
      const embeddings = embeddingIds.map(id => createMockEmbedding(id));

      vi.mocked(mockVectorService.getByIds).mockResolvedValue(embeddings);

      const result = await service.cluster(embeddingIds);

      expect(result).toBeDefined();
      expect(result.clusters.length).toBeGreaterThan(0);
      expect(result.metadata?.algorithm).toBe('kmeans');
      expect(result.metadata?.executionTime).toBeGreaterThanOrEqual(0);
      expect(mockVectorService.getByIds).toHaveBeenCalledWith(embeddingIds);
    });

    it('should cluster using hierarchical algorithm', async () => {
      const embeddingIds = ['emb-1', 'emb-2', 'emb-3'];
      const embeddings = embeddingIds.map(id => createMockEmbedding(id));

      vi.mocked(mockVectorService.getByIds).mockResolvedValue(embeddings);

      const config: ClusterConfig = { algorithm: 'hierarchical' };
      const result = await service.cluster(embeddingIds, config);

      expect(result.metadata?.algorithm).toBe('hierarchical');
      expect(result.clusters).toBeDefined();
    });

    it('should cluster using dbscan algorithm', async () => {
      const embeddingIds = ['emb-1', 'emb-2', 'emb-3'];
      const embeddings = embeddingIds.map(id => createMockEmbedding(id));

      vi.mocked(mockVectorService.getByIds).mockResolvedValue(embeddings);

      const config: ClusterConfig = { algorithm: 'dbscan' };
      const result = await service.cluster(embeddingIds, config);

      expect(result.metadata?.algorithm).toBe('dbscan');
      expect(result.outliers).toBeDefined();
    });

    it('should cluster using gnn algorithm', async () => {
      const embeddingIds = ['emb-1', 'emb-2', 'emb-3'];
      const mockGnnResult: ClusteringResult = {
        clusters: [createMockCluster('cluster-1', 3)],
        outliers: [],
        totalClusters: 1,
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockGnnResult);

      const config: ClusterConfig = { algorithm: 'gnn' };
      const result = await service.cluster(embeddingIds, config);

      expect(result.metadata?.algorithm).toBe('gnn');
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/v1/cluster/gnn',
        })
      );
    });

    it('should throw error when clustering empty embedding list', async () => {
      await expect(service.cluster([])).rejects.toThrow(
        'Cannot cluster empty embedding list'
      );
    });

    it('should include convergence information', async () => {
      const embeddingIds = ['emb-1', 'emb-2', 'emb-3'];
      const embeddings = embeddingIds.map(id => createMockEmbedding(id));

      vi.mocked(mockVectorService.getByIds).mockResolvedValue(embeddings);

      const result = await service.cluster(embeddingIds);

      expect(result.metadata?.convergence).toBe(true);
    });

    it('should handle custom number of clusters', async () => {
      const embeddingIds = Array(20)
        .fill(0)
        .map((_, i) => `emb-${i}`);
      const embeddings = embeddingIds.map(id =>
        createMockEmbedding(id, Array(5).fill(Math.random()))
      );

      vi.mocked(mockVectorService.getByIds).mockResolvedValue(embeddings);

      const config: ClusterConfig = { numClusters: 5, algorithm: 'kmeans' };
      const result = await service.cluster(embeddingIds, config);

      expect(result.clusters.length).toBeGreaterThan(0);
    });
  });

  describe('clusterDocuments()', () => {
    it('should cluster documents by their IDs', async () => {
      const documentIds = ['doc-1', 'doc-2'];
      const embeddingIds = ['emb-1', 'emb-2', 'emb-3', 'emb-4'];
      const embeddings = embeddingIds.map(id => createMockEmbedding(id));

      vi.mocked(mockClient.request).mockResolvedValueOnce({
        embedding_ids: embeddingIds,
      });
      vi.mocked(mockVectorService.getByIds).mockResolvedValue(embeddings);

      const result = await service.clusterDocuments(documentIds);

      expect(result).toBeDefined();
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/v1/vector/query-by-metadata',
          body: expect.objectContaining({
            filter: {
              documentId: { $in: documentIds },
            },
          }),
        })
      );
    });

    it('should throw error when document clustering fails', async () => {
      const documentIds = ['doc-1'];

      vi.mocked(mockClient.request).mockRejectedValue(
        new Error('API error')
      );

      await expect(service.clusterDocuments(documentIds)).rejects.toThrow(
        'Failed to cluster documents'
      );
    });
  });

  describe('clusterByNamespace()', () => {
    it('should cluster all embeddings in a namespace', async () => {
      const namespace = 'project-1';
      const embeddingIds = ['emb-1', 'emb-2', 'emb-3'];
      const embeddings = embeddingIds.map(id => createMockEmbedding(id));

      vi.mocked(mockClient.request).mockResolvedValueOnce({
        embedding_ids: embeddingIds,
      });
      vi.mocked(mockVectorService.getByIds).mockResolvedValue(embeddings);

      const result = await service.clusterByNamespace(namespace);

      expect(result).toBeDefined();
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: '/v1/vector/list',
          params: { namespace },
        })
      );
    });

    it('should throw error when namespace clustering fails', async () => {
      const namespace = 'invalid-namespace';

      vi.mocked(mockClient.request).mockRejectedValue(
        new Error('Namespace not found')
      );

      await expect(service.clusterByNamespace(namespace)).rejects.toThrow(
        'Failed to cluster by namespace'
      );
    });
  });

  // ========================================================================
  // GNN-Powered Clustering
  // ========================================================================

  describe('gnnCluster()', () => {
    it('should perform GNN-based clustering', async () => {
      const embeddingIds = ['emb-1', 'emb-2', 'emb-3'];
      const mockResult: ClusteringResult = {
        clusters: [createMockCluster('gnn-cluster-1', 3)],
        outliers: [],
        totalClusters: 1,
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockResult);

      const result = await service.gnnCluster(embeddingIds);

      expect(result).toEqual(mockResult);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/v1/cluster/gnn',
          body: expect.objectContaining({
            embedding_ids: embeddingIds,
            use_attention: true,
            aggregation_method: 'mean',
            edge_weights: true,
          }),
        })
      );
    });

    it('should use custom GNN options', async () => {
      const embeddingIds = ['emb-1', 'emb-2'];
      const options: GNNClusteringOptions = {
        useAttention: false,
        aggregationMethod: 'max',
        edgeWeights: false,
        nodeFeatures: { feature1: [1, 2, 3] },
      };

      vi.mocked(mockClient.request).mockResolvedValue({
        clusters: [],
        outliers: [],
        totalClusters: 0,
      });

      await service.gnnCluster(embeddingIds, options);

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            use_attention: false,
            aggregation_method: 'max',
            edge_weights: false,
            node_features: options.nodeFeatures,
          }),
        })
      );
    });

    it('should throw error when GNN clustering fails', async () => {
      const embeddingIds = ['emb-1'];

      vi.mocked(mockClient.request).mockRejectedValue(
        new Error('GNN model error')
      );

      await expect(service.gnnCluster(embeddingIds)).rejects.toThrow(
        'GNN clustering failed'
      );
    });
  });

  describe('trainGNNModel()', () => {
    it('should train GNN model with labeled data', async () => {
      const trainingData: GNNTrainingData = {
        embeddings: ['emb-1', 'emb-2', 'emb-3'],
        labels: ['label-A', 'label-A', 'label-B'],
        validationSplit: 0.2,
      };

      const mockMetadata: GNNModelMetadata = {
        modelId: 'gnn-model-123',
        accuracy: 0.95,
        loss: 0.05,
        epochs: 50,
        trained_at: new Date().toISOString(),
      };

      vi.mocked(mockClient.request).mockResolvedValue({
        model_id: mockMetadata.modelId,
        metadata: mockMetadata,
      });

      const result = await service.trainGNNModel(trainingData);

      expect(result).toEqual(mockMetadata);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          path: '/v1/cluster/gnn/train',
          body: expect.objectContaining({
            embeddings: trainingData.embeddings,
            labels: trainingData.labels,
            validation_split: 0.2,
          }),
        })
      );
    });

    it('should use default validation split if not provided', async () => {
      const trainingData: GNNTrainingData = {
        embeddings: ['emb-1', 'emb-2'],
        labels: ['label-A', 'label-B'],
      };

      vi.mocked(mockClient.request).mockResolvedValue({
        model_id: 'model-123',
        metadata: {} as GNNModelMetadata,
      });

      await service.trainGNNModel(trainingData);

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            validation_split: 0.2,
          }),
        })
      );
    });

    it('should throw error when training fails', async () => {
      const trainingData: GNNTrainingData = {
        embeddings: ['emb-1'],
        labels: ['label-A'],
      };

      vi.mocked(mockClient.request).mockRejectedValue(
        new Error('Training failed')
      );

      await expect(service.trainGNNModel(trainingData)).rejects.toThrow(
        'Failed to train GNN model'
      );
    });
  });

  // ========================================================================
  // Hierarchical Clustering
  // ========================================================================

  describe('hierarchicalCluster()', () => {
    it('should perform hierarchical clustering', async () => {
      const embeddingIds = ['emb-1', 'emb-2', 'emb-3'];
      const embeddings = embeddingIds.map(id => createMockEmbedding(id));

      vi.mocked(mockVectorService.getByIds).mockResolvedValue(embeddings);

      const result = await service.hierarchicalCluster(embeddingIds);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should use custom number of clusters', async () => {
      const embeddingIds = Array(10)
        .fill(0)
        .map((_, i) => `emb-${i}`);
      const embeddings = embeddingIds.map(id => createMockEmbedding(id));

      vi.mocked(mockVectorService.getByIds).mockResolvedValue(embeddings);

      const config: ClusterConfig = { numClusters: 3 };
      const result = await service.hierarchicalCluster(embeddingIds, config);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error when hierarchical clustering fails', async () => {
      const embeddingIds = ['emb-1'];

      vi.mocked(mockVectorService.getByIds).mockRejectedValue(
        new Error('Failed to fetch embeddings')
      );

      await expect(
        service.hierarchicalCluster(embeddingIds)
      ).rejects.toThrow('Hierarchical clustering failed');
    });
  });

  // ========================================================================
  // Cluster Analysis
  // ========================================================================

  describe('analyzeCluster()', () => {
    it('should analyze cluster characteristics', async () => {
      const clusterId = 'cluster-1';
      const mockAnalysis: ClusterAnalysis = {
        clusterId,
        statistics: {
          size: 10,
          avgSimilarity: 0.85,
          minSimilarity: 0.7,
          maxSimilarity: 0.95,
          variance: 0.05,
        },
        representatives: ['emb-1', 'emb-2', 'emb-3'],
        topTerms: [
          { term: 'machine learning', score: 0.9 },
          { term: 'neural networks', score: 0.85 },
        ],
      };

      vi.mocked(mockClient.request).mockResolvedValue(mockAnalysis);

      const result = await service.analyzeCluster(clusterId);

      expect(result).toEqual(mockAnalysis);
      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          path: `/v1/cluster/${clusterId}/analyze`,
        })
      );
    });

    it('should throw error when cluster analysis fails', async () => {
      const clusterId = 'invalid-cluster';

      vi.mocked(mockClient.request).mockRejectedValue(
        new Error('Cluster not found')
      );

      await expect(service.analyzeCluster(clusterId)).rejects.toThrow(
        'Failed to analyze cluster'
      );
    });
  });

  describe('getClusterVisualization()', () => {
    it('should generate visualization data for clusters', async () => {
      const clusteringResult: ClusteringResult = {
        clusters: [
          createMockCluster('cluster-1', 3),
          createMockCluster('cluster-2', 2),
        ],
        outliers: [],
        totalClusters: 2,
      };

      const mockProjections = [
        { id: 'emb-1', x: 10, y: 20 },
        { id: 'emb-2', x: 15, y: 25 },
        { id: 'emb-3', x: 12, y: 22 },
      ];

      vi.mocked(mockClient.request).mockResolvedValue({
        projections: mockProjections,
      });

      const result = await service.getClusterVisualization(clusteringResult);

      expect(result).toBeDefined();
      expect(result.nodes.length).toBeGreaterThan(0);
      expect(result.edges).toBeDefined();
      expect(result.clusterCenters.length).toBe(2);
    });

    it('should use fallback projection when visualization API fails', async () => {
      const clusteringResult: ClusteringResult = {
        clusters: [createMockCluster('cluster-1', 2)],
        outliers: [],
        totalClusters: 1,
      };

      vi.mocked(mockClient.request).mockRejectedValue(
        new Error('Visualization API error')
      );

      const result = await service.getClusterVisualization(clusteringResult);

      expect(result).toBeDefined();
      expect(result.nodes.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // Theme Discovery
  // ========================================================================

  describe('discoverThemes()', () => {
    it('should discover themes in documents using clustering', async () => {
      const documentIds = ['doc-1', 'doc-2'];
      const embeddingIds = ['emb-1', 'emb-2', 'emb-3', 'emb-4'];
      const embeddings = embeddingIds.map(id => createMockEmbedding(id));

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ embedding_ids: embeddingIds })
        .mockResolvedValueOnce({
          clusters: [createMockCluster('cluster-1', 4)],
          outliers: [],
          totalClusters: 1,
        })
        .mockResolvedValueOnce({
          theme: 'Machine Learning Concepts',
          confidence: 0.9,
          keywords: ['neural networks', 'deep learning', 'training'],
        });

      vi.mocked(mockVectorService.getByIds).mockResolvedValue(embeddings);

      const result = await service.discoverThemes(documentIds, 3);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].theme).toBe('Machine Learning Concepts');
      expect(result[0].confidence).toBe(0.9);
      expect(result[0].keywords.length).toBeGreaterThan(0);
    });

    it('should skip small clusters', async () => {
      const documentIds = ['doc-1'];
      const embeddingIds = ['emb-1', 'emb-2'];

      vi.mocked(mockClient.request)
        .mockResolvedValueOnce({ embedding_ids: embeddingIds })
        .mockResolvedValueOnce({
          clusters: [createMockCluster('cluster-1', 2)],
          outliers: [],
          totalClusters: 1,
        });

      const result = await service.discoverThemes(documentIds, 5);

      expect(result.length).toBe(0);
    });

    it('should throw error when theme discovery fails', async () => {
      const documentIds = ['doc-1'];

      vi.mocked(mockClient.request).mockRejectedValue(
        new Error('Failed to fetch embeddings')
      );

      await expect(service.discoverThemes(documentIds)).rejects.toThrow(
        'Failed to discover themes'
      );
    });
  });

  // ========================================================================
  // Backward Compatibility
  // ========================================================================

  describe('clusterBySimilarity()', () => {
    it('should cluster embeddings using similarity threshold', () => {
      const embeddings = new Map<string, { vector: number[]; text: string }>([
        ['emb-1', { vector: [1, 2, 3, 4, 5], text: 'Text 1' }],
        ['emb-2', { vector: [1.1, 2.1, 3.1, 4.1, 5.1], text: 'Text 2' }],
        ['emb-3', { vector: [10, 20, 30, 40, 50], text: 'Text 3' }],
      ]);

      const result = service.clusterBySimilarity(embeddings, 0.7);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].members.length).toBeGreaterThan(0);
      expect(result[0].centroid).toBeDefined();
      expect(result[0].cohesion).toBeGreaterThan(0);
    });

    it('should create separate clusters for dissimilar embeddings', () => {
      const embeddings = new Map<string, { vector: number[]; text: string }>([
        ['emb-1', { vector: [1, 0, 0, 0, 0], text: 'Text 1' }],
        ['emb-2', { vector: [0, 1, 0, 0, 0], text: 'Text 2' }],
        ['emb-3', { vector: [0, 0, 1, 0, 0], text: 'Text 3' }],
      ]);

      const result = service.clusterBySimilarity(embeddings, 0.9);

      expect(result.length).toBe(3);
    });

    it('should use custom threshold', () => {
      const embeddings = new Map<string, { vector: number[]; text: string }>([
        ['emb-1', { vector: [1, 2, 3], text: 'Text 1' }],
        ['emb-2', { vector: [1.5, 2.5, 3.5], text: 'Text 2' }],
      ]);

      const result = service.clusterBySimilarity(embeddings, 0.95);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty embeddings map', () => {
      const embeddings = new Map<string, { vector: number[]; text: string }>();

      const result = service.clusterBySimilarity(embeddings);

      expect(result.length).toBe(0);
    });
  });

  // ========================================================================
  // K-means++ Initialization
  // ========================================================================

  describe('K-means++ initialization', () => {
    it('should initialize centroids using K-means++ algorithm', async () => {
      const embeddingIds = Array(20)
        .fill(0)
        .map((_, i) => `emb-${i}`);
      const embeddings = embeddingIds.map(id =>
        createMockEmbedding(
          id,
          Array(5)
            .fill(0)
            .map(() => Math.random())
        )
      );

      vi.mocked(mockVectorService.getByIds).mockResolvedValue(embeddings);

      const config: ClusterConfig = { numClusters: 5, algorithm: 'kmeans' };
      const result = await service.cluster(embeddingIds, config);

      expect(result.clusters.length).toBeGreaterThan(0);
      expect(result.metadata?.algorithm).toBe('kmeans');
    });
  });

  // ========================================================================
  // Silhouette Score Calculation
  // ========================================================================

  describe('Silhouette score calculation', () => {
    it('should calculate silhouette score for clustering result', async () => {
      const embeddingIds = Array(10)
        .fill(0)
        .map((_, i) => `emb-${i}`);
      const embeddings = embeddingIds.map((id, idx) =>
        createMockEmbedding(
          id,
          idx < 5 ? [1, 2, 3, 4, 5] : [10, 20, 30, 40, 50]
        )
      );

      vi.mocked(mockVectorService.getByIds).mockResolvedValue(embeddings);

      const result = await service.cluster(embeddingIds, {
        algorithm: 'kmeans',
        numClusters: 2,
      });

      expect(result.silhouetteScore).toBeDefined();
      expect(result.silhouetteScore).toBeGreaterThan(-1);
      expect(result.silhouetteScore).toBeLessThanOrEqual(1);
    });
  });

  // ========================================================================
  // Error Handling
  // ========================================================================

  describe('Error handling', () => {
    it('should handle API errors gracefully', async () => {
      const embeddingIds = ['emb-1'];

      vi.mocked(mockVectorService.getByIds).mockRejectedValue(
        new Error('API connection failed')
      );

      await expect(service.cluster(embeddingIds)).rejects.toThrow(
        'Failed to cluster embeddings'
      );
    });

    it('should handle invalid embedding data', async () => {
      const embeddingIds = ['emb-1'];

      vi.mocked(mockVectorService.getByIds).mockResolvedValue([]);

      await expect(service.cluster(embeddingIds)).rejects.toThrow();
    });

    it('should handle network timeouts', async () => {
      const embeddingIds = ['emb-1'];

      vi.mocked(mockVectorService.getByIds).mockRejectedValue(
        new Error('Request timeout')
      );

      await expect(service.cluster(embeddingIds)).rejects.toThrow(
        'Failed to cluster embeddings'
      );
    });
  });
});
