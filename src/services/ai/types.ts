/**
 * Type definitions for Claude AI Service
 * Week 3 Implementation - Premium AI Features
 */

// ============================================================================
// Core Types
// ============================================================================

export interface PrivacySettings {
  privacy_mode_enabled: boolean;
  allow_cloud_processing: boolean;
  require_confirmation_for_cloud: boolean;
  pii_detection_enabled: boolean;
  data_retention_days: number;
  user_id?: string;
  userId?: string;
  preferred_provider?: AIProviderType;
  preferredProvider?: AIProviderType;
}

export type AIProviderType = 'ollama' | 'claude' | 'browser-ml';
export type PIIType = 'email' | 'phone' | 'ssn' | 'credit-card' | 'address' | 'name' | 'date-of-birth' | 'medical';

export interface PIIDetectionResult {
  found: boolean;
  types: PIIType[];
  sanitized?: string;
  locations: Array<{ start: number; end: number; type: PIIType; value?: string }>;
  confidence: number;
}

export interface PrivacyAuditLog {
  id?: string;
  timestamp: number | string;
  action: string;
  provider: AIProviderType;
  piiDetected?: boolean;
  pii_detected?: boolean;
  pii_types?: PIIType[];
  user_id?: string;
  userId: string;
  user_approved?: boolean;
}

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  rateLimitPerMinute?: number;
}

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  timestamp: number;
}

export interface ClaudeResponse<T> {
  data: T;
  usage: ClaudeUsage;
  cached: boolean;
  model: string;
}

// ============================================================================
// Feature 1: Document Summarization
// ============================================================================

export type SummaryStyle = 'academic' | 'brief' | 'detailed';
export type SummaryLevel = 'document' | 'section' | 'paragraph';

export interface SummarizationOptions {
  style: SummaryStyle;
  level: SummaryLevel;
  maxLength?: number;
  includeCitations?: boolean;
  focusAreas?: string[];
}

export interface Summary {
  text: string;
  style: SummaryStyle;
  level: SummaryLevel;
  keyPoints: string[];
  citations?: Citation[];
  wordCount: number;
  confidence: number;
}

export interface Citation {
  text: string;
  source: string;
  page?: number;
  paragraph?: number;
}

// ============================================================================
// Feature 2: Q&A System
// ============================================================================

export interface QuestionOptions {
  includeEvidence?: boolean;
  confidenceThreshold?: number;
  maxFollowUps?: number;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  evidence: Evidence[];
  confidence: number;
  followUpQuestions: string[];
  reasoning: string;
}

export interface Evidence {
  quote: string;
  source: string;
  page?: number;
  relevanceScore: number;
  context?: string;
}

// ============================================================================
// Feature 3: Theme Extraction
// ============================================================================

export interface ThemeExtractionOptions {
  minThemes?: number;
  maxThemes?: number;
  includeExamples?: boolean;
  depth?: 'surface' | 'moderate' | 'deep';
}

export interface Theme {
  name: string;
  description: string;
  examples: ThemeExample[];
  prevalence: number;
  relatedThemes: string[];
  interpretation: string;
}

export interface ThemeExample {
  text: string;
  location: string;
  context: string;
  significance: string;
}

// ============================================================================
// Feature 4: Annotation Suggestions
// ============================================================================

export type AnnotationType =
  | 'key-passage'
  | 'definition'
  | 'question'
  | 'connection'
  | 'analysis'
  | 'controversy'
  | 'methodology';

export interface AnnotationSuggestion {
  type: AnnotationType;
  passage: string;
  location: {
    page?: number;
    paragraph?: number;
    startOffset: number;
    endOffset: number;
  };
  reasoning: string;
  suggestedNote: string;
  pedagogicalValue: number;
  relatedConcepts: string[];
}

export interface AnnotationSuggestionsOptions {
  types?: AnnotationType[];
  minPedagogicalValue?: number;
  maxSuggestions?: number;
}

// ============================================================================
// Feature 5: Argument Mining
// ============================================================================

export type ClaimType = 'main' | 'supporting' | 'counter';

export interface Claim {
  type: ClaimType;
  text: string;
  location: string;
  evidence: Evidence[];
  strength: number;
  relatedClaims: string[];
}

export interface ArgumentStructure {
  mainClaim: Claim;
  supportingClaims: Claim[];
  counterClaims: Claim[];
  evidence: Evidence[];
  structure: {
    coherence: number;
    completeness: number;
    logicalFlow: string;
  };
  argumentMap: ArgumentMap;
}

export interface ArgumentMap {
  nodes: ArgumentNode[];
  edges: ArgumentEdge[];
}

export interface ArgumentNode {
  id: string;
  type: 'claim' | 'evidence' | 'reasoning';
  text: string;
  strength: number;
}

export interface ArgumentEdge {
  from: string;
  to: string;
  type: 'supports' | 'refutes' | 'qualifies';
  strength: number;
}

export interface ArgumentMiningOptions {
  includeCounterArguments?: boolean;
  minStrength?: number;
  generateMap?: boolean;
}

// ============================================================================
// Feature 6: Question Generation
// ============================================================================

export type QuestionType =
  | 'clarification'
  | 'analysis'
  | 'synthesis'
  | 'evaluation'
  | 'application';

export interface GeneratedQuestion {
  question: string;
  type: QuestionType;
  difficulty: 'introductory' | 'intermediate' | 'advanced';
  focusArea: string;
  suggestedAnswer?: string;
  relatedConcepts: string[];
  pedagogicalGoal: string;
}

export interface QuestionGenerationOptions {
  types?: QuestionType[];
  difficulty?: 'introductory' | 'intermediate' | 'advanced';
  count?: number;
  includeAnswers?: boolean;
}

