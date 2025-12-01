/**
 * Ruvector Cluster Service
 *
 * Advanced clustering service with GNN (Graph Neural Network) integration.
 * Provides multiple clustering algorithms, hierarchical clustering, theme discovery,
 * and backward compatibility with existing similarity-based clustering.
 *
 * Features:
 * - Multiple algorithms: K-Means, Hierarchical, DBSCAN, GNN-based
 * - GNN-powered clustering with attention mechanisms
 * - Hierarchical cluster analysis
 * - Theme discovery for document analysis
 * - Cluster visualization data generation
 * - Backward compatibility with existing clusterBySimilarity()
 *
 * @module ClusterService
 */

import { RuvectorClient } from '../client';
import type {
  ClusterConfig,
  ClusteringResult,
  Cluster,
  ClusterAnalysis,
  ClusterVisualization,
  HierarchicalCluster,
  GNNClusteringOptions,
  Embedding,
  ClusteringError,
} from '../types';

// ============================================================================
// Type Definitions for Theme Discovery
// ============================================================================

export interface ThemeDiscoveryResult {
  theme: string;
  cluster: Cluster;
  representativeParagraphs: string[];
  confidence: number;
  keywords: string[];
}

export interface GNNTrainingData {
  embeddings: string[];
  labels: string[];
  validationSplit?: number;
}

export interface GNNModelMetadata {
  modelId: string;
  accuracy: number;
  loss: number;
  epochs: number;
  trained_at: string;
}

// ============================================================================
// Cluster Service Implementation
// ============================================================================

export class ClusterService {
  private gnnModelId: string | null = null;
  private readonly defaultMinClusters = 3;
  private readonly defaultMaxClusters = 10;

  constructor(
    private readonly client: RuvectorClient,
    private readonly vectorService?: any // VectorService will be injected
  ) {}

  // ==========================================================================
  // Basic Clustering Methods
  // ==========================================================================

  /**
   * Cluster embeddings using specified algorithm
   */
  async cluster(
    embeddingIds: string[],
    config?: ClusterConfig
  ): Promise<ClusteringResult> {
    const startTime = Date.now();
    const algorithm = config?.algorithm || 'kmeans';

    try {
      // Validate inputs
      if (embeddingIds.length === 0) {
        throw new Error('Cannot cluster empty embedding list');
      }

      // Fetch embeddings
      const embeddings = await this.fetchEmbeddings(embeddingIds);

      // Route to appropriate algorithm
      let result: ClusteringResult;

      switch (algorithm) {
        case 'gnn':
          result = await this.gnnCluster(embeddingIds, config?.gnnConfig as GNNClusteringOptions | undefined);
          break;
        case 'hierarchical':
          const hierarchical = await this.hierarchicalCluster(embeddingIds, config);
          result = this.convertHierarchicalToFlat(hierarchical);
          break;
        case 'dbscan':
          result = await this.dbscanCluster(embeddings, config);
          break;
        case 'kmeans':
        default:
          result = await this.kmeansCluster(embeddings, config);
          break;
      }

      // Add execution metadata
      result.metadata = {
        algorithm,
        executionTime: Date.now() - startTime,
        convergence: true,
      };

      return result;
    } catch (error) {
      throw this.handleError(error, 'Failed to cluster embeddings');
    }
  }

  /**
   * Cluster documents by their IDs
   */
  async clusterDocuments(
    documentIds: string[],
    config?: ClusterConfig
  ): Promise<ClusteringResult> {
    try {
      // Get all embeddings for these documents
      const embeddingIds = await this.getEmbeddingsByDocuments(documentIds);
      return await this.cluster(embeddingIds, config);
    } catch (error) {
      throw this.handleError(error, 'Failed to cluster documents');
    }
  }

  /**
   * Cluster all embeddings in a namespace
   */
  async clusterByNamespace(
    namespace: string,
    config?: ClusterConfig
  ): Promise<ClusteringResult> {
    try {
      // Get all embeddings in namespace
      const embeddingIds = await this.getEmbeddingsByNamespace(namespace);
      return await this.cluster(embeddingIds, config);
    } catch (error) {
      throw this.handleError(error, 'Failed to cluster by namespace');
    }
  }

