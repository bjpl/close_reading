/**
 * Ruvector Service Type Definitions
 *
 * Complete TypeScript interfaces for 5 Ruvector services:
 * 1. VectorService - Embedding storage and similarity search
 * 2. GraphService - Cypher query graph database
 * 3. RAGService - Retrieval-Augmented Generation with AI
 * 4. EntityService - Entity persistence and retrieval
 * 5. ClusterService - GNN-based clustering
 */

// ============================================================================
// Core Configuration Types
// ============================================================================

export interface RuvectorConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  rateLimitPerMinute?: number;
  cacheEnabled?: boolean;
  cacheTtl?: number;
}

export interface RuvectorClientConfig extends RuvectorConfig {
  services?: {
    vector?: boolean;
    graph?: boolean;
    rag?: boolean;
    entity?: boolean;
    cluster?: boolean;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export class RuvectorError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'RuvectorError';
  }
}

export class VectorOperationError extends RuvectorError {
  constructor(message: string, details?: unknown) {
    super(message, 'VECTOR_OPERATION_ERROR', 500, details);
    this.name = 'VectorOperationError';
  }
}

export class GraphQueryError extends RuvectorError {
  constructor(message: string, details?: unknown) {
    super(message, 'GRAPH_QUERY_ERROR', 500, details);
    this.name = 'GraphQueryError';
  }
}

export class RAGError extends RuvectorError {
  constructor(message: string, details?: unknown) {
    super(message, 'RAG_ERROR', 500, details);
    this.name = 'RAGError';
  }
}

export class EntityNotFoundError extends RuvectorError {
  constructor(entityId: string) {
    super(`Entity not found: ${entityId}`, 'ENTITY_NOT_FOUND', 404);
    this.name = 'EntityNotFoundError';
  }
}

export class ClusteringError extends RuvectorError {
  constructor(message: string, details?: unknown) {
    super(message, 'CLUSTERING_ERROR', 500, details);
    this.name = 'ClusteringError';
  }
}

// ============================================================================
// Vector Service Types
// ============================================================================

export interface Embedding {
  id: string;
  vector: number[];
  text: string;
  metadata?: Record<string, unknown>;
  documentId?: string;
  paragraphId?: string;
  created_at?: string;
}

export interface VectorSearchOptions {
  topK?: number;
  minSimilarity?: number;
  includeMetadata?: boolean;
  filter?: Record<string, unknown>;
  namespace?: string;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  text: string;
  metadata?: Record<string, unknown>;
  distance?: number;
}

export interface VectorUpsertOptions {
  namespace?: string;
  metadata?: Record<string, unknown>;
  batchSize?: number;
}

export interface VectorUpsertResult {
  upsertedCount: number;
  ids: string[];
  errors?: Array<{ id: string; error: string }>;
}

export interface VectorDeleteOptions {
  namespace?: string;
  deleteAll?: boolean;
  filter?: Record<string, unknown>;
}

export interface VectorStats {
  totalVectors: number;
  dimensions: number;
  namespaces: string[];
  storageSize?: string;
}

// ============================================================================
// Graph Service Types
// ============================================================================

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphRelationship {
  id: string;
  type: string;
  startNode: string;
  endNode: string;
  properties: Record<string, unknown>;
}

export interface GraphQueryResult {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  metadata?: {
    executionTime?: number;
    rowCount?: number;
  };
}

export interface CypherQueryOptions {
  parameters?: Record<string, unknown>;
  timeout?: number;
  readOnly?: boolean;
}

export interface GraphPath {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  length: number;
}

export interface GraphTraversalOptions {
  maxDepth?: number;
  relationshipTypes?: string[];
  direction?: 'outgoing' | 'incoming' | 'both';
  limit?: number;
}

export interface GraphPattern {
  nodePattern?: {
    labels?: string[];
    properties?: Record<string, unknown>;
  };
  relationshipPattern?: {
    type?: string;
    properties?: Record<string, unknown>;
  };
}

// ============================================================================
// RAG Service Types
// ============================================================================

