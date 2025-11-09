/**
 * Link Suggestions Service
 *
 * Auto-suggests paragraph links based on semantic similarity.
 * Uses:
 * - ML embeddings (primary) for semantic similarity
 * - TF-IDF (fallback) when embeddings unavailable
 *
 * Integration points:
 * - UI components for link creation
 * - Real-time suggestions as user types
 * - Background processing for all paragraphs
 */

import { getEmbeddingService, EmbeddingVector } from './embeddings';
import { findSimilarParagraphs, SimilarityOptions } from './similarity';

export interface LinkSuggestion {
  sourceParagraphId: string;
  targetParagraphId: string;
  score: number;
  reason: 'semantic' | 'keyword' | 'manual';
  keywords?: string[];
}

export interface SuggestionOptions extends SimilarityOptions {
  useFallback?: boolean;
  includeKeywords?: boolean;
}

/**
 * Link Suggestions Service
 */
export class LinkSuggestionsService {
  private embeddingService = getEmbeddingService();
  private embeddingCache = new Map<string, EmbeddingVector>();

  /**
   * Get link suggestions for a paragraph
   */
  async getSuggestionsForParagraph(
    paragraphId: string,
    paragraphText: string,
    candidateParagraphs: Map<string, string>,
    options: SuggestionOptions = {}
  ): Promise<LinkSuggestion[]> {
    const {
      minScore = 0.6,
      maxResults = 5,
      excludeIds = new Set([paragraphId]), // Always exclude self
      useFallback = true,
      includeKeywords = true,
    } = options;

    // Ensure embedding service is initialized
    if (!this.embeddingService.isReady()) {
      await this.embeddingService.initialize();
    }

    try {
      // Get embedding for source paragraph
      const sourceEmbedding = await this.getOrCreateEmbedding(paragraphId, paragraphText);

      // Get embeddings for all candidate paragraphs
      await this.ensureCandidateEmbeddings(candidateParagraphs);

      // Find similar paragraphs
      const similarityResults = findSimilarParagraphs(
        sourceEmbedding,
        this.embeddingCache,
        {
          minScore,
          maxResults,
          excludeIds,
        }
      );

      // Convert to link suggestions
      const suggestions: LinkSuggestion[] = similarityResults.map(result => ({
        sourceParagraphId: paragraphId,
        targetParagraphId: result.paragraphId,
        score: result.score,
        reason: 'semantic' as const,
        keywords: includeKeywords ? this.extractKeywords(paragraphText, result.text) : undefined,
      }));

      return suggestions;

    } catch (error) {
      console.error('[LinkSuggestions] ML approach failed:', error);

      // Fallback to TF-IDF if enabled
      if (useFallback) {
        console.log('[LinkSuggestions] Using TF-IDF fallback');
        return this.getTFIDFSuggestions(
          paragraphId,
          paragraphText,
          candidateParagraphs,
          { minScore, maxResults, excludeIds }
        );
      }

      return [];
    }
  }

  /**
   * Get or create embedding for a paragraph
   */
  private async getOrCreateEmbedding(
    paragraphId: string,
    paragraphText: string
  ): Promise<EmbeddingVector> {
    // Check cache first
    if (this.embeddingCache.has(paragraphId)) {
      return this.embeddingCache.get(paragraphId)!;
    }

    // Generate new embedding
    const embedding = await this.embeddingService.embed(paragraphText);
    this.embeddingCache.set(paragraphId, embedding);

    return embedding;
  }

  /**
   * Ensure all candidate paragraphs have embeddings
   */
  private async ensureCandidateEmbeddings(
    candidateParagraphs: Map<string, string>
  ): Promise<void> {
    // Find paragraphs without embeddings
    const missingEmbeddings: Array<[string, string]> = [];

    for (const [id, text] of candidateParagraphs.entries()) {
      if (!this.embeddingCache.has(id)) {
        missingEmbeddings.push([id, text]);
      }
    }

    if (missingEmbeddings.length === 0) return;

    // Batch generate embeddings
    const texts = missingEmbeddings.map(([_, text]) => text);
    const result = await this.embeddingService.embedBatch(texts);

    // Cache results
    missingEmbeddings.forEach(([id], index) => {
      this.embeddingCache.set(id, result.embeddings[index]);
    });
  }