  // ==========================================================================
  // GNN-Powered Clustering
  // ==========================================================================

  /**
   * Perform GNN-based clustering with graph neural network
   */
  async gnnCluster(
    embeddingIds: string[],
    options?: GNNClusteringOptions
  ): Promise<ClusteringResult> {
    try {
      const response = await this.client.request<ClusteringResult>({
        method: 'POST',
        path: '/v1/cluster/gnn',
        body: {
          embedding_ids: embeddingIds,
          model_id: this.gnnModelId,
          use_attention: options?.useAttention ?? true,
          aggregation_method: options?.aggregationMethod || 'mean',
          node_features: options?.nodeFeatures,
          edge_weights: options?.edgeWeights ?? true,
        },
      });

      return response;
    } catch (error) {
      throw this.handleError(error, 'GNN clustering failed');
    }
  }

  /**
   * Train GNN model with labeled data
   */
  async trainGNNModel(trainingData: GNNTrainingData): Promise<GNNModelMetadata> {
    try {
      const response = await this.client.request<{ model_id: string; metadata: GNNModelMetadata }>({
        method: 'POST',
        path: '/v1/cluster/gnn/train',
        body: {
          embeddings: trainingData.embeddings,
          labels: trainingData.labels,
          validation_split: trainingData.validationSplit || 0.2,
        },
      });

      // Store model ID for future use
      this.gnnModelId = response.model_id;

      return response.metadata;
    } catch (error) {
      throw this.handleError(error, 'Failed to train GNN model');
    }
  }

  // ==========================================================================
  // Hierarchical Clustering
  // ==========================================================================

  /**
   * Perform hierarchical clustering
   */
  async hierarchicalCluster(
    embeddingIds: string[],
    config?: ClusterConfig
  ): Promise<HierarchicalCluster[]> {
    try {
      const embeddings = await this.fetchEmbeddings(embeddingIds);
      const linkageMatrix = await this.computeLinkageMatrix(embeddings);

      // Build hierarchical tree
      const tree = this.buildHierarchicalTree(linkageMatrix, embeddingIds);

      // Cut tree at optimal level if numClusters not specified
      const numClusters = config?.numClusters || this.estimateOptimalClusters(embeddings);
      const clusters = this.cutTree(tree, numClusters);

      return clusters;
    } catch (error) {
      throw this.handleError(error, 'Hierarchical clustering failed');
    }
  }

  // ==========================================================================
  // Cluster Analysis
  // ==========================================================================

  /**
   * Analyze cluster characteristics
   */
  async analyzeCluster(clusterId: string): Promise<ClusterAnalysis> {
    try {
      const response = await this.client.request<ClusterAnalysis>({
        method: 'GET',
        path: `/v1/cluster/${clusterId}/analyze`,
      });

      return response;
    } catch (error) {
      throw this.handleError(error, 'Failed to analyze cluster');
    }
  }