export interface RAGContext {
  chunks: Array<{
    text: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>;
  documentIds: string[];
  totalChunks: number;
}

export interface RAGQueryOptions {
  topK?: number;
  minRelevance?: number;
  includeContext?: boolean;
  rerank?: boolean;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface RAGQueryResult {
  answer: string;
  context: RAGContext;
  confidence: number;
  sources: Array<{
    documentId: string;
    paragraphId?: string;
    text: string;
    relevance: number;
  }>;
  metadata?: {
    tokensUsed?: number;
    retrievalTime?: number;
    generationTime?: number;
  };
}

export interface RAGIndexOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  namespace?: string;
  metadata?: Record<string, unknown>;
}

export interface RAGDocument {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
  chunks?: Array<{
    id: string;
    text: string;
    position: number;
  }>;
}

export interface RAGRerankerConfig {
  model?: string;
  threshold?: number;
  maxCandidates?: number;
}

// ============================================================================
// Entity Service Types
// ============================================================================

export interface Entity {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  embedding?: number[];
  documentId?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EntityQueryOptions {
  type?: string;
  filters?: Record<string, unknown>;
  includeEmbeddings?: boolean;
  limit?: number;
  offset?: number;
}

export interface EntityCreateOptions {
  generateEmbedding?: boolean;
  metadata?: Record<string, unknown>;
}

export interface EntityUpdateOptions {
  regenerateEmbedding?: boolean;
  mergeProperties?: boolean;
}

export interface EntityRelationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: string;
  strength?: number;
  properties?: Record<string, unknown>;
  created_at?: string;
}

export interface EntitySearchOptions extends VectorSearchOptions {
  type?: string;
  semanticSearch?: boolean;
}

export interface EntitySearchResult {
  entity: Entity;
  score: number;
  distance?: number;
}

export interface EntityBatchOperation {
  operation: 'create' | 'update' | 'delete';
  entity: Partial<Entity>;
}

export interface EntityBatchResult {
  succeeded: number;
  failed: number;
  errors?: Array<{
    entity: Partial<Entity>;
    error: string;
  }>;
}

// ============================================================================
// Cluster Service Types
// ============================================================================

export interface ClusterConfig {
  algorithm?: 'kmeans' | 'hierarchical' | 'dbscan' | 'gnn';
  numClusters?: number;
  minSimilarity?: number;
  maxIterations?: number;
  gnnConfig?: GNNConfig;
}

export interface GNNConfig {
  layers?: number;
  hiddenDimensions?: number;
  activationFunction?: 'relu' | 'tanh' | 'sigmoid';
  dropoutRate?: number;
  learningRate?: number;
  epochs?: number;
}

export interface Cluster {
  id: string;
  members: string[];
  centroid?: number[];
  size: number;
  cohesion: number;
  label?: string;
  properties?: Record<string, unknown>;
}

export interface ClusteringResult {
  clusters: Cluster[];
  outliers: string[];
  silhouetteScore?: number;
  totalClusters: number;
  metadata?: {
    algorithm: string;
    executionTime?: number;
    convergence?: boolean;
  };
}

export interface ClusterAnalysis {
  clusterId: string;
  statistics: {
    size: number;
    avgSimilarity: number;
    minSimilarity: number;
    maxSimilarity: number;
    variance: number;
  };
  representatives: string[];
  topTerms?: Array<{ term: string; score: number }>;
}

export interface ClusterVisualization {
  nodes: Array<{
    id: string;
    clusterId: string;
    position: { x: number; y: number };
    size: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
  }>;
  clusterCenters: Array<{
    clusterId: string;
    position: { x: number; y: number };
  }>;
}

export interface HierarchicalCluster extends Cluster {
  children?: HierarchicalCluster[];
  parent?: string;
  level: number;
  mergeHeight?: number;
}

export interface GNNClusteringOptions {
  useAttention?: boolean;
  aggregationMethod?: 'mean' | 'max' | 'sum';
  nodeFeatures?: Record<string, number[]>;
  edgeWeights?: boolean;
}

// ============================================================================
// Common Response Types
// ============================================================================

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    requestId?: string;
    timestamp?: string;
    executionTime?: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface BatchOperationResult {
  total: number;
  succeeded: number;
  failed: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

// ============================================================================
// Service Health & Monitoring
// ============================================================================

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    vector?: boolean;
    graph?: boolean;
    rag?: boolean;
    entity?: boolean;
    cluster?: boolean;
  };
  latency?: {
    p50?: number;
    p95?: number;
    p99?: number;
  };
  uptime?: number;
}

export interface ServiceMetrics {
  requestCount: number;
  errorCount: number;
  avgResponseTime: number;
  cacheHitRate?: number;
  activeConnections?: number;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T> {
  key: string;
  value: T;
  ttl: number;
  createdAt: number;
}

export interface CacheOptions {
  ttl?: number;
  namespace?: string;
  compress?: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isRuvectorError(error: unknown): error is RuvectorError {
  return error instanceof RuvectorError;
}

export function isVectorSearchResult(obj: unknown): obj is VectorSearchResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'score' in obj &&
    'text' in obj
  );
}

export function isGraphNode(obj: unknown): obj is GraphNode {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'labels' in obj &&
    'properties' in obj
  );
}

export function isEntity(obj: unknown): obj is Entity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'type' in obj &&
    'name' in obj &&
    'properties' in obj
  );
}

export function isCluster(obj: unknown): obj is Cluster {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'members' in obj &&
    'size' in obj &&
    'cohesion' in obj
  );
}
