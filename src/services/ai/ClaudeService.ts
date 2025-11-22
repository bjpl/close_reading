/**
 * Claude AI Service - Premium Features Implementation
 * Week 3 - 8 Advanced AI Features using Claude Sonnet 4.5
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ClaudeConfig,
  ClaudeResponse,
  ClaudeUsage,
  Summary,
  SummarizationOptions,
  QuestionAnswer,
  QuestionOptions,
  Theme,
  ThemeExtractionOptions,
  AnnotationSuggestion,
  AnnotationSuggestionsOptions,
  ArgumentStructure,
  ArgumentMiningOptions,
  GeneratedQuestion,
  QuestionGenerationOptions,
  EntityNetwork,
  EntityRelationshipOptions,
  ComparativeAnalysis,
  ComparativeAnalysisOptions,
  CircuitBreakerError,
  AuthenticationError,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RATE_LIMIT = 50; // Pro tier: 50 req/min

// Token pricing (per 1M tokens)
const PRICING = {
  'claude-sonnet-4-20250514': {
    input: 3.0,
    output: 15.0,
  },
  'claude-sonnet-4.5-20250929': {
    input: 3.0,
    output: 15.0,
  },
};

// ============================================================================
// Circuit Breaker
// ============================================================================

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold = 5,
    private timeout = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker open') as CircuitBreakerError;
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}

// ============================================================================
// Rate Limiter
// ============================================================================

class RateLimiter {
  private requests: number[] = [];

  constructor(private maxRequests: number, private windowMs = 60000) {}

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.waitForSlot();
    }

    this.requests.push(now);
  }
}

// ============================================================================
// Main Service
// ============================================================================

export class ClaudeService {
  private client: Anthropic;
  private config: Required<ClaudeConfig>;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;

  constructor(config: ClaudeConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || DEFAULT_MODEL,
      maxRetries: config.maxRetries || DEFAULT_MAX_RETRIES,
      retryDelay: config.retryDelay || DEFAULT_RETRY_DELAY,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      rateLimitPerMinute: config.rateLimitPerMinute || DEFAULT_RATE_LIMIT,
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
    });

    this.circuitBreaker = new CircuitBreaker();
    this.rateLimiter = new RateLimiter(this.config.rateLimitPerMinute);
  }

  // ==========================================================================
  // Core Request Handler
  // ==========================================================================

  private async makeRequest<T>(
    systemPrompt: string,
    userPrompt: string,
    parseResponse: (content: string) => T,
    maxTokens = 4096
  ): Promise<ClaudeResponse<T>> {
    await this.rateLimiter.waitForSlot();

    return this.circuitBreaker.execute(async () => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
        try {
          const response = await this.client.messages.create({
            model: this.config.model,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: userPrompt,
              },
            ],
          });

          const content = response.content[0];
          if (content.type !== 'text') {
            throw new Error('Unexpected response type');
          }

          const usage: ClaudeUsage = {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            estimatedCost: this.calculateCost(
              response.usage.input_tokens,
              response.usage.output_tokens
            ),
            timestamp: Date.now(),
          };

          const data = parseResponse(content.text);

          return {
            data,
            usage,
            cached: false,
            model: this.config.model,
          };
        } catch (error: unknown) {
          lastError = error as Error;

          // Check if error is retryable
          const anthropicError = error as { status?: number };
          if (anthropicError.status === 401) {
            throw new Error('Invalid API key') as AuthenticationError;
          }

          if (anthropicError.status === 429) {
            // Rate limit - wait longer
            const delay = this.config.retryDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          // Non-retryable error
          if (anthropicError.status && anthropicError.status < 500) {
            throw error;
          }

          // Retryable server error - exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError || new Error('Max retries exceeded');
    });
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[this.config.model as keyof typeof PRICING] || PRICING[DEFAULT_MODEL as keyof typeof PRICING];
    return (
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output
    );
  }

  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  // ==========================================================================
  // Feature 1: Document Summarization
  // ==========================================================================

  async summarize(
    text: string,
    options: SummarizationOptions
  ): Promise<ClaudeResponse<Summary>> {
    const systemPrompt = `You are an expert academic summarizer. Create ${options.style} summaries at the ${options.level} level. Always provide key points and assess confidence.`;

    const userPrompt = `Summarize the following text in ${options.style} style at the ${options.level} level:

${options.maxLength ? `Maximum length: ${options.maxLength} words\n` : ''}
${options.includeCitations ? 'Include citations from the text.\n' : ''}
${options.focusAreas ? `Focus on: ${options.focusAreas.join(', ')}\n` : ''}

Text:
${text}

Provide response as JSON with: text, keyPoints (array), citations (array if requested), wordCount, confidence (0-1).`;

    return this.makeRequest(systemPrompt, userPrompt, (content) => {
      const parsed = JSON.parse(content);
      return {
        text: parsed.text,
        style: options.style,
        level: options.level,
        keyPoints: parsed.keyPoints,
        citations: parsed.citations || [],
        wordCount: parsed.wordCount,
        confidence: parsed.confidence,
      };
    });
  }

  // ==========================================================================
  // Feature 2: Q&A System
  // ==========================================================================

  async answerQuestion(
    question: string,
    context: string,
    options: QuestionOptions = {}
  ): Promise<ClaudeResponse<QuestionAnswer>> {
    const systemPrompt = `You are an expert academic assistant. Answer questions based on provided context, citing evidence and providing confidence scores.`;

    const userPrompt = `Question: ${question}

Context:
${context}

${options.includeEvidence !== false ? 'Include evidence citations with quotes from the context.\n' : ''}
${options.confidenceThreshold ? `Minimum confidence: ${options.confidenceThreshold}\n` : ''}
${options.maxFollowUps ? `Suggest up to ${options.maxFollowUps} follow-up questions.\n` : ''}

Provide response as JSON with: answer, evidence (array of {quote, source, relevanceScore}), confidence (0-1), followUpQuestions (array), reasoning.`;

    return this.makeRequest(systemPrompt, userPrompt, (content) => {
      const parsed = JSON.parse(content);
      return {
        question,
        answer: parsed.answer,
        evidence: parsed.evidence || [],
        confidence: parsed.confidence,
        followUpQuestions: parsed.followUpQuestions || [],
        reasoning: parsed.reasoning,
      };
    });
  }

  // ==========================================================================
  // Feature 3: Theme Extraction
  // ==========================================================================

  async extractThemes(
    text: string,
    options: ThemeExtractionOptions = {}
  ): Promise<ClaudeResponse<Theme[]>> {
    const systemPrompt = `You are an expert literary analyst. Extract interpretive themes with rich descriptions and examples.`;

    const userPrompt = `Extract themes from the following text:

${options.minThemes ? `Minimum themes: ${options.minThemes}\n` : ''}
${options.maxThemes ? `Maximum themes: ${options.maxThemes}\n` : ''}
${options.depth ? `Analysis depth: ${options.depth}\n` : ''}
${options.includeExamples !== false ? 'Include example passages for each theme.\n' : ''}

Text:
${text}

Provide response as JSON array of themes with: name, description, examples (array of {text, location, context, significance}), prevalence (0-1), relatedThemes (array), interpretation.`;

    return this.makeRequest(
      systemPrompt,
      userPrompt,
      (content) => {
        return JSON.parse(content);
      },
      6000
    );
  }

  // ==========================================================================
  // Feature 4: Annotation Suggestions
  // ==========================================================================

  async suggestAnnotations(
    text: string,
    options: AnnotationSuggestionsOptions = {}
  ): Promise<ClaudeResponse<AnnotationSuggestion[]>> {
    const systemPrompt = `You are an expert pedagogue. Suggest valuable annotations that enhance understanding and learning.`;

    const userPrompt = `Suggest annotations for the following text:

${options.types ? `Annotation types: ${options.types.join(', ')}\n` : ''}
${options.minPedagogicalValue ? `Minimum pedagogical value: ${options.minPedagogicalValue}\n` : ''}
${options.maxSuggestions ? `Maximum suggestions: ${options.maxSuggestions}\n` : ''}

Text:
${text}

Provide response as JSON array with: type, passage, location {page, paragraph, startOffset, endOffset}, reasoning, suggestedNote, pedagogicalValue (0-1), relatedConcepts (array).`;

    return this.makeRequest(
      systemPrompt,
      userPrompt,
      (content) => {
        return JSON.parse(content);
      },
      6000
    );
  }

  // ==========================================================================
  // Feature 5: Argument Mining
  // ==========================================================================

  async mineArguments(
    text: string,
    options: ArgumentMiningOptions = {}
  ): Promise<ClaudeResponse<ArgumentStructure>> {
    const systemPrompt = `You are an expert in argumentation theory. Extract and analyze argument structures, claims, and evidence.`;

    const userPrompt = `Analyze the argument structure in the following text:

${options.includeCounterArguments !== false ? 'Include counter-arguments.\n' : ''}
${options.minStrength ? `Minimum claim strength: ${options.minStrength}\n` : ''}
${options.generateMap !== false ? 'Generate an argument map.\n' : ''}

Text:
${text}

Provide response as JSON with:
- mainClaim: {type, text, location, evidence, strength, relatedClaims}
- supportingClaims: array of claims
- counterClaims: array of claims
- evidence: array of {quote, source, relevanceScore}
- structure: {coherence (0-1), completeness (0-1), logicalFlow}
- argumentMap: {nodes: array of {id, type, text, strength}, edges: array of {from, to, type, strength}}`;

    return this.makeRequest(
      systemPrompt,
      userPrompt,
      (content) => {
        return JSON.parse(content);
      },
      8000
    );
  }

  // ==========================================================================
  // Feature 6: Question Generation
  // ==========================================================================

  async generateQuestions(
    text: string,
    options: QuestionGenerationOptions = {}
  ): Promise<ClaudeResponse<GeneratedQuestion[]>> {
    const systemPrompt = `You are an expert educator. Generate thoughtful, pedagogically valuable questions that promote deep understanding.`;

    const userPrompt = `Generate discussion questions for the following text:

${options.types ? `Question types: ${options.types.join(', ')}\n` : ''}
${options.difficulty ? `Difficulty level: ${options.difficulty}\n` : ''}
${options.count ? `Number of questions: ${options.count}\n` : ''}
${options.includeAnswers ? 'Include suggested answers.\n' : ''}

Text:
${text}

Provide response as JSON array with: question, type, difficulty, focusArea, suggestedAnswer (if requested), relatedConcepts (array), pedagogicalGoal.`;

    return this.makeRequest(
      systemPrompt,
      userPrompt,
      (content) => {
        return JSON.parse(content);
      },
      6000
    );
  }

  // ==========================================================================
  // Feature 7: Entity Relationships
  // ==========================================================================

  async extractRelationships(
    text: string,
    options: EntityRelationshipOptions = {}
  ): Promise<ClaudeResponse<EntityNetwork>> {
    const systemPrompt = `You are an expert in network analysis and social structures. Extract entities and their relationships, including power dynamics.`;

    const userPrompt = `Extract entity relationships from the following text:

${options.types ? `Entity types: ${options.types.join(', ')}\n` : ''}
${options.minSignificance ? `Minimum significance: ${options.minSignificance}\n` : ''}
${options.includePowerDynamics !== false ? 'Analyze power dynamics.\n' : ''}
${options.includeNetworkAnalysis !== false ? 'Include network analysis (centrality, clusters).\n' : ''}

Text:
${text}

Provide response as JSON with:
- entities: array of {name, type, description, firstMention, significance (0-1)}
- relationships: array of {entity1, entity2, type, description, strength (0-1), evolution, evidence}
- powerDynamics: array of {dominant, subordinate, basis, stability (0-1)}
- socialStructure: {centrality: {entityName: score}, clusters: array of {name, members, cohesion}}`;

    return this.makeRequest(
      systemPrompt,
      userPrompt,
      (content) => {
        return JSON.parse(content);
      },
      8000
    );
  }

  // ==========================================================================
  // Feature 8: Comparative Analysis
  // ==========================================================================

  async compareDocuments(
    documents: { id: string; title: string; text: string }[],
    options: ComparativeAnalysisOptions = {}
  ): Promise<ClaudeResponse<ComparativeAnalysis>> {
    const systemPrompt = `You are an expert in comparative analysis. Identify themes, similarities, differences, and synthesize insights across multiple documents.`;

    const documentsText = documents
      .map((doc) => `Document: ${doc.title} (ID: ${doc.id})\n${doc.text}`)
      .join('\n\n---\n\n');

    const userPrompt = `Compare the following documents:

${options.focusAreas ? `Focus areas: ${options.focusAreas.join(', ')}\n` : ''}
${options.includeThemes !== false ? 'Extract cross-document themes.\n' : ''}
${options.includeSynthesis !== false ? 'Provide synthesis.\n' : ''}
${options.depth ? `Analysis depth: ${options.depth}\n` : ''}

${documentsText}

Provide response as JSON with:
- documents: array of {documentId, title, summary, keyThemes}
- themes: array of {theme, occurrences: [{documentId, examples, treatment}], interpretation}
- similarities: array of {aspect, description, evidence, significance (0-1)}
- differences: array of {aspect, document1Approach, document2Approach, significance (0-1)}
- synthesis: {overallAnalysis, keyInsights (array), suggestedConnections (array), futureDirections (array)}`;

    return this.makeRequest(
      systemPrompt,
      userPrompt,
      (content) => {
        return JSON.parse(content);
      },
      8000
    );
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  estimateCost(text: string, feature: string): { tokens: number; cost: number } {
    const baseTokens = this.estimateTokens(text);

    // Estimate output tokens based on feature
    const outputMultipliers: Record<string, number> = {
      summarize: 0.3,
      answerQuestion: 0.5,
      extractThemes: 1.0,
      suggestAnnotations: 0.8,
      mineArguments: 1.2,
      generateQuestions: 0.6,
      extractRelationships: 1.0,
      compareDocuments: 1.5,
    };

    const outputTokens = Math.ceil(baseTokens * (outputMultipliers[feature] || 0.5));
    const totalTokens = baseTokens + outputTokens;

    return {
      tokens: totalTokens,
      cost: this.calculateCost(baseTokens, outputTokens),
    };
  }

  validateApiKey(): boolean {
    return this.config.apiKey.startsWith('sk-ant-');
  }

  getConfig(): Readonly<Required<ClaudeConfig>> {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ClaudeConfig>): void {
    this.config = { ...this.config, ...updates } as Required<ClaudeConfig>;

    if (updates.apiKey) {
      this.client = new Anthropic({ apiKey: updates.apiKey });
    }

    if (updates.rateLimitPerMinute) {
      this.rateLimiter = new RateLimiter(updates.rateLimitPerMinute);
    }
  }
}

export default ClaudeService;