  /**
   * Generate visualization data for clusters
   */
  async getClusterVisualization(
    clusteringResult: ClusteringResult
  ): Promise<ClusterVisualization> {
    try {
      // Use dimensionality reduction (t-SNE or UMAP) for 2D projection
      const projections = await this.projectTo2D(clusteringResult);

      const nodes = projections.map((proj, idx) => ({
        id: proj.id,
        clusterId: proj.clusterId,
        position: { x: proj.x, y: proj.y },
        size: proj.importance || 1,
      }));

      // Calculate edges based on similarity
      const edges = await this.calculateEdges(clusteringResult);

      // Calculate cluster centers
      const clusterCenters = clusteringResult.clusters.map(cluster => ({
        clusterId: cluster.id,
        position: this.calculateClusterCenter(cluster, projections),
      }));

      return {
        nodes,
        edges,
        clusterCenters,
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to generate cluster visualization');
    }
  }

  // ==========================================================================
  // Theme Discovery (Close Reading Integration)
  // ==========================================================================

  /**
   * Discover themes in documents using clustering
   */
  async discoverThemes(
    documentIds: string[],
    minClusters?: number
  ): Promise<ThemeDiscoveryResult[]> {
    try {
      // Get document embeddings
      const embeddingIds = await this.getEmbeddingsByDocuments(documentIds);

      // Perform GNN clustering for better semantic understanding
      const clusteringResult = await this.gnnCluster(embeddingIds, {
        useAttention: true,
        aggregationMethod: 'mean',
        edgeWeights: true,
      });

      // Extract themes from clusters
      const themes: ThemeDiscoveryResult[] = [];

      for (const cluster of clusteringResult.clusters) {
        // Skip small clusters
        if (cluster.members.length < (minClusters || 3)) {
          continue;
        }

        // Get representative paragraphs
        const representativeParagraphs = await this.getRepresentativeParagraphs(
          cluster.members,
          3
        );

        // Extract theme using AI
        const theme = await this.extractTheme(cluster, representativeParagraphs);

        themes.push({
          theme: theme.name,
          cluster,
          representativeParagraphs: representativeParagraphs.map(p => p.text),
          confidence: theme.confidence,
          keywords: theme.keywords,
        });
      }

      // Sort by cluster size (importance)
      themes.sort((a, b) => b.cluster.size - a.cluster.size);

      return themes;
    } catch (error) {
      throw this.handleError(error, 'Failed to discover themes');
    }
  }

  // ==========================================================================
  // Backward Compatibility (similarity.ts)
  // ==========================================================================

  /**
   * Backward-compatible clustering method from similarity.ts
   * Uses simple threshold-based clustering
   */
  clusterBySimilarity(
    embeddings: Map<string, { vector: number[]; text: string }>,
    threshold = 0.7
  ): Cluster[] {
    const clusters: Cluster[] = [];
    const assigned = new Set<string>();
    const embeddingArray = Array.from(embeddings.entries());

    for (let i = 0; i < embeddingArray.length; i++) {
      const [id, embedding] = embeddingArray[i];

      if (assigned.has(id)) continue;

      // Start new cluster
      const members: string[] = [id];
      const vectors: number[][] = [embedding.vector];
      assigned.add(id);

      // Find similar unassigned embeddings
      for (let j = i + 1; j < embeddingArray.length; j++) {
        const [candidateId, candidateEmbedding] = embeddingArray[j];

        if (assigned.has(candidateId)) continue;

        // Check similarity to cluster centroid
        const centroid = this.calculateCentroid(vectors);
        const similarity = this.cosineSimilarity(candidateEmbedding.vector, centroid);

        if (similarity >= threshold) {
          members.push(candidateId);
          vectors.push(candidateEmbedding.vector);
          assigned.add(candidateId);
        }
      }

      // Calculate final centroid and cohesion
      const centroid = this.calculateCentroid(vectors);
      const cohesion = this.calculateAverageSimilarity(vectors);

      clusters.push({
        id: `cluster-${clusters.length}`,
        members,
        centroid,
        size: members.length,
        cohesion,
      });
    }

    return clusters;
  }

  // ==========================================================================
  // Algorithm Implementations
  // ==========================================================================

  /**
   * K-Means clustering implementation
   */
  private async kmeansCluster(
    embeddings: Embedding[],
    config?: ClusterConfig
  ): Promise<ClusteringResult> {
    const k = config?.numClusters || this.estimateOptimalClusters(embeddings);
    const maxIterations = config?.maxIterations || 100;

    // Initialize centroids using k-means++
    let centroids = this.initializeCentroidsKMeansPlusPlus(embeddings, k);
    let assignments: number[] = new Array(embeddings.length).fill(-1);
    let converged = false;

    for (let iter = 0; iter < maxIterations; iter++) {
      const newAssignments = this.assignToClusters(embeddings, centroids);

      // Check convergence
      if (this.arraysEqual(assignments, newAssignments)) {
        converged = true;
        break;
      }

      assignments = newAssignments;

      // Update centroids
      centroids = this.updateCentroids(embeddings, assignments, k);
    }

    // Build clusters
    const clusters = this.buildClusters(embeddings, assignments, centroids);

    // Calculate silhouette score
    const silhouetteScore = this.calculateSilhouetteScore(embeddings, assignments);

    return {
      clusters,
      outliers: [],
      silhouetteScore,
      totalClusters: clusters.length,
      metadata: {
        algorithm: 'kmeans',
        convergence: converged,
      },
    };
  }

  /**
   * DBSCAN clustering implementation
   */
  private async dbscanCluster(
    embeddings: Embedding[],
    config?: ClusterConfig
  ): Promise<ClusteringResult> {
    const eps = config?.minSimilarity ? 1 - config.minSimilarity : 0.3;
    const minPts = 3;

    const visited = new Set<number>();
    const clusters: Cluster[] = [];
    const noise: string[] = [];

    for (let i = 0; i < embeddings.length; i++) {
      if (visited.has(i)) continue;

      visited.add(i);
      const neighbors = this.getNeighbors(embeddings, i, eps);

      if (neighbors.length < minPts) {
        noise.push(embeddings[i].id);
        continue;
      }

      // Expand cluster
      const cluster = this.expandCluster(embeddings, i, neighbors, visited, eps, minPts);
      clusters.push(cluster);
    }

    return {
      clusters,
      outliers: noise,
      totalClusters: clusters.length,
      metadata: {
        algorithm: 'dbscan',
      },
    };
  }

  // ==========================================================================
  // Helper Methods - Clustering Algorithms
  // ==========================================================================

  private initializeCentroidsKMeansPlusPlus(
    embeddings: Embedding[],
    k: number
  ): number[][] {
    const centroids: number[][] = [];

    // Choose first centroid randomly
    const firstIdx = Math.floor(Math.random() * embeddings.length);
    centroids.push([...embeddings[firstIdx].vector]);

    // Choose remaining centroids
    for (let i = 1; i < k; i++) {
      const distances = embeddings.map(emb => {
        const minDist = Math.min(
          ...centroids.map(cent => this.euclideanDistance(emb.vector, cent))
        );
        return minDist * minDist;
      });

      const sumDist = distances.reduce((a, b) => a + b, 0);
      const probabilities = distances.map(d => d / sumDist);

      const nextIdx = this.weightedRandomChoice(probabilities);
      centroids.push([...embeddings[nextIdx].vector]);
    }

    return centroids;
  }

  private assignToClusters(embeddings: Embedding[], centroids: number[][]): number[] {
    return embeddings.map(emb => {
      const distances = centroids.map(cent =>
        this.euclideanDistance(emb.vector, cent)
      );
      return distances.indexOf(Math.min(...distances));
    });
  }

  private updateCentroids(
    embeddings: Embedding[],
    assignments: number[],
    k: number
  ): number[][] {
    const centroids: number[][] = [];

    for (let i = 0; i < k; i++) {
      const clusterVectors = embeddings
        .filter((_, idx) => assignments[idx] === i)
        .map(emb => emb.vector);

      if (clusterVectors.length > 0) {
        centroids.push(this.calculateCentroid(clusterVectors));
      } else {
        // Empty cluster - reinitialize randomly
        const randomIdx = Math.floor(Math.random() * embeddings.length);
        centroids.push([...embeddings[randomIdx].vector]);
      }
    }

    return centroids;
  }

  private buildClusters(
    embeddings: Embedding[],
    assignments: number[],
    centroids: number[][]
  ): Cluster[] {
    const clusterMap = new Map<number, string[]>();

    embeddings.forEach((emb, idx) => {
      const clusterId = assignments[idx];
      if (!clusterMap.has(clusterId)) {
        clusterMap.set(clusterId, []);
      }
      clusterMap.get(clusterId)!.push(emb.id);
    });

    return Array.from(clusterMap.entries()).map(([id, members]) => {
      const vectors = members.map(
        memberId => embeddings.find(e => e.id === memberId)!.vector
      );

      return {
        id: `cluster-${id}`,
        members,
        centroid: centroids[id],
        size: members.length,
        cohesion: this.calculateAverageSimilarity(vectors),
      };
    });
  }

  private getNeighbors(embeddings: Embedding[], idx: number, eps: number): number[] {
    const neighbors: number[] = [];
    const point = embeddings[idx].vector;

    for (let i = 0; i < embeddings.length; i++) {
      if (i === idx) continue;

      const dist = this.euclideanDistance(point, embeddings[i].vector);
      if (dist <= eps) {
        neighbors.push(i);
      }
    }

    return neighbors;
  }

  private expandCluster(
    embeddings: Embedding[],
    startIdx: number,
    neighbors: number[],
    visited: Set<number>,
    eps: number,
    minPts: number
  ): Cluster {
    const members: string[] = [embeddings[startIdx].id];
    const vectors: number[][] = [embeddings[startIdx].vector];
    const queue = [...neighbors];

    while (queue.length > 0) {
      const idx = queue.shift()!;

      if (!visited.has(idx)) {
        visited.add(idx);
        const newNeighbors = this.getNeighbors(embeddings, idx, eps);

        if (newNeighbors.length >= minPts) {
          queue.push(...newNeighbors);
        }
      }

      if (!members.includes(embeddings[idx].id)) {
        members.push(embeddings[idx].id);
        vectors.push(embeddings[idx].vector);
      }
    }

    return {
      id: `cluster-${Date.now()}-${Math.random()}`,
      members,
      centroid: this.calculateCentroid(vectors),
      size: members.length,
      cohesion: this.calculateAverageSimilarity(vectors),
    };
  }

  // ==========================================================================
  // Helper Methods - Hierarchical Clustering
  // ==========================================================================

  private async computeLinkageMatrix(embeddings: Embedding[]): Promise<number[][]> {
    // Compute pairwise distances
    const n = embeddings.length;
    const distances: number[][] = [];

    for (let i = 0; i < n; i++) {
      distances[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          distances[i][j] = 0;
        } else {
          distances[i][j] = this.euclideanDistance(
            embeddings[i].vector,
            embeddings[j].vector
          );
        }
      }
    }

    return distances;
  }

