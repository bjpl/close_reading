/**
 * VectorService - Ruvector Vector Operations Service
 *
 * Production-ready service for vector embeddings and similarity search with:
 * - Embedding generation and batch processing
 * - Vector upsert, search, and delete operations
 * - Namespace isolation for multi-tenant use
 * - Backward compatibility with similarity.ts
 * - Comprehensive error handling
 * - Local fallback for cosine similarity
 *
 * @module services/ruvector/VectorService
 */

import type { RuvectorClient } from '../client';
import type {
  Embedding,
  VectorSearchOptions,
  VectorSearchResult,
  VectorUpsertOptions,
  VectorUpsertResult,
  VectorDeleteOptions,
  VectorStats,
  ServiceResponse,
} from '../types';
import { VectorOperationError } from '../types';

// ============================================================================
// Type for backward compatibility with similarity.ts
// ============================================================================

export interface EmbeddingVector {
  text: string;
  vector: number[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// VectorService Implementation
// ============================================================================

export class VectorService {
  private readonly DEFAULT_BATCH_SIZE = 50;
  private readonly DEFAULT_TOP_K = 10;
  private readonly DEFAULT_MIN_SIMILARITY = 0.5;

  constructor(private readonly client: RuvectorClient) {
    if (!client) {
      throw new Error('RuvectorClient instance is required');
    }
  }

  // ============================================================================
  // Core Embedding Operations
  // ============================================================================

  /**
   * Generate embedding for a single text
   *
   * @param text - Text to embed
   * @returns Embedding vector
   * @throws {VectorOperationError} If embedding generation fails
   *
   * @example
   * ```typescript
   * const vector = await vectorService.embed("Hello world");
   * console.log(vector.length); // 1536 (for text-embedding-3-small)
   * ```
   */
  async embed(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        throw new VectorOperationError('Text cannot be empty');
      }

      const response = await this.client.request<ServiceResponse<{ embedding: number[] }>>({
        method: 'POST',
        path: '/v1/vector/embed',
        body: { text },
      });

      if (!response.success || !response.data?.embedding) {
        throw new VectorOperationError(
          'Failed to generate embedding',
          response.error
        );
      }

      return response.data.embedding;
    } catch (error) {
      if (error instanceof VectorOperationError) {
        throw error;
      }
      throw new VectorOperationError(
        `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   *
   * @param texts - Array of texts to embed
   * @returns Array of embedding vectors
   * @throws {VectorOperationError} If batch embedding fails
   *
   * @example
   * ```typescript
   * const vectors = await vectorService.embedBatch([
   *   "First paragraph",
   *   "Second paragraph"
   * ]);
   * ```
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      if (!texts || texts.length === 0) {
        return [];
      }

      // Validate all texts
      const validTexts = texts.filter(text => text && text.trim().length > 0);
      if (validTexts.length !== texts.length) {
        throw new VectorOperationError('All texts must be non-empty');
      }

      // Process in batches to avoid overwhelming the API
      const batchSize = this.DEFAULT_BATCH_SIZE;
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const response = await this.client.request<ServiceResponse<{ embeddings: number[][] }>>({
          method: 'POST',
          path: '/v1/vector/embed-batch',
          body: { texts: batch },
        });

        if (!response.success || !response.data?.embeddings) {
          throw new VectorOperationError(
            `Batch embedding failed for batch starting at index ${i}`,
            response.error
          );
        }

        results.push(...response.data.embeddings);
      }

      return results;
    } catch (error) {
      if (error instanceof VectorOperationError) {
        throw error;
      }
      throw new VectorOperationError(
        `Batch embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  // ============================================================================
  // Vector Storage Operations
  // ============================================================================

  /**
   * Upsert embeddings to vector store
   *
   * @param embeddings - Array of embeddings to upsert
   * @param options - Upsert options (namespace, metadata, batchSize)
   * @returns Upsert result with count and IDs
   * @throws {VectorOperationError} If upsert operation fails
   *
   * @example
   * ```typescript
   * const result = await vectorService.upsert([
   *   {
   *     id: "para-1",
   *     vector: [0.1, 0.2, ...],
   *     text: "First paragraph",
   *     metadata: { documentId: "doc-1" }
   *   }
   * ], { namespace: "document-embeddings" });
   * ```
   */
  async upsert(
    embeddings: Embedding[],
    options: VectorUpsertOptions = {}
  ): Promise<VectorUpsertResult> {
    try {
      if (!embeddings || embeddings.length === 0) {
        return {
          upsertedCount: 0,
          ids: [],
        };
      }

      // Validate embeddings
      this.validateEmbeddings(embeddings);

      const {
        namespace,
        metadata = {},
        batchSize = this.DEFAULT_BATCH_SIZE,
      } = options;

      const upsertedIds: string[] = [];
      const errors: Array<{ id: string; error: string }> = [];
      let totalUpserted = 0;

      // Process in batches
      for (let i = 0; i < embeddings.length; i += batchSize) {
        const batch = embeddings.slice(i, i + batchSize);

        try {
          const response = await this.client.request<ServiceResponse<VectorUpsertResult>>({
            method: 'POST',
            path: '/v1/vector/upsert',
            body: {
              embeddings: batch,
              namespace,
              metadata,
            },
          });

          if (!response.success || !response.data) {
            throw new VectorOperationError(
              `Upsert failed for batch starting at index ${i}`,
              response.error
            );
          }

          totalUpserted += response.data.upsertedCount;
          upsertedIds.push(...response.data.ids);

          if (response.data.errors) {
            errors.push(...response.data.errors);
          }
        } catch (error) {
          // Track batch-level errors
          batch.forEach(emb => {
            errors.push({
              id: emb.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });
        }
      }

      return {
        upsertedCount: totalUpserted,
        ids: upsertedIds,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      if (error instanceof VectorOperationError) {
        throw error;
      }
      throw new VectorOperationError(
        `Upsert operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Search for similar vectors
   *
   * @param queryVector - Query vector for similarity search
   * @param options - Search options (topK, minSimilarity, filters, namespace)
   * @returns Array of search results with scores
   * @throws {VectorOperationError} If search operation fails
   *
   * @example
   * ```typescript
   * const results = await vectorService.search(queryVector, {
   *   topK: 5,
   *   minSimilarity: 0.7,
   *   namespace: "document-embeddings",
   *   filter: { documentId: "doc-1" }
   * });
   * ```
   */
  async search(
    queryVector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    try {
      if (!queryVector || queryVector.length === 0) {
        throw new VectorOperationError('Query vector cannot be empty');
      }

      const {
        topK = this.DEFAULT_TOP_K,
        minSimilarity = this.DEFAULT_MIN_SIMILARITY,
        includeMetadata = true,
        filter,
        namespace,
      } = options;

      const response = await this.client.request<ServiceResponse<{ results: VectorSearchResult[] }>>({
        method: 'POST',
        path: '/v1/vector/search',
        body: {
          vector: queryVector,
          topK,
          minSimilarity,
          includeMetadata,
          filter,
          namespace,
        },
      });

      if (!response.success || !response.data?.results) {
        throw new VectorOperationError(
          'Vector search failed',
          response.error
        );
      }

      return response.data.results;
    } catch (error) {
      if (error instanceof VectorOperationError) {
        throw error;
      }
      throw new VectorOperationError(
        `Search operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Delete vectors by IDs
   *
   * @param ids - Array of vector IDs to delete
   * @param options - Delete options (namespace, deleteAll, filter)
   * @throws {VectorOperationError} If delete operation fails
   *
   * @example
   * ```typescript
   * await vectorService.delete(["para-1", "para-2"], {
   *   namespace: "document-embeddings"
   * });
   * ```
   */
  async delete(
    ids: string[],
    options: VectorDeleteOptions = {}
  ): Promise<void> {
    try {
      const { namespace, deleteAll = false, filter } = options;

      if (!deleteAll && (!ids || ids.length === 0)) {
        return; // Nothing to delete
      }

      const response = await this.client.request<ServiceResponse<void>>({
        method: 'DELETE',
        path: '/v1/vector/delete',
        body: {
          ids: deleteAll ? [] : ids,
          namespace,
          deleteAll,
          filter,
        },
      });

      if (!response.success) {
        throw new VectorOperationError(
          'Vector deletion failed',
          response.error
        );
      }
    } catch (error) {
      if (error instanceof VectorOperationError) {
        throw error;
      }
      throw new VectorOperationError(
        `Delete operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  // ============================================================================
  // Advanced Operations
  // ============================================================================

  /**
   * Find similar vectors using text query
   *
   * Combines embedding generation and similarity search
   *
   * @param text - Query text
   * @param options - Search options
   * @returns Array of similar results
   * @throws {VectorOperationError} If operation fails
   *
   * @example
   * ```typescript
   * const similar = await vectorService.findSimilar(
   *   "quantum mechanics",
   *   { topK: 10, namespace: "physics-papers" }
   * );
   * ```
   */
  async findSimilar(
    text: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    try {
      // Generate embedding for query text
      const queryVector = await this.embed(text);

      // Search for similar vectors
      return await this.search(queryVector, options);
    } catch (error) {
      if (error instanceof VectorOperationError) {
        throw error;
      }
      throw new VectorOperationError(
        `Find similar operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Get vector store statistics
   *
   * @param namespace - Optional namespace filter
   * @returns Vector store statistics
   * @throws {VectorOperationError} If stats retrieval fails
   *
   * @example
   * ```typescript
   * const stats = await vectorService.getStats("document-embeddings");
   * console.log(`Total vectors: ${stats.totalVectors}`);
   * ```
   */
  async getStats(namespace?: string): Promise<VectorStats> {
    try {
      const response = await this.client.request<ServiceResponse<VectorStats>>({
        method: 'GET',
        path: '/v1/vector/stats',
        params: namespace ? { namespace } : undefined,
      });

      if (!response.success || !response.data) {
        throw new VectorOperationError(
          'Failed to retrieve vector statistics',
          response.error
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof VectorOperationError) {
        throw error;
      }
      throw new VectorOperationError(
        `Get stats operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Get embeddings by their IDs
   *
   * Batch retrieval of embeddings by ID for clustering and analysis.
   *
   * @param ids - Array of embedding IDs to retrieve
   * @returns Array of embeddings matching the given IDs
   *
   * @example
   * ```typescript
   * const embeddings = await vectorService.getByIds(['emb-1', 'emb-2']);
   * console.log(`Retrieved ${embeddings.length} embeddings`);
   * ```
   */
  async getByIds(ids: string[]): Promise<Embedding[]> {
    if (ids.length === 0) {
      return [];
    }

    try {
      const response = await this.client.request<{ embeddings: Embedding[] }>({
        method: 'POST',
        path: '/v1/vector/batch-get',
        body: { ids },
      });

      return response.embeddings || [];
    } catch (error) {
      throw new VectorOperationError(
        `Batch get operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  // ============================================================================
  // Backward Compatibility Helpers
  // ============================================================================

  /**
   * Migrate embeddings from similarity.ts format to Ruvector
   *
   * Provides backward compatibility for existing code using Map<string, EmbeddingVector>
   *
   * @param embeddings - Map of embeddings in old format
   * @returns Upsert result
   * @throws {VectorOperationError} If migration fails
   *
   * @example
   * ```typescript
   * const oldEmbeddings = new Map([
   *   ["para-1", { text: "...", vector: [...] }],
   *   ["para-2", { text: "...", vector: [...] }]
   * ]);
   * const result = await vectorService.migrateFromSimilarity(oldEmbeddings);
   * ```
   */
  async migrateFromSimilarity(
    embeddings: Map<string, EmbeddingVector>
  ): Promise<VectorUpsertResult> {
    try {
      if (!embeddings || embeddings.size === 0) {
        return {
          upsertedCount: 0,
          ids: [],
        };
      }

      // Convert to Ruvector format
      const ruvectorEmbeddings: Embedding[] = Array.from(embeddings.entries()).map(
        ([id, embedding]) => ({
          id,
          vector: embedding.vector,
          text: embedding.text,
          metadata: embedding.metadata || {},
        })
      );

      // Upsert to Ruvector
      return await this.upsert(ruvectorEmbeddings, {
        namespace: 'migrated-similarity',
        metadata: {
          source: 'similarity-service',
          migratedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      throw new VectorOperationError(
        `Migration from similarity format failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Calculate cosine similarity between two vectors (local fallback)
   *
   * Provides backward compatibility with similarity.ts
   * Returns value between -1 and 1:
   * - 1 = identical vectors
   * - 0 = orthogonal vectors
   * - -1 = opposite vectors
   *
   * @param vecA - First vector
   * @param vecB - Second vector
   * @returns Cosine similarity score
   *
   * @example
   * ```typescript
   * const similarity = vectorService.cosineSimilarity(vec1, vec2);
   * console.log(similarity); // 0.95
   * ```
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB) {
      throw new Error('Both vectors are required');
    }

    if (vecA.length !== vecB.length) {
      throw new Error(
        `Vectors must have the same length (got ${vecA.length} and ${vecB.length})`
      );
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

    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Validate embedding objects
   */
  private validateEmbeddings(embeddings: Embedding[]): void {
    for (const embedding of embeddings) {
      if (!embedding.id) {
        throw new VectorOperationError('Embedding ID is required');
      }

      if (!embedding.vector || !Array.isArray(embedding.vector)) {
        throw new VectorOperationError(
          `Invalid vector for embedding ${embedding.id}`
        );
      }

      if (embedding.vector.length === 0) {
        throw new VectorOperationError(
          `Empty vector for embedding ${embedding.id}`
        );
      }

      if (!embedding.text) {
        throw new VectorOperationError(
          `Text is required for embedding ${embedding.id}`
        );
      }

      // Validate vector contains numbers
      if (!embedding.vector.every(v => typeof v === 'number' && !isNaN(v))) {
        throw new VectorOperationError(
          `Vector must contain only valid numbers for embedding ${embedding.id}`
        );
      }
    }

    // Validate all vectors have the same dimensions
    const firstDimension = embeddings[0].vector.length;
    const allSameDimension = embeddings.every(
      emb => emb.vector.length === firstDimension
    );

    if (!allSameDimension) {
      throw new VectorOperationError(
        'All embeddings must have vectors of the same dimension'
      );
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create VectorService instance
 *
 * @param client - RuvectorClient instance
 * @returns VectorService instance
 *
 * @example
 * ```typescript
 * import { getRuvectorClient } from './client';
 * import { createVectorService } from './VectorService';
 *
 * const client = getRuvectorClient({ apiKey: 'rv_...' });
 * const vectorService = createVectorService(client);
 * ```
 */
export function createVectorService(client: RuvectorClient): VectorService {
  return new VectorService(client);
}
