/**
 * Semantic Search Service
 *
 * Provides intelligent semantic search across documents using ONNX embeddings.
 * Enables searching by meaning rather than exact keywords.
 *
 * Features:
 * - Semantic similarity search
 * - Cross-document linking
 * - Similar passage finding
 * - Query expansion
 * - Ranked results
 *
 * @module SemanticSearchService
 */

import { getOnnxEmbeddingService } from './OnnxEmbeddingService';
import { getVectorStore } from './VectorStore';

/**
 * Semantic search result with context
 */
export interface SearchResult {
  id: string;
  documentId: string;
  paragraphId?: string;
  text: string;
  similarity: number;
  rank: number;
  snippet: string;
  metadata: Record<string, unknown>;
}

/**
 * Search options
 */
export interface SearchOptions {
  documentId?: string;
  threshold?: number;
  topK?: number;
  expandQuery?: boolean;
  includeContext?: boolean;
}

/**
 * Document indexing progress
 */
export interface IndexingProgress {
  documentId: string;
  totalParagraphs: number;
  indexedParagraphs: number;
  progress: number;
  status: 'idle' | 'indexing' | 'completed' | 'error';
  error?: string;
}

/**
 * Similar passage result
 */
export interface SimilarPassage {
  sourceId: string;
  targetId: string;
  sourceParagraphId?: string;
  targetParagraphId?: string;
  sourceText: string;
  targetText: string;
  similarity: number;
  reason: string;
}

/**
 * Semantic Search Service
 *
 * Provides semantic search capabilities using ONNX embeddings and vector store.
 */