  private buildHierarchicalTree(
    linkageMatrix: number[][],
    embeddingIds: string[]
  ): HierarchicalCluster {
    // Simplified hierarchical clustering - full implementation would use
    // complete/average/single linkage
    const root: HierarchicalCluster = {
      id: 'root',
      members: embeddingIds,
      size: embeddingIds.length,
      cohesion: 1.0,
      level: 0,
      children: [],
    };

    return root;
  }

  private cutTree(tree: HierarchicalCluster, numClusters: number): HierarchicalCluster[] {
    // Cut tree to get specified number of clusters
    const clusters: HierarchicalCluster[] = [];

    // Simplified - full implementation would cut at optimal height
    const level = Math.ceil(Math.log2(numClusters));

    function traverse(node: HierarchicalCluster, currentLevel: number): void {
      if (currentLevel === level || !node.children || node.children.length === 0) {
        clusters.push(node);
      } else {
        node.children.forEach(child => traverse(child, currentLevel + 1));
      }
    }

    traverse(tree, 0);

    return clusters;
  }

  private convertHierarchicalToFlat(
    hierarchical: HierarchicalCluster[]
  ): ClusteringResult {
    const clusters: Cluster[] = hierarchical.map(hCluster => ({
      id: hCluster.id,
      members: hCluster.members,
      centroid: hCluster.centroid,
      size: hCluster.size,
      cohesion: hCluster.cohesion,
    }));

    return {
      clusters,
      outliers: [],
      totalClusters: clusters.length,
    };
  }

