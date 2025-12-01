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
// Service Exports
// ============================================================================

export { VectorService } from './core/VectorService';
export { GraphService } from './core/GraphService';
export { RAGService } from './core/RAGService';
export { EntityService } from './core/EntityService';
export { ClusterService } from './core/ClusterService';

// Export service factory
export {
  RuvectorServiceFactory,
  type RuvectorServices,
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

  // RAG Service
  RAGContext,
  RAGQueryOptions,
  RAGQueryResult,
  RAGIndexOptions,
  RAGDocument,

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
  Cluster,
  ClusteringResult,
  ClusterAnalysis,
  HierarchicalCluster,
  GNNClusteringOptions,

  // Common
  ServiceResponse,
  PaginatedResponse,
  BatchOperationResult,
  ServiceHealth,
  ServiceMetrics,
  CacheEntry,
} from './types';

// ============================================================================
// Constants
// ============================================================================

export const RUVECTOR_DEFAULTS = {
  BASE_URL: 'http://localhost:8080',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  RATE_LIMIT_PER_MINUTE: 60,
  CACHE_TTL: 300000,
  MAX_BATCH_SIZE: 100,
  DEFAULT_TOP_K: 10,
  MIN_SIMILARITY: 0.7,
  DEFAULT_CHUNK_SIZE: 512,
  DEFAULT_CHUNK_OVERLAP: 50,
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

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
 * Normalize vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(
    vector.reduce((sum, val) => sum + val * val, 0)
  );
  return magnitude === 0 ? vector : vector.map(val => val / magnitude);
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
 * Estimate token count for text
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export const VERSION = '1.0.0';
