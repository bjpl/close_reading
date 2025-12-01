/**
 * RAG-Enhanced Claude Service
 *
 * Extends ClaudeService with Retrieval-Augmented Generation capabilities.
 * Uses RAGService to retrieve relevant context before making Claude API calls.
 */

import { ClaudeService } from '../claude/ClaudeService';
import { RAGService } from './core/RAGService';
import type {
  ClaudeConfig,
  ClaudeResponse,
  QuestionAnswer,
  Summary,
  Theme,
  SummarizationOptions,
  ThemeExtractionOptions
} from '../claude/types';

/**
 * Configuration for RAG enhancement
 */
export interface RAGEnhancementConfig {
  enabled: boolean;
  contextWindow: number; // Number of paragraphs to include as context
  similarityThreshold: number; // Minimum similarity for including context
  maxContextTokens: number; // Maximum tokens to use for context
  includeRelatedParagraphs: boolean; // Include graph-related paragraphs
}

/**
 * Default RAG configuration
 */
const DEFAULT_RAG_CONFIG: RAGEnhancementConfig = {
  enabled: true,
  contextWindow: 5,
  similarityThreshold: 0.7,
  maxContextTokens: 4000,
  includeRelatedParagraphs: true
};

/**
 * Enhanced Claude service with RAG capabilities
 */
export class RAGEnhancedClaudeService extends ClaudeService {
  private ragConfig: RAGEnhancementConfig;

  constructor(
    config: ClaudeConfig,
    private ragService: RAGService,
    ragConfig: Partial<RAGEnhancementConfig> = {}
  ) {
    super(config);
    this.ragConfig = { ...DEFAULT_RAG_CONFIG, ...ragConfig };
  }

  /**
   * Answer a question with RAG-enhanced context
   */
  async answerQuestion(
    question: string,
    documentId: string,
    options: { paragraphId?: string; includeContext?: boolean } = {}
  ): Promise<ClaudeResponse<QuestionAnswer>> {
    const { paragraphId, includeContext = true } = options;

    // If RAG is disabled or no context requested, use base implementation
    if (!this.ragConfig.enabled || !includeContext) {
      return super.answerQuestion(question, documentId, options);
    }

    try {
      // Retrieve relevant context using RAG
      const ragResults = await this.ragService.retrieve({
        query: question,
        documentId,
        topK: this.ragConfig.contextWindow,
        threshold: this.ragConfig.similarityThreshold,
        includeGraphContext: this.ragConfig.includeRelatedParagraphs
      });

      // Build context string
      const context = this.buildContextString(ragResults);

      // Enhance the question with context
      const enhancedPrompt = this.buildQuestionPrompt(question, context, paragraphId);

      // Make the Claude API call with enhanced context
      const response = await this.makeRequest<QuestionAnswer>(
        'answerQuestion',
        {
          question: enhancedPrompt,
          documentId,
          context
        }
      );

      // Add metadata about RAG enhancement
      return {
        ...response,
        metadata: {
          ...response.metadata,
          ragEnhanced: true,
          contextParagraphs: ragResults.length,
          similarityScores: ragResults.map(r => r.score)
        }
      };
    } catch (error) {
      // Fall back to base implementation on error
      console.error('RAG enhancement failed, falling back to base implementation:', error);
      return super.answerQuestion(question, documentId, options);
    }
  }

  /**
   * Generate summary with RAG-enhanced context
   */
  async summarize(
    documentId: string,
    options: SummarizationOptions = {}
  ): Promise<ClaudeResponse<Summary>> {
    // If RAG is disabled, use base implementation
    if (!this.ragConfig.enabled) {
      return super.summarize(documentId, options);
    }

    try {
      // For summarization, we want to get the most representative paragraphs
      // Use RAG to find key paragraphs
      const ragResults = await this.ragService.retrieve({
        query: options.focusAreas?.join(' ') || 'main themes and key points',
        documentId,
        topK: this.ragConfig.contextWindow * 2, // More context for summary
        threshold: this.ragConfig.similarityThreshold * 0.8, // Lower threshold
        includeGraphContext: this.ragConfig.includeRelatedParagraphs
      });

      // Build context string
      const context = this.buildContextString(ragResults);

      // Make the Claude API call with enhanced context
      const response = await this.makeRequest<Summary>(
        'summarize',
        {
          documentId,
          options,
          context
        }
      );

      // Add metadata about RAG enhancement
      return {
        ...response,
        metadata: {
          ...response.metadata,
          ragEnhanced: true,
          contextParagraphs: ragResults.length
        }
      };
    } catch (error) {
      // Fall back to base implementation on error
      console.error('RAG enhancement failed, falling back to base implementation:', error);
      return super.summarize(documentId, options);
    }
  }