  // ==========================================================================
  // Helper Methods - Visualization
  // ==========================================================================

  private async projectTo2D(
    clusteringResult: ClusteringResult
  ): Promise<Array<{ id: string; clusterId: string; x: number; y: number; importance?: number }>> {
    // Use t-SNE or UMAP for dimensionality reduction
    // This would call Ruvector's visualization API
    try {
      const allMembers = clusteringResult.clusters.flatMap(c =>
        c.members.map(m => ({ id: m, clusterId: c.id }))
      );

      const response = await this.client.request<{
        projections: Array<{ id: string; x: number; y: number }>;
      }>({
        method: 'POST',
        path: '/v1/cluster/visualize',
        body: {
          embedding_ids: allMembers.map(m => m.id),
          method: 'umap',
        },
      });

      return response.projections.map(proj => {
        const member = allMembers.find(m => m.id === proj.id)!;
        return {
          ...proj,
          clusterId: member.clusterId,
        };
      });
    } catch (error) {
      // Fallback to simple projection
      return this.simpleProjection(clusteringResult);
    }
  }

  private simpleProjection(
    clusteringResult: ClusteringResult
  ): Array<{ id: string; clusterId: string; x: number; y: number }> {
    // Simple circular layout as fallback
    const projections: Array<{ id: string; clusterId: string; x: number; y: number }> = [];
    let globalIdx = 0;

    for (const cluster of clusteringResult.clusters) {
      const clusterSize = cluster.members.length;
      const radius = 100 + cluster.size * 10;

      for (let i = 0; i < cluster.members.length; i++) {
        const angle = (i / clusterSize) * 2 * Math.PI;
        projections.push({
          id: cluster.members[i],
          clusterId: cluster.id,
          x: radius * Math.cos(angle) + globalIdx * 50,
          y: radius * Math.sin(angle),
        });
      }

      globalIdx++;
    }

    return projections;
  }

