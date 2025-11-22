/**
 * Cost Tracker System
 * Track usage, estimate costs, monitor spending for Claude API
 */

import { openDB, type IDBPDatabase } from 'idb';
import type {
  UsageRecord,
  UsageStats,
  FeatureUsage,
  DailyUsage,
  CostEstimate,
} from './types';

const DB_NAME = 'claude-cost-tracker';
const STORE_NAME = 'usage-records';
const ALERT_THRESHOLD = 100; // $100 monthly default

export interface CostTrackerConfig {
  monthlyBudget?: number;
  alertThreshold?: number;
  enableAlerts?: boolean;
}

export class CostTracker {
  private db: IDBPDatabase | null = null;
  private config: Required<CostTrackerConfig>;
  private listeners: Set<(stats: UsageStats) => void> = new Set();

  constructor(config: CostTrackerConfig = {}) {
    this.config = {
      monthlyBudget: config.monthlyBudget || 200,
      alertThreshold: config.alertThreshold || ALERT_THRESHOLD,
      enableAlerts: config.enableAlerts !== false,
    };
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  async initialize(): Promise<void> {
    this.db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'timestamp',
            autoIncrement: true,
          });
          store.createIndex('feature', 'feature');
          store.createIndex('documentId', 'documentId');
          store.createIndex('model', 'model');
          store.createIndex('date', 'timestamp');
        }
      },
    });
  }

  // ==========================================================================
  // Usage Recording
  // ==========================================================================

  async recordUsage(record: Omit<UsageRecord, 'timestamp'>): Promise<void> {
    if (!this.db) {
      throw new Error('CostTracker not initialized');
    }

    const fullRecord: UsageRecord = {
      ...record,
      timestamp: Date.now(),
    };

    await this.db.add(STORE_NAME, fullRecord);

    // Check for budget alerts
    if (this.config.enableAlerts) {
      await this.checkBudgetAlerts();
    }

    // Notify listeners
    const stats = await this.getStats();
    this.notifyListeners(stats);
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  async getStats(startDate?: number, endDate?: number): Promise<UsageStats> {
    if (!this.db) {
      throw new Error('CostTracker not initialized');
    }

    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    let records = await store.getAll();

    // Filter by date range
    if (startDate || endDate) {
      records = records.filter((record) => {
        if (startDate && record.timestamp < startDate) return false;
        if (endDate && record.timestamp > endDate) return false;
        return true;
      });
    }

    // Calculate totals
    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = records.reduce(
      (sum, r) => sum + r.inputTokens + r.outputTokens,
      0
    );

    // By feature
    const byFeature: Record<string, FeatureUsage> = {};
    for (const record of records) {
      if (!byFeature[record.feature]) {
        byFeature[record.feature] = {
          requests: 0,
          tokens: 0,
          cost: 0,
        };
      }
      byFeature[record.feature].requests++;
      byFeature[record.feature].tokens += record.inputTokens + record.outputTokens;
      byFeature[record.feature].cost += record.cost;
    }

    // By day
    const byDay: Record<string, DailyUsage> = {};
    for (const record of records) {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      if (!byDay[date]) {
        byDay[date] = {
          date,
          requests: 0,
          tokens: 0,
          cost: 0,
        };
      }
      byDay[date].requests++;
      byDay[date].tokens += record.inputTokens + record.outputTokens;
      byDay[date].cost += record.cost;
    }

    return {
      totalCost,
      totalRequests: records.length,
      totalTokens,
      byFeature,
      byDay,
    };
  }

  async getCurrentMonthStats(): Promise<UsageStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return this.getStats(startOfMonth);
  }

  async getTodayStats(): Promise<UsageStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.getStats(today.getTime());
  }

  async getFeatureStats(feature: string): Promise<FeatureUsage> {
    if (!this.db) {
      throw new Error('CostTracker not initialized');
    }

    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('feature');
    const records = await index.getAll(feature);

    return {
      requests: records.length,
      tokens: records.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0),
      cost: records.reduce((sum, r) => sum + r.cost, 0),
    };
  }

  async getDocumentStats(documentId: string): Promise<UsageStats> {
    if (!this.db) {
      throw new Error('CostTracker not initialized');
    }

    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('documentId');
    const records = await index.getAll(documentId);

    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = records.reduce(
      (sum, r) => sum + r.inputTokens + r.outputTokens,
      0
    );

    const byFeature: Record<string, FeatureUsage> = {};
    for (const record of records) {
      if (!byFeature[record.feature]) {
        byFeature[record.feature] = { requests: 0, tokens: 0, cost: 0 };
      }
      byFeature[record.feature].requests++;
      byFeature[record.feature].tokens += record.inputTokens + record.outputTokens;
      byFeature[record.feature].cost += record.cost;
    }

    return {
      totalCost,
      totalRequests: records.length,
      totalTokens,
      byFeature,
      byDay: {},
    };
  }

  // ==========================================================================
  // Cost Estimation
  // ==========================================================================

  estimateCost(
    inputTokens: number,
    outputTokens: number,
    model: string
  ): CostEstimate {
    const pricing = this.getPricing(model);
    const cost =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output;

    return {
      estimatedTokens: inputTokens + outputTokens,
      estimatedCost: cost,
      model,
    };
  }

  private getPricing(model: string): { input: number; output: number } {
    // Pricing per 1M tokens
    const pricingTable: Record<string, { input: number; output: number }> = {
      'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
      'claude-sonnet-4.5-20250929': { input: 3.0, output: 15.0 },
      'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
      'claude-3-opus-20240229': { input: 15.0, output: 75.0 },
      'claude-3-sonnet-20240229': { input: 3.0, output: 15.0 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    };

    return pricingTable[model] || pricingTable['claude-sonnet-4-20250514'];
  }

  // ==========================================================================
  // Budget Management
  // ==========================================================================

  async checkBudgetAlerts(): Promise<BudgetAlert[]> {
    const monthStats = await this.getCurrentMonthStats();
    const alerts: BudgetAlert[] = [];

    // Monthly budget alert
    if (monthStats.totalCost > this.config.monthlyBudget) {
      alerts.push({
        type: 'budget-exceeded',
        severity: 'critical',
        message: `Monthly budget exceeded: $${monthStats.totalCost.toFixed(2)} / $${this.config.monthlyBudget}`,
        currentSpend: monthStats.totalCost,
        budget: this.config.monthlyBudget,
      });
    } else if (monthStats.totalCost > this.config.alertThreshold) {
      alerts.push({
        type: 'approaching-budget',
        severity: 'warning',
        message: `Approaching monthly budget: $${monthStats.totalCost.toFixed(2)} / $${this.config.monthlyBudget}`,
        currentSpend: monthStats.totalCost,
        budget: this.config.monthlyBudget,
      });
    }

    // Daily spike alert (>20% of daily average)
    const daysInMonth = new Date().getDate();
    const dailyAverage = monthStats.totalCost / daysInMonth;
    const todayStats = await this.getTodayStats();

    if (todayStats.totalCost > dailyAverage * 1.5) {
      alerts.push({
        type: 'unusual-spending',
        severity: 'warning',
        message: `Unusual spending today: $${todayStats.totalCost.toFixed(2)} (avg: $${dailyAverage.toFixed(2)})`,
        currentSpend: todayStats.totalCost,
        budget: dailyAverage,
      });
    }

    return alerts;
  }

  getRemainingBudget(): Promise<number> {
    return this.getCurrentMonthStats().then(
      (stats) => this.config.monthlyBudget - stats.totalCost
    );
  }

  getProjectedMonthlySpend(): Promise<number> {
    return this.getCurrentMonthStats().then((stats) => {
      const now = new Date();
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();
      const currentDay = now.getDate();
      const dailyAverage = stats.totalCost / currentDay;
      return dailyAverage * daysInMonth;
    });
  }

  // ==========================================================================
  // Export/Import
  // ==========================================================================

  async exportUsageReport(
    startDate?: number,
    endDate?: number
  ): Promise<UsageReport> {
    const stats = await this.getStats(startDate, endDate);

    if (!this.db) {
      throw new Error('CostTracker not initialized');
    }

    const tx = this.db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    let records = await store.getAll();

    if (startDate || endDate) {
      records = records.filter((record) => {
        if (startDate && record.timestamp < startDate) return false;
        if (endDate && record.timestamp > endDate) return false;
        return true;
      });
    }

    return {
      generatedAt: Date.now(),
      period: {
        start: startDate || records[0]?.timestamp || Date.now(),
        end: endDate || Date.now(),
      },
      summary: stats,
      records,
      topFeatures: this.getTopFeatures(stats.byFeature),
      recommendations: await this.generateRecommendations(stats),
    };
  }

  private getTopFeatures(
    byFeature: Record<string, FeatureUsage>
  ): Array<{ feature: string; cost: number; percentage: number }> {
    const total = Object.values(byFeature).reduce((sum, f) => sum + f.cost, 0);

    return Object.entries(byFeature)
      .map(([feature, usage]) => ({
        feature,
        cost: usage.cost,
        percentage: (usage.cost / total) * 100,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
  }

  private async generateRecommendations(stats: UsageStats): Promise<string[]> {
    const recommendations: string[] = [];

    // High-cost features
    const sortedFeatures = Object.entries(stats.byFeature)
      .sort((a, b) => b[1].cost - a[1].cost);

    if (sortedFeatures.length > 0) {
      const topFeature = sortedFeatures[0];
      const topPercentage = (topFeature[1].cost / stats.totalCost) * 100;

      if (topPercentage > 50) {
        recommendations.push(
          `${topFeature[0]} accounts for ${topPercentage.toFixed(1)}% of costs. Consider caching results or using shorter contexts.`
        );
      }
    }

    // Token efficiency
    const avgTokensPerRequest = stats.totalTokens / stats.totalRequests;
    if (avgTokensPerRequest > 4000) {
      recommendations.push(
        `Average ${avgTokensPerRequest.toFixed(0)} tokens per request. Consider chunking large documents.`
      );
    }

    // Budget tracking
    const projected = await this.getProjectedMonthlySpend();
    if (projected > this.config.monthlyBudget) {
      recommendations.push(
        `Projected monthly spend: $${projected.toFixed(2)}. Consider implementing stricter caching or rate limiting.`
      );
    }

    return recommendations;
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  addListener(listener: (stats: UsageStats) => void): void {
    this.listeners.add(listener);
  }

  removeListener(listener: (stats: UsageStats) => void): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(stats: UsageStats): void {
    for (const listener of this.listeners) {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in cost tracker listener:', error);
      }
    }
  }

  // ==========================================================================
  // Data Management
  // ==========================================================================

  async clearOldRecords(olderThanDays = 90): Promise<number> {
    if (!this.db) {
      throw new Error('CostTracker not initialized');
    }

    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const tx = this.db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const records = await store.getAll();

    let deleted = 0;
    for (const record of records) {
      if (record.timestamp < cutoff) {
        await store.delete(record.timestamp);
        deleted++;
      }
    }

    return deleted;
  }

  async clearAllRecords(): Promise<void> {
    if (!this.db) {
      throw new Error('CostTracker not initialized');
    }

    await this.db.clear(STORE_NAME);
  }
}

// ==========================================================================
// Types
// ==========================================================================

export interface BudgetAlert {
  type: 'budget-exceeded' | 'approaching-budget' | 'unusual-spending';
  severity: 'warning' | 'critical';
  message: string;
  currentSpend: number;
  budget: number;
}

export interface UsageReport {
  generatedAt: number;
  period: {
    start: number;
    end: number;
  };
  summary: UsageStats;
  records: UsageRecord[];
  topFeatures: Array<{
    feature: string;
    cost: number;
    percentage: number;
  }>;
  recommendations: string[];
}

export default CostTracker;
