/**
 * AI Services - Main Export
 * Week 3 Claude Integration
 */

export { ClaudeService } from './ClaudeService';
export { PromptTemplateSystem } from './PromptTemplates';
export { ResponseCache } from './ResponseCache';
export { CostTracker } from './CostTracker';

export type {
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
  CacheEntry,
  CacheStats,
  UsageRecord,
  UsageStats,
  FeatureUsage,
  DailyUsage,
  CostEstimate,
  ClaudeServiceError,
  RateLimitError,
  AuthenticationError,
  CircuitBreakerError,
} from './types';

export type { BudgetAlert, UsageReport } from './CostTracker';