  /**
   * TF-IDF fallback when embeddings unavailable
   */
  private getTFIDFSuggestions(
    paragraphId: string,
    paragraphText: string,
    candidateParagraphs: Map<string, string>,
    options: SimilarityOptions
  ): LinkSuggestion[] {
    const {
      minScore = 0.3,
      maxResults = 5,
      excludeIds = new Set([paragraphId]),
    } = options;

    // Calculate TF-IDF scores
    const sourceTerms = this.extractTerms(paragraphText);
    const documentFrequencies = this.calculateDocumentFrequencies(candidateParagraphs);
    const totalDocs = candidateParagraphs.size;

    const suggestions: LinkSuggestion[] = [];

    for (const [candidateId, candidateText] of candidateParagraphs.entries()) {
      if (excludeIds.has(candidateId)) continue;

      const candidateTerms = this.extractTerms(candidateText);
      const score = this.calculateTFIDFSimilarity(
        sourceTerms,
        candidateTerms,
        documentFrequencies,
        totalDocs
      );

      if (score >= minScore) {
        suggestions.push({
          sourceParagraphId: paragraphId,
          targetParagraphId: candidateId,
          score,
          reason: 'keyword',
          keywords: this.findCommonKeywords(sourceTerms, candidateTerms),
        });
      }
    }

    // Sort by score and limit results
    suggestions.sort((a, b) => b.score - a.score);
    return suggestions.slice(0, maxResults);
  }

  /**
   * Extract terms from text
   */
  private extractTerms(text: string): Map<string, number> {
    const terms = new Map<string, number>();

    // Simple tokenization and cleaning
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 3); // Filter out short words

    // Count term frequencies
    for (const token of tokens) {
      terms.set(token, (terms.get(token) || 0) + 1);
    }

    return terms;
  }

  /**
   * Calculate document frequencies for IDF
   */
  private calculateDocumentFrequencies(
    documents: Map<string, string>
  ): Map<string, number> {
    const df = new Map<string, number>();

    for (const text of documents.values()) {
      const terms = new Set(this.extractTerms(text).keys());
      for (const term of terms) {
        df.set(term, (df.get(term) || 0) + 1);
      }
    }

    return df;
  }

  /**
   * Calculate TF-IDF similarity between two term vectors
   */
  private calculateTFIDFSimilarity(
    termsA: Map<string, number>,
    termsB: Map<string, number>,
    documentFrequencies: Map<string, number>,
    totalDocs: number
  ): number {
    // Calculate TF-IDF vectors
    const vectorA = this.calculateTFIDFVector(termsA, documentFrequencies, totalDocs);
    const vectorB = this.calculateTFIDFVector(termsB, documentFrequencies, totalDocs);

    // Calculate cosine similarity
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    const allTerms = new Set([...vectorA.keys(), ...vectorB.keys()]);

    for (const term of allTerms) {
      const a = vectorA.get(term) || 0;
      const b = vectorB.get(term) || 0;

      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Calculate TF-IDF vector for a term frequency map
   */
  private calculateTFIDFVector(
    terms: Map<string, number>,
    documentFrequencies: Map<string, number>,
    totalDocs: number
  ): Map<string, number> {
    const vector = new Map<string, number>();
    const maxFreq = Math.max(...terms.values());

    for (const [term, freq] of terms.entries()) {
      // TF: normalized frequency
      const tf = freq / maxFreq;

      // IDF: inverse document frequency
      const df = documentFrequencies.get(term) || 1;
      const idf = Math.log(totalDocs / df);

      vector.set(term, tf * idf);
    }

    return vector;
  }

  /**
   * Extract common keywords between source and target
   */
  private extractKeywords(sourceText: string, targetText: string): string[] {
    const sourceTerms = this.extractTerms(sourceText);
    const targetTerms = this.extractTerms(targetText);

    return this.findCommonKeywords(sourceTerms, targetTerms);
  }

  /**
   * Find common keywords between two term maps
   */
  private findCommonKeywords(
    termsA: Map<string, number>,
    termsB: Map<string, number>
  ): string[] {
    const common: Array<[string, number]> = [];

    for (const [term, freqA] of termsA.entries()) {
      const freqB = termsB.get(term);
      if (freqB) {
        common.push([term, freqA + freqB]);
      }
    }

    // Sort by combined frequency and take top 5
    common.sort((a, b) => b[1] - a[1]);
    return common.slice(0, 5).map(([term]) => term);
  }

  /**
   * Batch process all paragraphs to generate suggestions
   */
  async generateAllSuggestions(
    paragraphs: Map<string, string>,
    options: SuggestionOptions = {}
  ): Promise<Map<string, LinkSuggestion[]>> {
    const allSuggestions = new Map<string, LinkSuggestion[]>();

    // Pre-generate all embeddings in batch
    await this.ensureCandidateEmbeddings(paragraphs);

    // Generate suggestions for each paragraph
    for (const [id, text] of paragraphs.entries()) {
      const suggestions = await this.getSuggestionsForParagraph(
        id,
        text,
        paragraphs,
        options
      );

      if (suggestions.length > 0) {
        allSuggestions.set(id, suggestions);
      }
    }

    return allSuggestions;
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }
}

// Singleton instance
let linkSuggestionsService: LinkSuggestionsService | null = null;

/**
 * Get the singleton link suggestions service instance
 */
export function getLinkSuggestionsService(): LinkSuggestionsService {
  if (!linkSuggestionsService) {
    linkSuggestionsService = new LinkSuggestionsService();
  }
  return linkSuggestionsService;
}
