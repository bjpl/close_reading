/**
 * AIRouter - Intelligent Provider Selection and Routing
 * Manages fallback chain: User preference → Ollama → Claude → Browser ML → Error
 */

import {
  IAIProvider,
  AIProviderType,
  ProviderSelection,
  ProviderSelectionStrategy,
  AIRequestOptions,
  AIResponse,
  SummaryResult,
  QuestionAnswerResult,
  ThemeExtractionResult,
  PrivacySettings,
} from './types';
import logger from '../../lib/logger';

interface ProviderQualityMetrics {
  provider: AIProviderType;
  successRate: number;
  averageLatency: number;
  totalRequests: number;
  lastUsed: Date;
}

interface RouterOptions {
  preferredProvider?: AIProviderType;
  strategy?: ProviderSelectionStrategy;
  privacyMode?: boolean;
  trackMetrics?: boolean;
}

export class AIRouter implements IAIProvider {
  private providers: Map<AIProviderType, IAIProvider>;
  private qualityMetrics: Map<AIProviderType, ProviderQualityMetrics>;
  private options: RouterOptions;
  private privacySettings?: PrivacySettings;
  private fallbackChain: AIProviderType[];

  public metadata = {
    name: 'AI Router',
    type: 'ollama' as AIProviderType, // Default, will change based on selection
    cost: 'free' as const,
    speed: 'fast' as const,
    quality: 'high' as const,
    privacy: 'local' as const,
    requiresSetup: false,
    requiresApiKey: false,
  };

  constructor(
    providers: Map<AIProviderType, IAIProvider>,
    options?: RouterOptions
  ) {
    this.providers = providers;
    this.options = options || {};
    this.qualityMetrics = new Map();
    this.fallbackChain = this.buildFallbackChain();

    // Initialize metrics for all providers
    providers.forEach((_provider, type) => {
      this.qualityMetrics.set(type, {
        provider: type,
        successRate: 1.0,
        averageLatency: 0,
        totalRequests: 0,
        lastUsed: new Date(),
      });
    });
  }

  /**
   * Build the fallback chain based on privacy settings
   */
  private buildFallbackChain(): AIProviderType[] {
    if (this.options.privacyMode || this.privacySettings?.privacy_mode_enabled) {
      // Privacy mode: local only
      return ['ollama', 'browser-ml'];
    }

    // Standard mode: prefer local, fallback to cloud
    const preferred = this.options.preferredProvider ||
      this.privacySettings?.preferred_provider ||
      'ollama';

    const chain: AIProviderType[] = [preferred];

    // Add other providers in order
    const allProviders: AIProviderType[] = ['ollama', 'claude', 'browser-ml'];
    allProviders.forEach(p => {
      if (p !== preferred && this.providers.has(p)) {
        chain.push(p);
      }
    });

    return chain;
  }

  /**
   * Update privacy settings
   */
  setPrivacySettings(settings: PrivacySettings): void {
    this.privacySettings = settings;
    this.fallbackChain = this.buildFallbackChain();
  }

  /**
   * Select the best available provider
   */
  async selectProvider(
    strategy?: ProviderSelectionStrategy
  ): Promise<ProviderSelection> {
    const actualStrategy = strategy || this.options.strategy || 'auto-best';

    // Try each provider in the fallback chain
    for (const providerType of this.fallbackChain) {
      const provider = this.providers.get(providerType);
      if (!provider) continue;

      try {
        const available = await provider.isAvailable();
        if (available) {
          const reason = this.getSelectionReason(providerType, actualStrategy);
          return {
            provider,
            metadata: provider.metadata,
            reason,
          };
        }
      } catch (error) {
        // Provider not available, continue to next
        logger.warn({ providerType, error }, `Provider ${providerType} unavailable`);
      }
    }

    throw new Error(
      'No AI providers available. Please ensure Ollama is running or configure Claude API.'
    );
  }

  /**
   * Get the reason for provider selection
   */
  private getSelectionReason(
    provider: AIProviderType,
    strategy: ProviderSelectionStrategy
  ): string {
    const reasons: Record<string, string> = {
      'user-preference': `Selected by user preference`,
      'auto-best': `Best available provider based on quality metrics`,
      'privacy-first': `Privacy mode: using local provider only`,
      'performance-first': `Fastest available provider`,
      'cost-first': `Most cost-effective provider`,
    };

    return reasons[strategy] || `Default selection: ${provider}`;
  }

  /**
   * Record request metrics
   */
  private recordMetrics(
    provider: AIProviderType,
    success: boolean,
    latency: number
  ): void {
    if (!this.options.trackMetrics) return;

    const metrics = this.qualityMetrics.get(provider);
    if (!metrics) return;

    const totalRequests = metrics.totalRequests + 1;
    const successRate = success
      ? (metrics.successRate * metrics.totalRequests + 1) / totalRequests
      : (metrics.successRate * metrics.totalRequests) / totalRequests;

    const averageLatency =
      (metrics.averageLatency * metrics.totalRequests + latency) / totalRequests;

    this.qualityMetrics.set(provider, {
      provider,
      successRate,
      averageLatency,
      totalRequests,
      lastUsed: new Date(),
    });
  }