// ============================================================================
// Feature 7: Entity Relationships
// ============================================================================

export type RelationshipType =
  | 'character'
  | 'concept'
  | 'institution'
  | 'event'
  | 'location';

export interface Entity {
  name: string;
  type: RelationshipType;
  description: string;
  firstMention: string;
  significance: number;
}

export interface Relationship {
  entity1: string;
  entity2: string;
  type: string;
  description: string;
  strength: number;
  evolution?: string;
  evidence: Evidence[];
}

export interface EntityNetwork {
  entities: Entity[];
  relationships: Relationship[];
  powerDynamics: PowerDynamic[];
  socialStructure: {
    centrality: Record<string, number>;
    clusters: EntityCluster[];
  };
}

export interface PowerDynamic {
  dominant: string;
  subordinate: string;
  basis: string;
  stability: number;
}

export interface EntityCluster {
  name: string;
  members: string[];
  cohesion: number;
}

export interface EntityRelationshipOptions {
  types?: RelationshipType[];
  minSignificance?: number;
  includePowerDynamics?: boolean;
  includeNetworkAnalysis?: boolean;
}

// ============================================================================
// Feature 8: Comparative Analysis
// ============================================================================

export interface ComparativeAnalysisOptions {
  focusAreas?: string[];
  includeThemes?: boolean;
  includeSynthesis?: boolean;
  depth?: 'surface' | 'moderate' | 'deep';
}

export interface ComparativeAnalysis {
  documents: DocumentComparison[];
  themes: CrossDocumentTheme[];
  similarities: Similarity[];
  differences: Difference[];
  synthesis: Synthesis;
}

export interface DocumentComparison {
  documentId: string;
  title: string;
  summary: string;
  keyThemes: string[];
}

export interface CrossDocumentTheme {
  theme: string;
  occurrences: ThemeOccurrence[];
  interpretation: string;
}

export interface ThemeOccurrence {
  documentId: string;
  examples: string[];
  treatment: string;
}

export interface Similarity {
  aspect: string;
  description: string;
  evidence: Evidence[];
  significance: number;
}

export interface Difference {
  aspect: string;
  document1Approach: string;
  document2Approach: string;
  significance: number;
}

export interface Synthesis {
  overallAnalysis: string;
  keyInsights: string[];
  suggestedConnections: string[];
  futureDirections: string[];
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
}

// ============================================================================
// Cost Tracking Types
// ============================================================================

export interface UsageRecord {
  timestamp: number;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  documentId?: string;
}

export interface UsageStats {
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
  byFeature: Record<string, FeatureUsage>;
  byDay: Record<string, DailyUsage>;
}

export interface FeatureUsage {
  requests: number;
  tokens: number;
  cost: number;
}

export interface DailyUsage {
  date: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface CostEstimate {
  estimatedTokens: number;
  estimatedCost: number;
  model: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class ClaudeServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ClaudeServiceError';
  }
}

export class RateLimitError extends ClaudeServiceError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT', 429, true);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends ClaudeServiceError {
  constructor(message: string = 'Invalid API key') {
    super(message, 'AUTH_ERROR', 401, false);
    this.name = 'AuthenticationError';
  }
}

export class CircuitBreakerError extends ClaudeServiceError {
  constructor(message: string = 'Circuit breaker open') {
    super(message, 'CIRCUIT_BREAKER', 503, true);
    this.name = 'CircuitBreakerError';
  }
}

// ============================================================================
// AI Provider Interface and Types
// ============================================================================

export interface AIProviderMetadata {
  name: string;
  type: AIProviderType;
  cost: 'free' | 'paid' | 'hybrid';
  speed: 'slow' | 'fast' | 'medium';
  quality: 'low' | 'medium' | 'high';
  privacy: 'local' | 'cloud' | 'hybrid';
  requiresSetup: boolean;
  requiresApiKey: boolean;
}

export interface AIRequestOptions {
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  signal?: AbortSignal;
  timeout?: number;
  retries?: number;
  [key: string]: any;
}

export interface AIResponse {
  text: string;
  model?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  provider?: AIProviderType;
  cached?: boolean;
  metadata?: Record<string, any>;
}

export interface SummaryResult extends AIResponse {
  summary: string;
  keyPoints?: string[];
  style?: SummaryStyle;
  level?: SummaryLevel;
}

export interface QuestionAnswerResult extends AIResponse {
  answer: string;
  confidence?: number;
  sources?: string[];
}

export interface ThemeExtractionResult extends AIResponse {
  themes: Theme[];
  analysis?: string;
}

export interface ProviderSelection {
  provider: IAIProvider;
  metadata: AIProviderMetadata;
  reason: string;
}

export type ProviderSelectionStrategy =
  | 'user-preference'
  | 'auto-best'
  | 'privacy-first'
  | 'performance-first'
  | 'cost-first';

export interface IAIProvider {
  metadata: AIProviderMetadata;
  initialize(): Promise<void>;
  isAvailable(): Promise<boolean>;
  summarize(text: string, options?: AIRequestOptions): Promise<SummaryResult>;
  answerQuestion(
    text: string,
    question: string,
    options?: AIRequestOptions
  ): Promise<QuestionAnswerResult>;
  extractThemes(text: string, options?: AIRequestOptions): Promise<ThemeExtractionResult>;
  suggestAnnotations(text: string, options?: AIRequestOptions): Promise<AIResponse>;
  compareTexts(text1: string, text2: string, options?: AIRequestOptions): Promise<AIResponse>;
  generateInsights(
    text: string,
    context?: string,
    options?: AIRequestOptions
  ): Promise<AIResponse>;
  dispose(): Promise<void>;
}
