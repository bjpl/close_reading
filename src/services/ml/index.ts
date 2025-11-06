/**
 * ML Services Barrel Export
 *
 * Provides a unified interface for all ML-related services:
 * - Embeddings generation
 * - Similarity calculation
 * - Caching
 * - Link suggestions
 */

export {
  EmbeddingService,
  getEmbeddingService,
  type EmbeddingVector,
  type BatchEmbeddingResult
} from './embeddings';

export {
  EmbeddingCache,
  type CacheStats
} from './cache';

export {
  cosineSimilarity,
  calculateSimilarities,
  findSimilarParagraphs,
  calculateSimilarityMatrix,
  clusterBySimilarity,
  getSimilarityStats,
  type SimilarityResult,
  type SimilarityOptions,
  type Cluster,
  type SimilarityStats
} from './similarity';

export {
  LinkSuggestionsService,
  getLinkSuggestionsService,
  type LinkSuggestion,
  type SuggestionOptions
} from './linkSuggestions';