  /**
   * Extract themes with RAG-enhanced context
   */
  async extractThemes(
    documentId: string,
    options: ThemeExtractionOptions = {}
  ): Promise<ClaudeResponse<Theme[]>> {
    // If RAG is disabled, use base implementation
    if (!this.ragConfig.enabled) {
      return super.extractThemes(documentId, options);
    }

    try {
      // For theme extraction, we want diverse paragraphs
      // Use multiple queries to get varied context
      const queries = [
        'main themes and concepts',
        'key arguments and ideas',
        'recurring patterns and motifs'
      ];

      const allResults = await Promise.all(
        queries.map(query =>
          this.ragService.retrieve({
            query,
            documentId,
            topK: this.ragConfig.contextWindow,
            threshold: this.ragConfig.similarityThreshold * 0.8,
            includeGraphContext: this.ragConfig.includeRelatedParagraphs
          })
        )
      );

      // Combine and deduplicate results
      const uniqueResults = this.deduplicateResults(allResults.flat());

      // Build context string
      const context = this.buildContextString(uniqueResults);

      // Make the Claude API call with enhanced context
      const response = await this.makeRequest<Theme[]>(
        'extractThemes',
        {
          documentId,
          options,
          context
        }
      );

      // Add metadata about RAG enhancement
      return {
        ...response,
        metadata: {
          ...response.metadata,
          ragEnhanced: true,
          contextParagraphs: uniqueResults.length
        }
      };
    } catch (error) {
      // Fall back to base implementation on error
      console.error('RAG enhancement failed, falling back to base implementation:', error);
      return super.extractThemes(documentId, options);
    }
  }

  /**
   * Analyze with RAG-enhanced context
   */
  async analyze(
    documentId: string,
    analysisType: string,
    options: Record<string, any> = {}
  ): Promise<ClaudeResponse<any>> {
    // If RAG is disabled, use base implementation
    if (!this.ragConfig.enabled) {
      return super.analyze(documentId, analysisType, options);
    }

    try {
      // Build query based on analysis type
      const query = this.buildAnalysisQuery(analysisType, options);

      // Retrieve relevant context
      const ragResults = await this.ragService.retrieve({
        query,
        documentId,
        topK: this.ragConfig.contextWindow,
        threshold: this.ragConfig.similarityThreshold,
        includeGraphContext: this.ragConfig.includeRelatedParagraphs
      });

      // Build context string
      const context = this.buildContextString(ragResults);

      // Make the Claude API call with enhanced context
      const response = await this.makeRequest<any>(
        'analyze',
        {
          documentId,
          analysisType,
          options,
          context
        }
      );

      // Add metadata about RAG enhancement
      return {
        ...response,
        metadata: {
          ...response.metadata,
          ragEnhanced: true,
          contextParagraphs: ragResults.length
        }
      };
    } catch (error) {
      // Fall back to base implementation on error
      console.error('RAG enhancement failed, falling back to base implementation:', error);
      return super.analyze(documentId, analysisType, options);
    }
  }

  /**
   * Enable or disable RAG enhancement
   */
  setRAGEnabled(enabled: boolean): void {
    this.ragConfig.enabled = enabled;
  }

  /**
   * Update RAG configuration
   */
  updateRAGConfig(config: Partial<RAGEnhancementConfig>): void {
    this.ragConfig = { ...this.ragConfig, ...config };
  }

  /**
   * Get current RAG configuration
   */
  getRAGConfig(): RAGEnhancementConfig {
    return { ...this.ragConfig };
  }

  /**
   * Build context string from RAG results
   */
  private buildContextString(results: Array<{ id: string; score: number; metadata?: any }>): string {
    if (results.length === 0) return '';

    let context = 'Relevant context from the document:\n\n';
    let tokenCount = 0;

    for (const result of results) {
      const content = result.metadata?.content || '';
      const paragraphContext = `[Paragraph ${result.id}, relevance: ${(result.score * 100).toFixed(1)}%]\n${content}\n\n`;

      // Rough token estimation (4 chars per token)
      const estimatedTokens = paragraphContext.length / 4;

      if (tokenCount + estimatedTokens > this.ragConfig.maxContextTokens) {
        break;
      }

      context += paragraphContext;
      tokenCount += estimatedTokens;
    }

    return context;
  }

  /**
   * Build enhanced question prompt with context
   */
  private buildQuestionPrompt(
    question: string,
    context: string,
    paragraphId?: string
  ): string {
    let prompt = question;

    if (context) {
      prompt = `${context}\n\nQuestion: ${question}`;
    }

    if (paragraphId) {
      prompt += `\n\nFocus on paragraph: ${paragraphId}`;
    }

    return prompt;
  }

  /**
   * Build query for analysis type
   */
  private buildAnalysisQuery(analysisType: string, options: Record<string, any>): string {
    const queries: Record<string, string> = {
      sentiment: 'emotional tone and sentiment',
      structure: 'document structure and organization',
      rhetoric: 'rhetorical devices and techniques',
      argument: 'main arguments and reasoning',
      style: 'writing style and tone'
    };

    let query = queries[analysisType] || analysisType;

    if (options.focus) {
      query += ` focusing on ${options.focus}`;
    }

    return query;
  }

  /**
   * Deduplicate RAG results by ID
   */
  private deduplicateResults<T extends { id: string; score: number }>(
    results: T[]
  ): T[] {
    const seen = new Map<string, T>();

    for (const result of results) {
      const existing = seen.get(result.id);
      // Keep the result with the highest score
      if (!existing || result.score > existing.score) {
        seen.set(result.id, result);
      }
    }

    return Array.from(seen.values()).sort((a, b) => b.score - a.score);
  }

  /**
   * Make request to Claude API (protected method from base class)
   */
  private async makeRequest<T>(
    method: string,
    params: Record<string, any>
  ): Promise<ClaudeResponse<T>> {
    // This would call the actual Claude API
    // For now, we'll create a mock response
    return {
      data: {} as T,
      usage: {
        inputTokens: 0,
        outputTokens: 0
      },
      metadata: {
        model: this.config.model,
        timestamp: new Date().toISOString()
      }
    } as ClaudeResponse<T>;
  }
}
