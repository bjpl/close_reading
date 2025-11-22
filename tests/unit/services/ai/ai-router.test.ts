/**
 * AIRouter Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIRouter } from '@/services/ai/AIRouter';
import { IAIProvider, AIProviderType } from '@/services/ai/types';

// Mock provider implementation
class MockProvider implements IAIProvider {
  public metadata;
  private available: boolean;
  private shouldFail: boolean;

  constructor(
    type: AIProviderType,
    available: boolean = true,
    shouldFail: boolean = false
  ) {
    this.available = available;
    this.shouldFail = shouldFail;
    this.metadata = {
      name: `Mock ${type}`,
      type,
      cost: 'free' as const,
      speed: 'fast' as const,
      quality: 'high' as const,
      privacy: type === 'claude' ? ('cloud' as const) : ('local' as const),
      requiresSetup: false,
      requiresApiKey: false,
    };
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async initialize(): Promise<void> {
    if (!this.available) {
      throw new Error('Provider not available');
    }
  }

  async summarize() {
    if (this.shouldFail) throw new Error('Provider failed');
    return {
      summary: `Summary from ${this.metadata.type}`,
      keyPoints: ['Point 1', 'Point 2'],
      provider: this.metadata.type,
    };
  }

  async answerQuestion() {
    if (this.shouldFail) throw new Error('Provider failed');
    return {
      answer: `Answer from ${this.metadata.type}`,
      confidence: 0.9,
      provider: this.metadata.type,
    };
  }

  async extractThemes() {
    if (this.shouldFail) throw new Error('Provider failed');
    return {
      themes: ['Theme 1', 'Theme 2'],
      confidence: 0.85,
      provider: this.metadata.type,
    };
  }

  async suggestAnnotations() {
    if (this.shouldFail) throw new Error('Provider failed');
    return {
      text: `Annotations from ${this.metadata.type}`,
      provider: this.metadata.type,
      modelUsed: this.metadata.name,
      latency: 100,
    };
  }

  async compareTexts() {
    if (this.shouldFail) throw new Error('Provider failed');
    return {
      text: `Comparison from ${this.metadata.type}`,
      provider: this.metadata.type,
      modelUsed: this.metadata.name,
      latency: 100,
    };
  }

  async generateInsights() {
    if (this.shouldFail) throw new Error('Provider failed');
    return {
      text: `Insights from ${this.metadata.type}`,
      provider: this.metadata.type,
      modelUsed: this.metadata.name,
      latency: 100,
    };
  }

  async dispose(): Promise<void> {
    // Cleanup
  }
}

describe('AIRouter', () => {
  let router: AIRouter;
  let ollamaProvider: MockProvider;
  let claudeProvider: MockProvider;
  let browserProvider: MockProvider;

  beforeEach(() => {
    ollamaProvider = new MockProvider('ollama', true);
    claudeProvider = new MockProvider('claude', true);
    browserProvider = new MockProvider('browser-ml', true);

    const providers = new Map<AIProviderType, IAIProvider>([
      ['ollama', ollamaProvider],
      ['claude', claudeProvider],
      ['browser-ml', browserProvider],
    ]);

    router = new AIRouter(providers);
  });

  describe('provider selection', () => {
    it('should select first available provider in fallback chain', async () => {
      const selection = await router.selectProvider();
      expect(selection.provider).toBe(ollamaProvider);
      expect(selection.metadata.type).toBe('ollama');
    });

    it('should fallback to next provider if first is unavailable', async () => {
      ollamaProvider = new MockProvider('ollama', false);
      const providers = new Map<AIProviderType, IAIProvider>([
        ['ollama', ollamaProvider],
        ['claude', claudeProvider],
        ['browser-ml', browserProvider],
      ]);

      router = new AIRouter(providers);
      const selection = await router.selectProvider();

      expect(selection.provider).toBe(claudeProvider);
      expect(selection.metadata.type).toBe('claude');
    });

    it('should respect preferred provider', async () => {
      router = new AIRouter(
        new Map([
          ['ollama', ollamaProvider],
          ['claude', claudeProvider],
          ['browser-ml', browserProvider],
        ]),
        { preferredProvider: 'claude' }
      );

      const selection = await router.selectProvider();
      expect(selection.metadata.type).toBe('claude');
    });

    it('should throw error when no providers available', async () => {
      const unavailableProviders = new Map<AIProviderType, IAIProvider>([
        ['ollama', new MockProvider('ollama', false)],
        ['claude', new MockProvider('claude', false)],
        ['browser-ml', new MockProvider('browser-ml', false)],
      ]);

      router = new AIRouter(unavailableProviders);

      await expect(router.selectProvider()).rejects.toThrow(
        /No AI providers available/
      );
    });
  });

  describe('privacy mode', () => {
    it('should only use local providers in privacy mode', async () => {
      router = new AIRouter(
        new Map([
          ['ollama', ollamaProvider],
          ['claude', claudeProvider],
          ['browser-ml', browserProvider],
        ]),
        { privacyMode: true }
      );

      const selection = await router.selectProvider();
      expect(['ollama', 'browser-ml']).toContain(selection.metadata.type);
      expect(selection.metadata.type).not.toBe('claude');
    });

    it('should fallback within local providers only', async () => {
      ollamaProvider = new MockProvider('ollama', false);

      router = new AIRouter(
        new Map([
          ['ollama', ollamaProvider],
          ['claude', claudeProvider],
          ['browser-ml', browserProvider],
        ]),
        { privacyMode: true }
      );

      const selection = await router.selectProvider();
      expect(selection.metadata.type).toBe('browser-ml');
    });

    it('should update fallback chain when privacy settings change', () => {
      router.setPrivacySettings({
        user_id: 'test-user',
        privacy_mode_enabled: true,
        preferred_provider: 'ollama',
        allow_cloud_processing: false,
        require_confirmation_for_cloud: true,
        pii_detection_enabled: true,
        data_retention_days: 90,
      });

      // Verify fallback chain was updated (private method, test via behavior)
      expect(router['fallbackChain']).toEqual(['ollama', 'browser-ml']);
    });
  });

  describe('automatic fallback', () => {
    it('should automatically fallback on provider failure', async () => {
      ollamaProvider = new MockProvider('ollama', true, true); // Available but fails

      router = new AIRouter(
        new Map([
          ['ollama', ollamaProvider],
          ['claude', claudeProvider],
          ['browser-ml', browserProvider],
        ])
      );

      const result = await router.summarize('Test text');
      expect(result.provider).toBe('claude');
    });

    it('should try all providers before failing', async () => {
      const failingProviders = new Map<AIProviderType, IAIProvider>([
        ['ollama', new MockProvider('ollama', true, true)],
        ['claude', new MockProvider('claude', true, true)],
        ['browser-ml', new MockProvider('browser-ml', true, true)],
      ]);

      router = new AIRouter(failingProviders);

      await expect(router.summarize('Test')).rejects.toThrow(
        /All providers failed/
      );
    });

    it('should not retry on cancellation', async () => {
      const controller = new AbortController();

      ollamaProvider = new MockProvider('ollama', true, true);
      const ollamaSpy = vi.spyOn(ollamaProvider, 'summarize');

      router = new AIRouter(
        new Map([
          ['ollama', ollamaProvider],
          ['claude', claudeProvider],
        ])
      );

      // Simulate cancellation error
      ollamaSpy.mockRejectedValueOnce(new Error('Request cancelled'));

      await expect(
        router.summarize('Test', { signal: controller.signal })
      ).rejects.toThrow(/cancel/);

      // Should not have tried claude
      expect(ollamaSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('quality metrics', () => {
    it('should track success metrics', async () => {
      await router.summarize('Test');

      const metrics = router.getQualityMetrics();
      const ollamaMetrics = metrics.get('ollama');

      expect(ollamaMetrics).toBeDefined();
      expect(ollamaMetrics!.successRate).toBe(1.0);
      expect(ollamaMetrics!.totalRequests).toBe(1);
    });

    it('should track failure metrics', async () => {
      ollamaProvider = new MockProvider('ollama', true, true);

      router = new AIRouter(
        new Map([
          ['ollama', ollamaProvider],
          ['claude', claudeProvider],
        ]),
        { trackMetrics: true }
      );

      await router.summarize('Test');

      const metrics = router.getQualityMetrics();
      const ollamaMetrics = metrics.get('ollama');

      expect(ollamaMetrics!.successRate).toBe(0);
      expect(ollamaMetrics!.totalRequests).toBe(1);
    });

    it('should update metrics over multiple requests', async () => {
      router = new AIRouter(
        new Map([
          ['ollama', ollamaProvider],
          ['claude', claudeProvider],
        ]),
        { trackMetrics: true }
      );

      await router.summarize('Test 1');
      await router.summarize('Test 2');
      await router.summarize('Test 3');

      const metrics = router.getQualityMetrics();
      const ollamaMetrics = metrics.get('ollama');

      expect(ollamaMetrics!.totalRequests).toBe(3);
      expect(ollamaMetrics!.successRate).toBe(1.0);
    });
  });

  describe('provider status', () => {
    it('should return status for all providers', async () => {
      const status = await router.getProviderStatus();

      expect(status).toHaveLength(3);
      expect(status[0].available).toBe(true);
      expect(status[0].metadata).toBeDefined();
    });

    it('should indicate unavailable providers', async () => {
      ollamaProvider = new MockProvider('ollama', false);

      router = new AIRouter(
        new Map([
          ['ollama', ollamaProvider],
          ['claude', claudeProvider],
        ])
      );

      const status = await router.getProviderStatus();
      const ollamaStatus = status.find((s) => s.type === 'ollama');

      expect(ollamaStatus!.available).toBe(false);
    });
  });

  describe('initialization', () => {
    it('should initialize all providers', async () => {
      const ollamaInitSpy = vi.spyOn(ollamaProvider, 'initialize');
      const claudeInitSpy = vi.spyOn(claudeProvider, 'initialize');

      await router.initialize();

      expect(ollamaInitSpy).toHaveBeenCalled();
      expect(claudeInitSpy).toHaveBeenCalled();
    });

    it('should succeed if at least one provider initializes', async () => {
      const failingOllama = new MockProvider('ollama', false);

      router = new AIRouter(
        new Map([
          ['ollama', failingOllama],
          ['claude', claudeProvider],
        ])
      );

      await expect(router.initialize()).resolves.toBeUndefined();
    });

    it('should fail if no providers initialize', async () => {
      const failingProviders = new Map<AIProviderType, IAIProvider>([
        ['ollama', new MockProvider('ollama', false)],
        ['claude', new MockProvider('claude', false)],
      ]);

      router = new AIRouter(failingProviders);

      await expect(router.initialize()).rejects.toThrow(
        /No AI providers could be initialized/
      );
    });
  });

  describe('disposal', () => {
    it('should dispose all providers', async () => {
      const ollamaDisposeSpy = vi.spyOn(ollamaProvider, 'dispose');
      const claudeDisposeSpy = vi.spyOn(claudeProvider, 'dispose');

      await router.dispose();

      expect(ollamaDisposeSpy).toHaveBeenCalled();
      expect(claudeDisposeSpy).toHaveBeenCalled();
    });
  });

  describe('all provider methods', () => {
    it('should route answerQuestion correctly', async () => {
      const result = await router.answerQuestion('Context', 'Question?');
      expect(result.provider).toBe('ollama');
      expect(result.answer).toContain('Answer from ollama');
    });

    it('should route extractThemes correctly', async () => {
      const result = await router.extractThemes('Text');
      expect(result.provider).toBe('ollama');
      expect(result.themes).toHaveLength(2);
    });

    it('should route suggestAnnotations correctly', async () => {
      const result = await router.suggestAnnotations('Text');
      expect(result.provider).toBe('ollama');
      expect(result.text).toContain('Annotations from ollama');
    });

    it('should route compareTexts correctly', async () => {
      const result = await router.compareTexts('Text1', 'Text2');
      expect(result.provider).toBe('ollama');
      expect(result.text).toContain('Comparison from ollama');
    });

    it('should route generateInsights correctly', async () => {
      const result = await router.generateInsights('Text');
      expect(result.provider).toBe('ollama');
      expect(result.text).toContain('Insights from ollama');
    });
  });
});