  /**
   * Execute a request with automatic fallback
   */
  private async executeWithFallback<T>(
    operation: (provider: IAIProvider) => Promise<T>,
    _options?: AIRequestOptions
  ): Promise<T> {
    const errors: Array<{ provider: AIProviderType; error: Error }> = [];

    for (const providerType of this.fallbackChain) {
      const provider = this.providers.get(providerType);
      if (!provider) continue;

      try {
        const available = await provider.isAvailable();
        if (!available) {
          continue;
        }

        const startTime = Date.now();
        const result = await operation(provider);
        const latency = Date.now() - startTime;

        this.recordMetrics(providerType, true, latency);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push({ provider: providerType, error: err });
        this.recordMetrics(providerType, false, 0);

        // If request was cancelled, don't retry
        if (err.message.includes('cancel')) {
          throw err;
        }
      }
    }

    // All providers failed
    const errorMessage = errors
      .map(e => `${e.provider}: ${e.error.message}`)
      .join('; ');

    throw new Error(`All providers failed. Errors: ${errorMessage}`);
  }

  /**
   * Check if router is available (at least one provider is available)
   */
  async isAvailable(): Promise<boolean> {
    for (const provider of this.providers.values()) {
      try {
        const available = await provider.isAvailable();
        if (available) return true;
      } catch {
        // Continue checking other providers
      }
    }
    return false;
  }

  /**
   * Initialize all providers
   */
  async initialize(): Promise<void> {
    const initPromises = Array.from(this.providers.values()).map(provider =>
      provider.initialize().catch(err => {
        logger.warn({ err }, `Failed to initialize provider`);
      })
    );

    await Promise.all(initPromises);

    // Verify at least one provider is available
    const available = await this.isAvailable();
    if (!available) {
      throw new Error(
        'No AI providers could be initialized. Please check your configuration.'
      );
    }
  }

  /**
   * Summarize text
   */
  async summarize(
    text: string,
    options?: AIRequestOptions
  ): Promise<SummaryResult> {
    return this.executeWithFallback(
      provider => provider.summarize(text, options),
      options
    );
  }

  /**
   * Answer question
   */
  async answerQuestion(
    text: string,
    question: string,
    options?: AIRequestOptions
  ): Promise<QuestionAnswerResult> {
    return this.executeWithFallback(
      provider => provider.answerQuestion(text, question, options),
      options
    );
  }

  /**
   * Extract themes
   */
  async extractThemes(
    text: string,
    options?: AIRequestOptions
  ): Promise<ThemeExtractionResult> {
    return this.executeWithFallback(
      provider => provider.extractThemes(text, options),
      options
    );
  }

  /**
   * Suggest annotations
   */
  async suggestAnnotations(
    text: string,
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    return this.executeWithFallback(
      provider => provider.suggestAnnotations(text, options),
      options
    );
  }

  /**
   * Compare texts
   */
  async compareTexts(
    text1: string,
    text2: string,
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    return this.executeWithFallback(
      provider => provider.compareTexts(text1, text2, options),
      options
    );
  }

  /**
   * Generate insights
   */
  async generateInsights(
    text: string,
    context?: string,
    options?: AIRequestOptions
  ): Promise<AIResponse> {
    return this.executeWithFallback(
      provider => provider.generateInsights(text, context, options),
      options
    );
  }

  /**
   * Get quality metrics for all providers
   */
  getQualityMetrics(): Map<AIProviderType, ProviderQualityMetrics> {
    return new Map(this.qualityMetrics);
  }

  /**
   * Get current provider status
   */
  async getProviderStatus(): Promise<
    Array<{
      type: AIProviderType;
      available: boolean;
      metadata: Record<string, unknown>;
      metrics?: ProviderQualityMetrics;
    }>
  > {
    const status = [];

    for (const [type, provider] of this.providers.entries()) {
      try {
        const available = await provider.isAvailable();
        status.push({
          type,
          available,
          metadata: provider.metadata,
          metrics: this.qualityMetrics.get(type),
        });
      } catch (error) {
        status.push({
          type,
          available: false,
          metadata: provider.metadata,
          metrics: this.qualityMetrics.get(type),
        });
      }
    }

    return status;
  }

  /**
   * Cleanup all providers
   */
  async dispose(): Promise<void> {
    const disposePromises = Array.from(this.providers.values()).map(provider =>
      provider.dispose().catch(err => {
        logger.warn({ err }, 'Failed to dispose provider');
      })
    );

    await Promise.all(disposePromises);
  }
}