export class SemanticSearchService {
  private embeddingService = getOnnxEmbeddingService();
  private vectorStore = getVectorStore();
  private indexingProgress: Map<string, IndexingProgress> = new Map();

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.embeddingService.initialize(),
        this.vectorStore.initialize(),
      ]);
      console.log('[SemanticSearch] Service initialized');
    } catch (error) {
      console.error('[SemanticSearch] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Search documents by semantic meaning
   *
   * @param query - Search query text
   * @param options - Search options
   * @returns Ranked search results
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      documentId,
      threshold = 0.5,
      topK = 20,
      expandQuery = false,
      includeContext = true,
    } = options;

    try {
      console.log(`[SemanticSearch] Searching for: "${query}"`);

      // Optionally expand query with synonyms/related terms
      const expandedQuery = expandQuery ? await this.expandQuery(query) : query;

      // Generate query embedding
      const queryEmbedding = await this.embeddingService.embed(expandedQuery);

      // Search vector store
      const similarVectors = await this.vectorStore.findSimilar(
        queryEmbedding.vector,
        {
          threshold,
          topK,
          documentId,
        }
      );

      // Convert to search results with ranking
      const results: SearchResult[] = similarVectors.map((result, index) => ({
        id: result.id,
        documentId: result.documentId,
        paragraphId: result.paragraphId,
        text: result.text,
        similarity: result.similarity,
        rank: index + 1,
        snippet: includeContext ? this.createSnippet(result.text, query) : result.text,
        metadata: result.metadata,
      }));

      console.log(`[SemanticSearch] Found ${results.length} results`);

      return results;

    } catch (error) {
      console.error('[SemanticSearch] Search failed:', error);
      return [];
    }
  }

  /**
   * Find similar passages within a document or across documents
   *
   * @param sourceText - Source text to find similarities for
   * @param options - Search options
   * @returns Similar passages ranked by similarity
   */
  async findSimilarPassages(
    sourceText: string,
    options: SearchOptions = {}
  ): Promise<SimilarPassage[]> {
    const {
      documentId,
      threshold = 0.6,
      topK = 10,
    } = options;

    try {
      // Generate embedding for source text
      const sourceEmbedding = await this.embeddingService.embed(sourceText);

      // Find similar vectors
      const similarVectors = await this.vectorStore.findSimilar(
        sourceEmbedding.vector,
        {
          threshold,
          topK: topK + 1, // +1 because source might be in results
          documentId,
        }
      );

      // Convert to similar passages (excluding source if present)
      const passages: SimilarPassage[] = similarVectors
        .filter(result => result.text !== sourceText)
        .slice(0, topK)
        .map(result => ({
          sourceId: 'source',
          targetId: result.id,
          sourceParagraphId: undefined,
          targetParagraphId: result.paragraphId,
          sourceText,
          targetText: result.text,
          similarity: result.similarity,
          reason: this.generateSimilarityReason(result.similarity),
        }));

      console.log(`[SemanticSearch] Found ${passages.length} similar passages`);

      return passages;

    } catch (error) {
      console.error('[SemanticSearch] Similar passages search failed:', error);
      return [];
    }
  }

  /**
   * Index a document's paragraphs for semantic search
   *
   * @param documentId - Document ID
   * @param paragraphs - Array of paragraphs with text content
   * @param metadata - Optional metadata for each paragraph
   * @returns Promise that resolves when indexing is complete
   */
  async indexDocument(
    documentId: string,
    paragraphs: Array<{ id: string; text: string; position: number }>,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const progress: IndexingProgress = {
      documentId,
      totalParagraphs: paragraphs.length,
      indexedParagraphs: 0,
      progress: 0,
      status: 'indexing',
    };

    this.indexingProgress.set(documentId, progress);

    try {
      console.log(`[SemanticSearch] Indexing document ${documentId} (${paragraphs.length} paragraphs)`);

      // Generate embeddings in batch
      const texts = paragraphs.map(p => p.text);
      const batchResult = await this.embeddingService.embedBatch(texts);

      // Store vectors in batch
      const vectors = paragraphs.map((paragraph, index) => ({
        id: `${documentId}-${paragraph.id}`,
        documentId,
        paragraphId: paragraph.id,
        text: paragraph.text,
        vector: batchResult.embeddings[index].vector,
        metadata: {
          ...metadata,
          position: paragraph.position,
        },
        timestamp: Date.now(),
      }));

      await this.vectorStore.storeBatch(vectors);

      // Update progress
      progress.indexedParagraphs = paragraphs.length;
      progress.progress = 100;
      progress.status = 'completed';

      console.log(
        `[SemanticSearch] Indexed ${paragraphs.length} paragraphs ` +
        `(${batchResult.cached} cached, ${batchResult.computed} computed)`
      );

    } catch (error) {
      console.error('[SemanticSearch] Indexing failed:', error);
      progress.status = 'error';
      progress.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Get indexing progress for a document
   *
   * @param documentId - Document ID
   * @returns Indexing progress or null if not indexing
   */
  getIndexingProgress(documentId: string): IndexingProgress | null {
    return this.indexingProgress.get(documentId) || null;
  }

  /**
   * Delete document index
   *
   * @param documentId - Document ID to delete
   */
  async deleteDocumentIndex(documentId: string): Promise<void> {
    try {
      await this.vectorStore.deleteByDocument(documentId);
      this.indexingProgress.delete(documentId);
      console.log(`[SemanticSearch] Deleted index for document: ${documentId}`);
    } catch (error) {
      console.error('[SemanticSearch] Failed to delete document index:', error);
      throw error;
    }
  }

  /**
   * Find cross-document links based on semantic similarity
   *
   * @param documentIds - Array of document IDs to search across
   * @param threshold - Minimum similarity threshold
   * @returns Array of cross-document link suggestions
   */
  async findCrossDocumentLinks(
    documentIds: string[],
    threshold = 0.7
  ): Promise<SimilarPassage[]> {
    try {
      console.log(`[SemanticSearch] Finding cross-document links across ${documentIds.length} documents`);

      const allLinks: SimilarPassage[] = [];

      // For each document, find similar passages in other documents
      for (const sourceDocId of documentIds) {
        const sourceVectors = await this.vectorStore.getByDocument(sourceDocId);

        for (const sourceVector of sourceVectors) {
          const similarVectors = await this.vectorStore.findSimilar(
            sourceVector.vector,
            {
              threshold,
              topK: 5,
              excludeIds: [sourceVector.id],
            }
          );

          // Filter to only include other documents
          const crossDocLinks = similarVectors
            .filter(target => target.documentId !== sourceDocId)
            .map(target => ({
              sourceId: sourceVector.id,
              targetId: target.id,
              sourceParagraphId: sourceVector.paragraphId,
              targetParagraphId: target.paragraphId,
              sourceText: sourceVector.text,
              targetText: target.text,
              similarity: target.similarity,
              reason: this.generateSimilarityReason(target.similarity),
            }));

          allLinks.push(...crossDocLinks);
        }
      }

      // Sort by similarity and remove duplicates
      allLinks.sort((a, b) => b.similarity - a.similarity);

      console.log(`[SemanticSearch] Found ${allLinks.length} cross-document links`);

      return allLinks;

    } catch (error) {
      console.error('[SemanticSearch] Cross-document link search failed:', error);
      return [];
    }
  }

  /**
   * Expand query with related terms (simple implementation)
   * Can be enhanced with word embeddings or external APIs
   */
  private async expandQuery(query: string): Promise<string> {
    // Simple expansion - in production, use word2vec or API
    const expansions: Record<string, string[]> = {
      'study': ['research', 'analysis', 'investigation'],
      'show': ['demonstrate', 'reveal', 'indicate'],
      'important': ['significant', 'crucial', 'key'],
      'method': ['approach', 'technique', 'methodology'],
    };

    const words = query.toLowerCase().split(/\s+/);
    const expandedWords = words.flatMap(word =>
      expansions[word] ? [word, ...expansions[word]] : [word]
    );

    return [...new Set(expandedWords)].join(' ');
  }

  /**
   * Create a snippet with context around query terms
   */
  private createSnippet(text: string, query: string, maxLength = 200): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Find query terms in text (case-insensitive)
    const queryTerms = query.toLowerCase().split(/\s+/);
    const textLower = text.toLowerCase();

    let bestPosition = 0;
    let maxMatches = 0;

    // Find position with most query term matches
    for (let i = 0; i < text.length - maxLength; i += 10) {
      const window = textLower.slice(i, i + maxLength);
      const matches = queryTerms.filter(term => window.includes(term)).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        bestPosition = i;
      }
    }

    let snippet = text.slice(bestPosition, bestPosition + maxLength);

    // Add ellipsis
    if (bestPosition > 0) {
      snippet = '...' + snippet;
    }
    if (bestPosition + maxLength < text.length) {
      snippet = snippet + '...';
    }

    return snippet;
  }

  /**
   * Generate human-readable reason for similarity
   */
  private generateSimilarityReason(similarity: number): string {
    if (similarity >= 0.9) {
      return 'Nearly identical content';
    } else if (similarity >= 0.8) {
      return 'Very similar meaning';
    } else if (similarity >= 0.7) {
      return 'Similar topics and concepts';
    } else if (similarity >= 0.6) {
      return 'Related content';
    } else {
      return 'Somewhat related';
    }
  }

  /**
   * Get service statistics
   */
  async getStats() {
    const [embeddingStats, vectorStats, cacheStats] = await Promise.all([
      this.embeddingService.getStats(),
      this.vectorStore.getStats(),
      this.embeddingService.getCacheStats(),
    ]);

    return {
      embedding: embeddingStats,
      vectorStore: vectorStats,
      cache: cacheStats,
    };
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    await this.embeddingService.clearCache();
  }

  /**
   * Clear all indexed vectors
   */
  async clearAllIndexes(): Promise<void> {
    await this.vectorStore.clear();
    this.indexingProgress.clear();
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    await Promise.all([
      this.embeddingService.dispose(),
      this.vectorStore.dispose(),
    ]);
  }
}

// Singleton instance
let semanticSearchService: SemanticSearchService | null = null;

/**
 * Get the singleton semantic search service instance
 */
export function getSemanticSearchService(): SemanticSearchService {
  if (!semanticSearchService) {
    semanticSearchService = new SemanticSearchService();
  }
  return semanticSearchService;
}
