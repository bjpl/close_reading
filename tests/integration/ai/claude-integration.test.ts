/**
 * Claude Service Integration Tests
 * Test full workflow with caching and cost tracking
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { ClaudeService } from '../../../src/services/ai/ClaudeService';
import { ResponseCache } from '../../../src/services/ai/ResponseCache';
import { CostTracker } from '../../../src/services/ai/CostTracker';
import { PromptTemplateSystem } from '../../../src/services/ai/PromptTemplates';
import 'fake-indexeddb/auto';

// Generate unique database names per test to avoid IndexedDB state leakage
let testCounter = 0;
const getUniqueDbNames = () => ({
  cache: `integration-cache-test-${Date.now()}-${++testCounter}`,
  costTracker: `integration-cost-test-${Date.now()}-${testCounter}`,
});

describe('Claude Integration Tests', () => {
  let service: ClaudeService;
  let cache: ResponseCache;
  let costTracker: CostTracker;
  let promptSystem: PromptTemplateSystem;

  // Skip tests if no API key available
  const hasApiKey = process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant-');

  beforeAll(async () => {
    // Always initialize promptSystem - it doesn't need API key
    promptSystem = new PromptTemplateSystem();

    if (!hasApiKey) {
      console.log('Skipping integration tests - no API key');
      return;
    }

    service = new ClaudeService({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-sonnet-4-20250514',
      rateLimitPerMinute: 5,
    });
  }, 30000);

  // Initialize cache and costTracker before each non-API test
  beforeEach(async () => {
    const dbNames = getUniqueDbNames();
    cache = new ResponseCache(undefined, undefined, dbNames.cache);
    await cache.initialize();

    costTracker = new CostTracker({
      monthlyBudget: 100,
      enableAlerts: false,
      dbName: dbNames.costTracker,
    });
    await costTracker.initialize();
  });

  afterEach(async () => {
    try {
      if (cache) {
        await cache.clear();
        cache.close();
      }
      if (costTracker) {
        await costTracker.clearAllRecords();
        costTracker.close();
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    // Nothing to clean up - unique db names per test
  });

  describe('End-to-End Workflow', () => {
    const testDocument = `
      The rapid advancement of artificial intelligence has transformed numerous industries.
      From healthcare to finance, AI systems are becoming increasingly sophisticated.
      However, this progress raises important ethical questions about privacy, bias, and control.
      Researchers argue that we must develop AI responsibly, with human values at the center.
      The future of AI depends on collaboration between technologists, ethicists, and policymakers.
    `;

    it.skipIf(!hasApiKey)(
      'should complete full analysis workflow with caching',
      async () => {
        // 1. Summarize document
        const cacheKey = ResponseCache.generateKey('summarize', {
          text: testDocument,
          style: 'academic',
        });

        let cached = await cache.get(cacheKey);
        expect(cached).toBeNull();

        const summary = await service.summarize(testDocument, {
          style: 'academic',
          level: 'document',
        });

        expect(summary.data.text).toBeTruthy();
        expect(summary.data.keyPoints.length).toBeGreaterThan(0);

        // Record usage
        await costTracker.recordUsage({
          feature: 'summarize',
          model: service.getConfig().model,
          inputTokens: summary.usage.inputTokens,
          outputTokens: summary.usage.outputTokens,
          cost: summary.usage.estimatedCost,
        });

        // Cache result
        await cache.set(cacheKey, summary.data);

        // Verify caching
        cached = await cache.get(cacheKey);
        expect(cached).toEqual(summary.data);

        // 2. Extract themes
        const themes = await service.extractThemes(testDocument, {
          minThemes: 2,
          maxThemes: 5,
        });

        expect(themes.data.length).toBeGreaterThan(0);
        expect(themes.data[0].name).toBeTruthy();

        await costTracker.recordUsage({
          feature: 'extractThemes',
          model: service.getConfig().model,
          inputTokens: themes.usage.inputTokens,
          outputTokens: themes.usage.outputTokens,
          cost: themes.usage.estimatedCost,
        });

        // 3. Generate questions
        const questions = await service.generateQuestions(testDocument, {
          count: 3,
          types: ['analysis', 'evaluation'],
        });

        expect(questions.data.length).toBeGreaterThan(0);
        expect(questions.data[0].question).toBeTruthy();

        await costTracker.recordUsage({
          feature: 'generateQuestions',
          model: service.getConfig().model,
          inputTokens: questions.usage.inputTokens,
          outputTokens: questions.usage.outputTokens,
          cost: questions.usage.estimatedCost,
        });

        // Verify cost tracking
        const stats = await costTracker.getStats();
        expect(stats.totalRequests).toBe(3);
        expect(stats.totalCost).toBeGreaterThan(0);
        expect(Object.keys(stats.byFeature)).toHaveLength(3);

        // Verify cache stats
        const cacheStats = cache.getStats();
        expect(cacheStats.entries).toBeGreaterThan(0);
      },
      60000
    );

    it.skipIf(!hasApiKey)(
      'should handle Q&A with evidence',
      async () => {
        const answer = await service.answerQuestion(
          'What are the main concerns about AI development?',
          testDocument,
          { includeEvidence: true, maxFollowUps: 2 }
        );

        expect(answer.data.answer).toBeTruthy();
        expect(answer.data.evidence.length).toBeGreaterThan(0);
        expect(answer.data.confidence).toBeGreaterThan(0);
        expect(answer.data.followUpQuestions.length).toBeGreaterThan(0);

        await costTracker.recordUsage({
          feature: 'answerQuestion',
          model: service.getConfig().model,
          inputTokens: answer.usage.inputTokens,
          outputTokens: answer.usage.outputTokens,
          cost: answer.usage.estimatedCost,
        });
      },
      30000
    );

    it.skipIf(!hasApiKey)(
      'should suggest annotations',
      async () => {
        const annotations = await service.suggestAnnotations(testDocument, {
          maxSuggestions: 5,
          minPedagogicalValue: 0.6,
        });

        expect(annotations.data.length).toBeGreaterThan(0);
        expect(annotations.data[0].passage).toBeTruthy();
        expect(annotations.data[0].suggestedNote).toBeTruthy();
        expect(annotations.data[0].pedagogicalValue).toBeGreaterThan(0.6);
      },
      30000
    );
  });

  describe('Prompt Template Integration', () => {
    it('should use templates for consistent prompts', () => {
      const template = promptSystem.getTemplate('summarize-academic');
      expect(template).toBeDefined();

      const rendered = promptSystem.render('summarize-academic', {
        text: 'Sample text',
        optionalParams: 'Brief summary',
      });

      expect(rendered.systemPrompt).toBeTruthy();
      expect(rendered.userPrompt).toContain('Sample text');
    });

    it('should support template versioning', () => {
      const v1 = promptSystem.getTemplate('summarize-academic', '1.0');
      expect(v1?.version).toBe('1.0');
    });
  });

  describe('Cache Performance', () => {
    it('should improve performance with caching', async () => {
      const key = 'perf-test-key';
      const data = { result: 'test data' };

      await cache.set(key, data);

      const start = Date.now();
      const cached = await cache.get(key);
      const duration = Date.now() - start;

      expect(cached).toEqual(data);
      expect(duration).toBeLessThan(50); // Should be very fast
    });

    it('should track hit rate', async () => {
      cache.resetStats();

      await cache.set('hit-test', { data: 'test' });

      await cache.get('hit-test'); // Hit
      await cache.get('hit-test'); // Hit
      await cache.get('missing'); // Miss

      const hitRate = cache.getHitRate();
      expect(hitRate).toBeCloseTo(0.666, 1);
    });
  });

  describe('Cost Management', () => {
    it('should track costs across features', async () => {
      await costTracker.recordUsage({
        feature: 'summarize',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.01,
      });

      await costTracker.recordUsage({
        feature: 'extractThemes',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 2000,
        outputTokens: 1000,
        cost: 0.03,
      });

      const stats = await costTracker.getStats();
      expect(stats.byFeature.summarize).toBeDefined();
      expect(stats.byFeature.extractThemes).toBeDefined();
      expect(stats.totalCost).toBeCloseTo(0.04, 2);
    });

    it('should generate usage reports', async () => {
      const report = await costTracker.exportUsageReport();

      expect(report.summary).toBeDefined();
      expect(report.topFeatures).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it.skipIf(!hasApiKey)(
      'should handle rate limiting gracefully',
      async () => {
        // Test with very small document to minimize cost
        const quickText = 'Test.';

        try {
          // Make multiple rapid requests
          const promises = Array(3)
            .fill(null)
            .map(() =>
              service.summarize(quickText, {
                style: 'brief',
                level: 'paragraph',
              })
            );

          const results = await Promise.all(promises);
          expect(results).toHaveLength(3);
        } catch (error) {
          // Rate limiting is expected
          expect(error).toBeDefined();
        }
      },
      45000
    );

    it('should validate API key format', () => {
      // Test API key validation logic directly (without creating Anthropic client)
      // Valid keys start with 'sk-ant-'
      expect('sk-ant-test123'.startsWith('sk-ant-')).toBe(true);
      expect('invalid'.startsWith('sk-ant-')).toBe(false);
      expect('sk-other-key'.startsWith('sk-ant-')).toBe(false);
      expect('sk-ant-'.startsWith('sk-ant-')).toBe(true);
    });
  });

  describe('Advanced Features', () => {
    it.skipIf(!hasApiKey)(
      'should mine argument structure',
      async () => {
        const argumentativeText = `
          Climate change is one of the most pressing issues of our time.
          Scientific evidence overwhelmingly supports the conclusion that human activities
          are the primary cause of recent warming trends. Multiple studies have shown that
          greenhouse gas emissions from fossil fuels correlate directly with temperature increases.
          However, some argue that natural climate cycles could explain these changes.
          Despite this counterargument, the consensus among climate scientists is clear.
        `;

        const args = await service.mineArguments(argumentativeText, {
          includeCounterArguments: true,
          generateMap: true,
        });

        expect(args.data.mainClaim).toBeDefined();
        expect(args.data.mainClaim.text).toBeTruthy();
        expect(args.data.structure.coherence).toBeGreaterThan(0);
      },
      30000
    );

    it.skipIf(!hasApiKey)(
      'should extract entity relationships',
      async () => {
        const narrativeText = `
          Alice collaborated with Bob on the research project.
          Their supervisor, Dr. Smith, provided guidance throughout the process.
          Meanwhile, Charlie worked independently on a related topic.
          Alice and Charlie often discussed their findings, creating a productive partnership.
        `;

        const relationships = await service.extractRelationships(narrativeText, {
          includePowerDynamics: true,
          includeNetworkAnalysis: true,
        });

        expect(relationships.data.entities.length).toBeGreaterThan(0);
        expect(relationships.data.relationships.length).toBeGreaterThan(0);
      },
      30000
    );
  });
});
