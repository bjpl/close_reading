/**
 * Ruvector Services - Public API
 *
 * Centralized exports for all Ruvector integration services.
 *
 * Services:
 * - VectorService: Embedding storage and similarity search
 * - GraphService: Cypher-based graph database operations
 * - RAGService: Retrieval-Augmented Generation with AI
 * - EntityService: Entity persistence and semantic search
 * - ClusterService: GNN-based clustering and analysis
 *
 * Usage:
 * ```typescript
 * import { getRuvectorClient, VectorService, GraphService } from './services/ruvector';
 *
 * // Initialize client
 * const client = getRuvectorClient({
 *   apiKey: 'rv_...',
 *   baseUrl: 'https://api.ruvector.ai',
 * });
 *
 * // Use services
 * const vectorService = new VectorService(client);
 * await vectorService.upsert([{ id: '1', vector: [...], text: '...' }]);
 * ```
 */

// ============================================================================
// Client Exports
// ============================================================================

export {
  RuvectorClient,
  getRuvectorClient,
  resetRuvectorClient,
} from './client';

// ============================================================================
// Service Exports (will be implemented by other agents)
// ============================================================================

// Export service classes
export { VectorService } from './core/VectorService';
export { GraphService } from './core/GraphService';
export { RAGService } from './core/RAGService';
export { EntityService } from './core/EntityService';
export { ClusterService } from './core/ClusterService';

// Export adapters for backward compatibility
export {
  SimilarityAdapter,
  ParagraphLinksAdapter,
} from './adapters';

export type {
  SimilarityConfig,
  SimilarParagraph,
  SimilarityPair,
  SimilarityCluster,
  ParagraphLink,
  LinkConfig,
  ParagraphGraph,
} from './adapters';

// Export enhanced Claude service
export {
  RAGEnhancedClaudeService,
  type RAGEnhancementConfig,
} from './RAGEnhancedClaudeService';

// Export service factory
export {
  RuvectorServiceFactory,
  type RuvectorServices,
  type RuvectorServicesWithClaude,
} from './ServiceFactory';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Configuration
  RuvectorConfig,
  RuvectorClientConfig,

  // Errors
  RuvectorError,
  VectorOperationError,
  GraphQueryError,
  RAGError,
  EntityNotFoundError,
  ClusteringError,

  // Vector Service
  Embedding,
  VectorSearchOptions,
  VectorSearchResult,
  VectorUpsertOptions,
  VectorUpsertResult,
  VectorDeleteOptions,
  VectorStats,

  // Graph Service
  GraphNode,
  GraphRelationship,
  GraphQueryResult,
  CypherQueryOptions,
  GraphPath,
  GraphTraversalOptions,
  GraphPattern,

  // RAG Service
  RAGContext,
  RAGQueryOptions,
  RAGQueryResult,
  RAGIndexOptions,
  RAGDocument,
  RAGRerankerConfig,

  // Entity Service
  Entity,
  EntityQueryOptions,
  EntityCreateOptions,
  EntityUpdateOptions,
  EntityRelationship,
  EntitySearchOptions,
  EntitySearchResult,
  EntityBatchOperation,
  EntityBatchResult,

  // Cluster Service
  ClusterConfig,
  GNNConfig,
  Cluster,
  ClusteringResult,
  ClusterAnalysis,
  ClusterVisualization,
  HierarchicalCluster,
  GNNClusteringOptions,

  // Common
  ServiceResponse,
  PaginatedResponse,
  BatchOperationResult,
  ServiceHealth,
  ServiceMetrics,
  CacheEntry,
  CacheOptions,
} from './types';

// ============================================================================
// Type Guards
// ============================================================================

export {
  isRuvectorError,
  isVectorSearchResult,
  isGraphNode,
  isEntity,
  isCluster,
} from './types';

// ============================================================================
// Constants
// ============================================================================

export const RUVECTOR_DEFAULTS = {
  BASE_URL: 'https://api.ruvector.ai',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  RATE_LIMIT_PER_MINUTE: 60,
  CACHE_TTL: 300000, // 5 minutes
  MAX_BATCH_SIZE: 100,
  DEFAULT_TOP_K: 10,
  MIN_SIMILARITY: 0.7,
  DEFAULT_CHUNK_SIZE: 512,
  DEFAULT_CHUNK_OVERLAP: 50,
} as const;

export const VECTOR_DIMENSIONS = {
  OPENAI_ADA_002: 1536,
  OPENAI_EMBEDDING_3_SMALL: 1536,
  OPENAI_EMBEDDING_3_LARGE: 3072,
  CLAUDE: 768,
  BERT_BASE: 768,
  BERT_LARGE: 1024,
} as const;

export const GRAPH_RELATIONSHIP_TYPES = {
  RELATED: 'RELATED_TO',
  SUPPORTS: 'SUPPORTS',
  CONTRASTS: 'CONTRASTS',
  ELABORATES: 'ELABORATES',
  QUOTES: 'QUOTES',
  MENTIONS: 'MENTIONS',
  CONTAINS: 'CONTAINS',
  FOLLOWS: 'FOLLOWS',
  PRECEDES: 'PRECEDES',
} as const;

export const ENTITY_TYPES = {
  PARAGRAPH: 'Paragraph',
  DOCUMENT: 'Document',
  ANNOTATION: 'Annotation',
  THEME: 'Theme',
  CONCEPT: 'Concept',
  PERSON: 'Person',
  ORGANIZATION: 'Organization',
  LOCATION: 'Location',
  EVENT: 'Event',
} as const;

export const CLUSTERING_ALGORITHMS = {
  KMEANS: 'kmeans',
  HIERARCHICAL: 'hierarchical',
  DBSCAN: 'dbscan',
  GNN: 'gnn',
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate vector dimensions match expected size
 */
export function validateVectorDimensions(
  vector: number[],
  expectedDimensions: number
): boolean {
  return vector.length === expectedDimensions;
}

/**
 * Normalize vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(
    vector.reduce((sum, val) => sum + val * val, 0)
  );
  return magnitude === 0 ? vector : vector.map(val => val / magnitude);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
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

/**
 * Build namespace key for multi-tenant isolation
 */
export function buildNamespaceKey(
  userId: string,
  projectId?: string,
  documentId?: string
): string {
  const parts = [userId];
  if (projectId) parts.push(projectId);
  if (documentId) parts.push(documentId);
  return parts.join(':');
}

/**
 * Chunk text into smaller pieces for embedding
 */
export function chunkText(
  text: string,
  chunkSize = RUVECTOR_DEFAULTS.DEFAULT_CHUNK_SIZE,
  overlap = RUVECTOR_DEFAULTS.DEFAULT_CHUNK_OVERLAP
): string[] {
  const chunks: string[] = [];
  const words = text.split(/\s+/);

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push(chunk);
  }

  return chunks;
}

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokenCount(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Format error message from Ruvector API
 */
export function formatRuvectorError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as { message?: string; code?: string };
    return err.message || err.code || 'Unknown error';
  }
  return String(error);
}

// ============================================================================
// Version Info
// ============================================================================

export const VERSION = '1.0.0';
export const SDK_NAME = 'close-reading-ruvector-sdk';
