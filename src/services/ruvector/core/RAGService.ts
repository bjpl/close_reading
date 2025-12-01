/**
 * RAG Service - Retrieval-Augmented Generation
 *
 * Production-ready RAG implementation with:
 * - Document indexing with configurable chunking
 * - Semantic search with reranking
 * - Context assembly optimized for Claude's token limits
 * - Source citation tracking
 * - Batch operations with error recovery
 *
 * Integration Pattern:
 * - Uses RuvectorClient for API communication
 * - Coordinates with VectorService for embeddings
 * - Optimizes prompts for ClaudeService consumption
 */

import type { RuvectorClient } from './client';
import type {
  RAGDocument,
  RAGIndexOptions,
  RAGQueryOptions,
  RAGContext,
  RAGRerankerConfig,
  VectorSearchResult,
  VectorSearchOptions,
  BatchOperationResult,
  Embedding,
} from './types';
import { RAGError } from './types';
import { chunkText, estimateTokenCount, RUVECTOR_DEFAULTS } from './index';

// ============================================================================
// Constants
// ============================================================================

const CLAUDE_TOKEN_LIMITS = {
  'claude-sonnet-4-20250514': 200_000,
  'claude-sonnet-4.5-20250929': 200_000,
  'claude-3-5-sonnet-20241022': 200_000,
  'claude-3-opus': 200_000,
  'claude-3-sonnet': 200_000,
  'claude-3-haiku': 200_000,
} as const;

const DEFAULT_CONTEXT_TOKEN_BUDGET = 8000; // Conservative default
const DEFAULT_RERANK_CANDIDATES = 20;
const DEFAULT_FINAL_TOP_K = 5;

// ============================================================================
// Vector Service Stub (will be replaced by full implementation)
// ============================================================================

export class VectorService {
  constructor(private client: RuvectorClient) {}

  async embed(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.request<{ embeddings: number[][] }>({
        method: 'POST',
        path: '/v1/vector/embed',
        body: { texts },
      });
      return response.embeddings;
    } catch (error) {
      throw new RAGError('Failed to generate embeddings', { error });
    }
  }

  async upsert(
    embeddings: Embedding[],
    options?: { namespace?: string; batchSize?: number }
  ): Promise<{ upsertedCount: number; ids: string[] }> {
    try {
      const response = await this.client.request<{
        upsertedCount: number;
        ids: string[];
      }>({
        method: 'POST',
        path: '/v1/vector/upsert',
        body: { embeddings, namespace: options?.namespace },
      });
      return response;
    } catch (error) {
      throw new RAGError('Failed to upsert vectors', { error });
    }
  }

  async search(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    try {
      // Generate query embedding
      const [queryEmbedding] = await this.embed([query]);

      const response = await this.client.request<{ results: VectorSearchResult[] }>({
        method: 'POST',
        path: '/v1/vector/search',
        body: {
          vector: queryEmbedding,
          topK: options.topK || RUVECTOR_DEFAULTS.DEFAULT_TOP_K,
          minSimilarity: options.minSimilarity || RUVECTOR_DEFAULTS.MIN_SIMILARITY,
          includeMetadata: options.includeMetadata ?? true,
          filter: options.filter,
          namespace: options.namespace,
        },
      });

      return response.results;
    } catch (error) {
      throw new RAGError('Vector search failed', { error });
    }
  }

  async delete(ids: string[], options?: { namespace?: string }): Promise<void> {
    try {
      await this.client.request({
        method: 'DELETE',
        path: '/v1/vector/delete',
        body: { ids, namespace: options?.namespace },
      });
    } catch (error) {
      throw new RAGError('Failed to delete vectors', { error });
    }
  }
}

// ============================================================================
// Main RAG Service
// ============================================================================

export class RAGService {
  private vectorService: VectorService;

  constructor(
    private client: RuvectorClient,
    vectorService?: VectorService
  ) {
    this.vectorService = vectorService || new VectorService(client);
  }

  // ==========================================================================
  // Document Indexing
  // ==========================================================================