  private async calculateEdges(
    clusteringResult: ClusteringResult
  ): Promise<Array<{ source: string; target: string; weight: number }>> {
    const edges: Array<{ source: string; target: string; weight: number }> = [];

    // Connect nodes within same cluster
    for (const cluster of clusteringResult.clusters) {
      for (let i = 0; i < cluster.members.length; i++) {
        for (let j = i + 1; j < cluster.members.length; j++) {
          edges.push({
            source: cluster.members[i],
            target: cluster.members[j],
            weight: cluster.cohesion,
          });
        }
      }
    }

    return edges;
  }

  private calculateClusterCenter(
    cluster: Cluster,
    projections: Array<{ id: string; x: number; y: number }>
  ): { x: number; y: number } {
    const clusterProjections = projections.filter(p =>
      cluster.members.includes(p.id)
    );

    const x = clusterProjections.reduce((sum, p) => sum + p.x, 0) / clusterProjections.length;
    const y = clusterProjections.reduce((sum, p) => sum + p.y, 0) / clusterProjections.length;

    return { x, y };
  }

  // ==========================================================================
  // Helper Methods - Theme Discovery
  // ==========================================================================

  private async getRepresentativeParagraphs(
    memberIds: string[],
    count: number
  ): Promise<Array<{ id: string; text: string }>> {
    // Get embeddings and select most central ones
    const embeddings = await this.fetchEmbeddings(memberIds);

    // Calculate centroid
    const centroid = this.calculateCentroid(embeddings.map(e => e.vector));

    // Find closest to centroid
    const withDistances = embeddings.map(emb => ({
      ...emb,
      distance: this.euclideanDistance(emb.vector, centroid),
    }));

    withDistances.sort((a, b) => a.distance - b.distance);

    return withDistances.slice(0, count).map(emb => ({
      id: emb.id,
      text: emb.text,
    }));
  }

  private async extractTheme(
    cluster: Cluster,
    representatives: Array<{ id: string; text: string }>
  ): Promise<{ name: string; confidence: number; keywords: string[] }> {
    // Use Ruvector's RAG service to extract theme
    try {
      const response = await this.client.request<{
        theme: string;
        confidence: number;
        keywords: string[];
      }>({
        method: 'POST',
        path: '/v1/rag/extract-theme',
        body: {
          texts: representatives.map(r => r.text),
          cluster_size: cluster.size,
        },
      });

      return {
        name: response.theme,
        confidence: response.confidence,
        keywords: response.keywords,
      };
    } catch (error) {
      // Fallback to simple keyword extraction
      return {
        name: `Theme ${cluster.id}`,
        confidence: cluster.cohesion,
        keywords: [],
      };
    }
  }

  // ==========================================================================
  // Helper Methods - Data Fetching
  // ==========================================================================

