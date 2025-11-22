/**
 * Cost Tracker Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CostTracker } from '../../../../src/services/ai/CostTracker';
import 'fake-indexeddb/auto';

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(async () => {
    tracker = new CostTracker({
      monthlyBudget: 100,
      alertThreshold: 80,
      enableAlerts: true,
    });
    await tracker.initialize();
  });

  afterEach(async () => {
    await tracker.clearAllRecords();
  });

  describe('Usage Recording', () => {
    it('should record usage', async () => {
      await tracker.recordUsage({
        feature: 'summarize',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.01,
      });

      const stats = await tracker.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalCost).toBe(0.01);
    });

    it('should record multiple usage entries', async () => {
      await tracker.recordUsage({
        feature: 'summarize',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.01,
      });

      await tracker.recordUsage({
        feature: 'answerQuestion',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 2000,
        outputTokens: 1000,
        cost: 0.03,
      });

      const stats = await tracker.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.totalCost).toBe(0.04);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await tracker.recordUsage({
        feature: 'summarize',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.01,
      });

      await tracker.recordUsage({
        feature: 'summarize',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1500,
        outputTokens: 750,
        cost: 0.015,
      });

      await tracker.recordUsage({
        feature: 'extractThemes',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 3000,
        outputTokens: 2000,
        cost: 0.05,
      });
    });

    it('should calculate total statistics', async () => {
      const stats = await tracker.getStats();

      expect(stats.totalRequests).toBe(3);
      expect(stats.totalCost).toBeCloseTo(0.075, 3);
      expect(stats.totalTokens).toBe(8250);
    });

    it('should group by feature', async () => {
      const stats = await tracker.getStats();

      expect(stats.byFeature.summarize).toBeDefined();
      expect(stats.byFeature.summarize.requests).toBe(2);
      expect(stats.byFeature.summarize.cost).toBeCloseTo(0.025, 3);

      expect(stats.byFeature.extractThemes).toBeDefined();
      expect(stats.byFeature.extractThemes.requests).toBe(1);
    });

    it('should group by day', async () => {
      const stats = await tracker.getStats();
      const today = new Date().toISOString().split('T')[0];

      expect(stats.byDay[today]).toBeDefined();
      expect(stats.byDay[today].requests).toBe(3);
      expect(stats.byDay[today].cost).toBeCloseTo(0.075, 3);
    });

    it('should filter by date range', async () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      const stats = await tracker.getStats(yesterday, tomorrow);
      expect(stats.totalRequests).toBe(3);
    });

    it('should get feature-specific stats', async () => {
      const summarizeStats = await tracker.getFeatureStats('summarize');

      expect(summarizeStats.requests).toBe(2);
      expect(summarizeStats.cost).toBeCloseTo(0.025, 3);
      expect(summarizeStats.tokens).toBe(3750);
    });

    it('should get current month stats', async () => {
      const monthStats = await tracker.getCurrentMonthStats();

      expect(monthStats.totalRequests).toBe(3);
      expect(monthStats.totalCost).toBeCloseTo(0.075, 3);
    });

    it('should get today stats', async () => {
      const todayStats = await tracker.getTodayStats();

      expect(todayStats.totalRequests).toBe(3);
      expect(todayStats.totalCost).toBeCloseTo(0.075, 3);
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate costs for Claude Sonnet 4', () => {
      const estimate = tracker.estimateCost(
        1_000_000,
        500_000,
        'claude-sonnet-4-20250514'
      );

      expect(estimate.estimatedTokens).toBe(1_500_000);
      expect(estimate.estimatedCost).toBeCloseTo(10.5, 1); // (1M/1M)*3 + (0.5M/1M)*15
    });

    it('should estimate costs for different models', () => {
      const sonnetEstimate = tracker.estimateCost(
        1_000_000,
        500_000,
        'claude-sonnet-4-20250514'
      );

      const haikuEstimate = tracker.estimateCost(
        1_000_000,
        500_000,
        'claude-3-haiku-20240307'
      );

      expect(haikuEstimate.estimatedCost).toBeLessThan(
        sonnetEstimate.estimatedCost
      );
    });
  });

  describe('Budget Management', () => {
    it('should track remaining budget', async () => {
      await tracker.recordUsage({
        feature: 'test',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 20,
      });

      const remaining = await tracker.getRemainingBudget();
      expect(remaining).toBe(80);
    });

    it('should project monthly spend', async () => {
      // Simulate 10 days of usage
      for (let i = 0; i < 10; i++) {
        await tracker.recordUsage({
          feature: 'test',
          model: 'claude-sonnet-4-20250514',
          inputTokens: 1000,
          outputTokens: 500,
          cost: 1,
        });
      }

      const projected = await tracker.getProjectedMonthlySpend();
      // Assuming 30-day month, should project ~30 total
      expect(projected).toBeGreaterThan(10);
    });

    it('should generate budget alerts when exceeded', async () => {
      await tracker.recordUsage({
        feature: 'test',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 150, // Exceeds budget
      });

      const alerts = await tracker.checkBudgetAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some((a) => a.type === 'budget-exceeded')).toBe(true);
    });

    it('should generate warning when approaching budget', async () => {
      await tracker.recordUsage({
        feature: 'test',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 85, // Above alert threshold
      });

      const alerts = await tracker.checkBudgetAlerts();
      expect(alerts.some((a) => a.type === 'approaching-budget')).toBe(true);
    });
  });

  describe('Usage Reports', () => {
    beforeEach(async () => {
      await tracker.recordUsage({
        feature: 'summarize',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.01,
      });

      await tracker.recordUsage({
        feature: 'extractThemes',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 2000,
        outputTokens: 1000,
        cost: 0.03,
      });
    });

    it('should export usage report', async () => {
      const report = await tracker.exportUsageReport();

      expect(report.generatedAt).toBeDefined();
      expect(report.period.start).toBeDefined();
      expect(report.period.end).toBeDefined();
      expect(report.summary.totalRequests).toBe(2);
      expect(report.records).toHaveLength(2);
    });

    it('should include top features in report', async () => {
      const report = await tracker.exportUsageReport();

      expect(report.topFeatures).toBeDefined();
      expect(report.topFeatures.length).toBeGreaterThan(0);
      expect(report.topFeatures[0].feature).toBeDefined();
      expect(report.topFeatures[0].cost).toBeGreaterThan(0);
    });

    it('should provide recommendations', async () => {
      const report = await tracker.exportUsageReport();

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should export report for date range', async () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;

      const report = await tracker.exportUsageReport(yesterday, tomorrow);

      expect(report.period.start).toBe(yesterday);
      expect(report.period.end).toBe(tomorrow);
    });
  });

  describe('Event Listeners', () => {
    it('should notify listeners on usage recording', async () => {
      let notified = false;

      tracker.addListener(() => {
        notified = true;
      });

      await tracker.recordUsage({
        feature: 'test',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.01,
      });

      expect(notified).toBe(true);
    });

    it('should remove listeners', async () => {
      let count = 0;

      const listener = () => {
        count++;
      };

      tracker.addListener(listener);

      await tracker.recordUsage({
        feature: 'test',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.01,
      });

      tracker.removeListener(listener);

      await tracker.recordUsage({
        feature: 'test',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.01,
      });

      expect(count).toBe(1);
    });
  });

  describe('Data Management', () => {
    it('should clear old records', async () => {
      // Record old entry
      await tracker.recordUsage({
        feature: 'old',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.01,
      });

      const deleted = await tracker.clearOldRecords(0); // Clear everything older than now
      expect(deleted).toBeGreaterThan(0);
    });

    it('should clear all records', async () => {
      await tracker.recordUsage({
        feature: 'test1',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.01,
      });

      await tracker.recordUsage({
        feature: 'test2',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.01,
      });

      await tracker.clearAllRecords();

      const stats = await tracker.getStats();
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('Document-Specific Tracking', () => {
    it('should track usage per document', async () => {
      await tracker.recordUsage({
        feature: 'summarize',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        cost: 0.01,
        documentId: 'doc-123',
      });

      await tracker.recordUsage({
        feature: 'extractThemes',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 2000,
        outputTokens: 1000,
        cost: 0.03,
        documentId: 'doc-123',
      });

      const docStats = await tracker.getDocumentStats('doc-123');

      expect(docStats.totalRequests).toBe(2);
      expect(docStats.totalCost).toBeCloseTo(0.04, 2);
      expect(Object.keys(docStats.byFeature)).toHaveLength(2);
    });
  });
});