  /**
   * Index a single document with chunking and embedding
   */
  async indexDocument(
    document: RAGDocument,
    options: RAGIndexOptions = {}
  ): Promise<void> {
    try {
      const {
        chunkSize = RUVECTOR_DEFAULTS.DEFAULT_CHUNK_SIZE,
        chunkOverlap = RUVECTOR_DEFAULTS.DEFAULT_CHUNK_OVERLAP,
        namespace,
        metadata = {},
      } = options;

      // If document already has chunks, use them; otherwise create chunks
      const chunks =
        document.chunks ||
        this.createChunks(document.text, chunkSize, chunkOverlap).map(
          (text, index) => ({
            id: `${document.id}-chunk-${index}`,
            text,
            position: index,
          })
        );

      // Generate embeddings for all chunks
      const texts = chunks.map((chunk) => chunk.text);
      const embeddings = await this.vectorService.embed(texts);

      // Prepare embeddings for upsert
      const embeddingsToUpsert: Embedding[] = chunks.map((chunk, index) => ({
        id: chunk.id,
        vector: embeddings[index],
        text: chunk.text,
        metadata: {
          ...metadata,
          documentId: document.id,
          position: chunk.position,
          chunkId: chunk.id,
          totalChunks: chunks.length,
          ...document.metadata,
        },
        documentId: document.id,
      }));

      // Upsert to vector store
      await this.vectorService.upsert(embeddingsToUpsert, { namespace });
    } catch (error) {
      throw new RAGError(`Failed to index document ${document.id}`, { error });
    }
  }