  private async fetchEmbeddings(embeddingIds: string[]): Promise<Embedding[]> {
    if (this.vectorService) {
      // Use injected VectorService
      return await this.vectorService.getByIds(embeddingIds);
    }

    // Fallback to direct API call
    const response = await this.client.request<{ embeddings: Embedding[] }>({
      method: 'POST',
      path: '/v1/vector/batch-get',
      body: { ids: embeddingIds },
    });

    return response.embeddings;
  }

  private async getEmbeddingsByDocuments(documentIds: string[]): Promise<string[]> {
    const response = await this.client.request<{ embedding_ids: string[] }>({
      method: 'POST',
      path: '/v1/vector/query-by-metadata',
      body: {
        filter: {
          documentId: { $in: documentIds },
        },
      },
    });

    return response.embedding_ids;
  }

  private async getEmbeddingsByNamespace(namespace: string): Promise<string[]> {
    const response = await this.client.request<{ embedding_ids: string[] }>({
      method: 'GET',
      path: '/v1/vector/list',
      params: { namespace },
    });

    return response.embedding_ids;
  }

  // ==========================================================================
  // Helper Methods - Mathematical Utilities
  // ==========================================================================

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private euclideanDistance(vecA: number[], vecB: number[]): number {
    let sum = 0;
    for (let i = 0; i < vecA.length; i++) {
      const diff = vecA[i] - vecB[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private calculateCentroid(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];

    const dimensions = vectors[0].length;
    const centroid = new Array(dimensions).fill(0);

    for (const vector of vectors) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += vector[i];
      }
    }

    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= vectors.length;
    }

    return centroid;
  }

  private calculateAverageSimilarity(vectors: number[][]): number {
    if (vectors.length <= 1) return 1.0;

    let totalSimilarity = 0;
    let count = 0;

    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        totalSimilarity += this.cosineSimilarity(vectors[i], vectors[j]);
        count++;
      }
    }

    return count > 0 ? totalSimilarity / count : 0;
  }

  private calculateSilhouetteScore(
    embeddings: Embedding[],
    assignments: number[]
  ): number {
    let totalScore = 0;

    for (let i = 0; i < embeddings.length; i++) {
      const clusterId = assignments[i];

      // Calculate a(i) - average distance to points in same cluster
      const sameCluster = embeddings.filter((_, idx) => assignments[idx] === clusterId);
      const a = sameCluster.reduce(
        (sum, emb) => sum + this.euclideanDistance(embeddings[i].vector, emb.vector),
        0
      ) / sameCluster.length;

      // Calculate b(i) - min average distance to points in other clusters
      const otherClusters = new Set(assignments.filter(id => id !== clusterId));
      let b = Infinity;

      for (const otherId of otherClusters) {
        const otherCluster = embeddings.filter((_, idx) => assignments[idx] === otherId);
        const avgDist = otherCluster.reduce(
          (sum, emb) => sum + this.euclideanDistance(embeddings[i].vector, emb.vector),
          0
        ) / otherCluster.length;

        b = Math.min(b, avgDist);
      }

      // Silhouette score for point i
      const s = (b - a) / Math.max(a, b);
      totalScore += s;
    }

    return totalScore / embeddings.length;
  }

  private estimateOptimalClusters(embeddings: Embedding[]): number {
    // Use elbow method heuristic
    const n = embeddings.length;
    return Math.min(Math.max(Math.floor(Math.sqrt(n / 2)), this.defaultMinClusters), this.defaultMaxClusters);
  }

  private weightedRandomChoice(probabilities: number[]): number {
    const random = Math.random();
    let sum = 0;

    for (let i = 0; i < probabilities.length; i++) {
      sum += probabilities[i];
      if (random <= sum) {
        return i;
      }
    }

    return probabilities.length - 1;
  }

  private arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  private handleError(error: unknown, message: string): ClusteringError {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      name: 'ClusteringError',
      message: `${message}: ${errorMessage}`,
      code: 'CLUSTERING_ERROR',
      statusCode: 500,
      details: error,
    } as ClusteringError;
  }
}