  /**
   * Index multiple documents in batch with error recovery
   */
  async indexDocuments(
    documents: RAGDocument[],
    options: RAGIndexOptions = {}
  ): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      total: documents.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < documents.length; i++) {
      try {
        await this.indexDocument(documents[i], options);
        result.succeeded++;
      } catch (error) {
        result.failed++;
        result.errors?.push({
          index: i,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return result;
  }

  /**
   * Remove document and all its chunks from the index
   */
  async removeDocument(documentId: string): Promise<void> {
    try {
      // Find all chunks belonging to this document
      const searchResults = await this.vectorService.search('', {
        filter: { documentId },
        topK: 1000, // Get all chunks
      });

      // Delete all chunk embeddings
      const chunkIds = searchResults.map((result) => result.id);
      if (chunkIds.length > 0) {
        await this.vectorService.delete(chunkIds);
      }
    } catch (error) {
      throw new RAGError(`Failed to remove document ${documentId}`, { error });
    }
  }

  // ==========================================================================
  // Context Retrieval
  // ==========================================================================

  /**
   * Retrieve relevant context chunks for a query
   */
  async retrieveContext(
    query: string,
    options: RAGQueryOptions = {}
  ): Promise<RAGContext> {
    try {
      const {
        topK = DEFAULT_FINAL_TOP_K,
        minRelevance = 0.7,
        rerank = true,
      } = options;

      // Get initial candidates (more than needed for reranking)
      const candidateCount = rerank ? DEFAULT_RERANK_CANDIDATES : topK;
      const searchResults = await this.vectorService.search(query, {
        topK: candidateCount,
        minSimilarity: minRelevance,
        includeMetadata: true,
      });

      // Apply reranking if enabled
      let finalResults = searchResults;
      if (rerank && searchResults.length > topK) {
        finalResults = await this.rerankResults(query, searchResults);
        finalResults = finalResults.slice(0, topK);
      }

      // Build context from results
      const chunks = finalResults.map((result) => ({
        text: result.text,
        score: result.score,
        metadata: result.metadata,
      }));

      const documentIds = Array.from(
        new Set(
          finalResults
            .map((r) => r.metadata?.documentId as string)
            .filter(Boolean)
        )
      );

      return {
        chunks,
        documentIds,
        totalChunks: chunks.length,
      };
    } catch (error) {
      throw new RAGError('Failed to retrieve context', { error });
    }
  }

  /**
   * Retrieve context for a question from specific documents
   */
  async retrieveContextForQuestion(
    question: string,
    documentIds: string[]
  ): Promise<RAGContext> {
    try {
      const searchResults = await this.vectorService.search(question, {
        filter: { documentId: { $in: documentIds } },
        topK: DEFAULT_FINAL_TOP_K,
        includeMetadata: true,
      });

      const chunks = searchResults.map((result) => ({
        text: result.text,
        score: result.score,
        metadata: result.metadata,
      }));

      return {
        chunks,
        documentIds,
        totalChunks: chunks.length,
      };
    } catch (error) {
      throw new RAGError('Failed to retrieve context for question', { error });
    }
  }

  // ==========================================================================
  // RAG Query Preparation
  // ==========================================================================

  /**
   * Prepare complete prompt with retrieved context for Claude
   */
  async preparePrompt(
    query: string,
    options: RAGQueryOptions = {}
  ): Promise<{
    systemPrompt: string;
    userPrompt: string;
    context: RAGContext;
  }> {
    try {
      // Retrieve context
      const context = await this.retrieveContext(query, options);

      // Format context with citations
      const formattedContext = this.formatContextForClaude(context);

      // Build system prompt
      const systemPrompt =
        options.systemPrompt ||
        `You are a helpful assistant that answers questions based on the provided context.
Always cite your sources using the [Source X] format when referencing information from the context.
If the context doesn't contain enough information to fully answer the question, acknowledge this limitation.`;

      // Build user prompt with context and query
      const userPrompt = `Context:
${formattedContext}

Question: ${query}

Please provide a comprehensive answer based on the context above, citing specific sources.`;

      return {
        systemPrompt,
        userPrompt,
        context,
      };
    } catch (error) {
      throw new RAGError('Failed to prepare prompt', { error });
    }
  }

  // ==========================================================================
  // Reranking
  // ==========================================================================

  /**
   * Rerank search results for improved relevance
   */
  async rerankResults(
    query: string,
    results: VectorSearchResult[],
    config: RAGRerankerConfig = {}
  ): Promise<VectorSearchResult[]> {
    try {
      const {
        model = 'cross-encoder',
        threshold = 0.5,
        maxCandidates = DEFAULT_RERANK_CANDIDATES,
      } = config;

      // Limit candidates
      const candidates = results.slice(0, maxCandidates);

      // Call reranking API
      const response = await this.client.request<{
        results: Array<{ index: number; score: number }>;
      }>({
        method: 'POST',
        path: '/v1/rag/rerank',
        body: {
          query,
          documents: candidates.map((r) => r.text),
          model,
        },
      });

      // Apply reranking scores
      const reranked = response.results
        .map((item) => ({
          ...candidates[item.index],
          score: item.score,
        }))
        .filter((result) => result.score >= threshold)
        .sort((a, b) => b.score - a.score);

      return reranked;
    } catch (error) {
      // Fallback: return original results if reranking fails
      console.warn('Reranking failed, using original scores:', error);
      return results;
    }
  }

  // ==========================================================================
  // Claude Integration Utilities
  // ==========================================================================

  /**
   * Get optimal context window size based on Claude model and token budget
   */
  getOptimalContextWindow(
    tokenBudget: number = DEFAULT_CONTEXT_TOKEN_BUDGET,
    model: keyof typeof CLAUDE_TOKEN_LIMITS = 'claude-sonnet-4-20250514'
  ): number {
    const modelLimit = CLAUDE_TOKEN_LIMITS[model] || 200_000;

    // Reserve tokens for:
    // - System prompt: ~500 tokens
    // - User query: ~200 tokens
    // - Response: ~2000 tokens
    // - Safety margin: 10%
    const reservedTokens = 500 + 200 + 2000;
    const safetyMargin = 0.1;

    const availableTokens = Math.min(
      tokenBudget,
      modelLimit - reservedTokens
    );

    return Math.floor(availableTokens * (1 - safetyMargin));
  }

  /**
   * Format context with source citations optimized for Claude
   */
  formatContextForClaude(context: RAGContext): string {
    const sections: string[] = [];

    context.chunks.forEach((chunk, index) => {
      const sourceNum = index + 1;
      const documentId = chunk.metadata?.documentId || 'Unknown';
      const position = chunk.metadata?.position ?? index;

      sections.push(
        `[Source ${sourceNum}] (Document: ${documentId}, Position: ${position}, Relevance: ${(chunk.score * 100).toFixed(1)}%)
${chunk.text}
`
      );
    });

    return sections.join('\n---\n\n');
  }

  /**
   * Assemble context within token budget
   */
  assembleContextWithinBudget(
    chunks: Array<{ text: string; score: number; metadata?: Record<string, unknown> }>,
    tokenBudget: number
  ): RAGContext {
    const assembled: typeof chunks = [];
    let currentTokens = 0;

    // Sort by relevance score
    const sortedChunks = [...chunks].sort((a, b) => b.score - a.score);

    for (const chunk of sortedChunks) {
      const chunkTokens = estimateTokenCount(chunk.text);

      // Include chunk if it fits within budget
      if (currentTokens + chunkTokens <= tokenBudget) {
        assembled.push(chunk);
        currentTokens += chunkTokens;
      } else {
        break;
      }
    }

    const documentIds = Array.from(
      new Set(
        assembled
          .map((chunk) => chunk.metadata?.documentId as string)
          .filter(Boolean)
      )
    );

    return {
      chunks: assembled,
      documentIds,
      totalChunks: assembled.length,
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Create text chunks with configurable size and overlap
   */
  private createChunks(
    text: string,
    chunkSize: number,
    overlap: number
  ): string[] {
    // Simple chunking by words with overlap
    const chunks: string[] = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Validate document before indexing
   */
  private validateDocument(document: RAGDocument): void {
    if (!document.id || !document.text) {
      throw new RAGError('Document must have id and text fields');
    }

    if (document.text.length === 0) {
      throw new RAGError('Document text cannot be empty');
    }

    if (document.chunks) {
      for (const chunk of document.chunks) {
        if (!chunk.id || !chunk.text || chunk.position === undefined) {
          throw new RAGError(
            'Chunk must have id, text, and position fields'
          );
        }
      }
    }
  }

  /**
   * Calculate relevance score based on multiple factors
   */
  private calculateRelevance(
    result: VectorSearchResult,
    query: string
  ): number {
    // Base score from vector similarity
    let score = result.score;

    // Boost for exact keyword matches
    const queryLower = query.toLowerCase();
    const textLower = result.text.toLowerCase();
    const keywords = queryLower.split(/\s+/);
    const matchedKeywords = keywords.filter((kw) =>
      textLower.includes(kw)
    ).length;
    const keywordBoost = matchedKeywords / keywords.length;

    // Weighted combination
    score = score * 0.7 + keywordBoost * 0.3;

    return Math.min(score, 1.0);
  }

  // ==========================================================================
  // Statistics & Monitoring
  // ==========================================================================

  /**
   * Get index statistics for a namespace
   */
  async getIndexStats(namespace?: string): Promise<{
    totalDocuments: number;
    totalChunks: number;
    avgChunksPerDocument: number;
  }> {
    try {
      // Get all embeddings in namespace
      const allResults = await this.vectorService.search('', {
        topK: 10000,
        namespace,
        includeMetadata: true,
      });

      const documentIds = new Set(
        allResults
          .map((r) => r.metadata?.documentId as string)
          .filter(Boolean)
      );

      return {
        totalDocuments: documentIds.size,
        totalChunks: allResults.length,
        avgChunksPerDocument:
          documentIds.size > 0 ? allResults.length / documentIds.size : 0,
      };
    } catch (error) {
      throw new RAGError('Failed to get index stats', { error });
    }
  }

  /**
   * Health check for RAG service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Test basic search functionality
      await this.vectorService.search('health check', { topK: 1 });

      return {
        status: 'healthy',
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export default RAGService;
