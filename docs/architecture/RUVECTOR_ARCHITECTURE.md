# Ruvector Integration Architecture

**Version:** 1.0.0
**Date:** 2025-12-01
**Status:** Architecture Complete - Ready for Implementation

## Executive Summary

This document defines the complete architecture for integrating Ruvector services into the Close-Reading platform. The design follows established patterns from the existing codebase and provides 5 specialized services with comprehensive error handling, dependency injection, and testability.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Ruvector Integration                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Client    │→ │ Circuit      │→ │ Rate         │       │
│  │  Singleton  │  │ Breaker      │  │ Limiter      │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│         ↓                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Service Layer                          │    │
│  ├─────────────┬──────────┬──────┬────────┬──────────┤    │
│  │ Vector      │ Graph    │ RAG  │ Entity │ Cluster  │    │
│  │ Service     │ Service  │      │        │ Service  │    │
│  └─────────────┴──────────┴──────┴────────┴──────────┘    │
│         ↓                                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Ruvector API (External)                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Architecture Principles

### 1. **Separation of Concerns**
- **Client Layer**: Connection management, retry logic, rate limiting
- **Service Layer**: Business logic for each Ruvector capability
- **Type Layer**: Complete TypeScript definitions for type safety

### 2. **Dependency Injection**
All services accept the `RuvectorClient` instance as a constructor parameter, enabling:
- Easy mocking for unit tests
- Flexible configuration per service
- Shared connection pooling and rate limiting

### 3. **Error Handling Strategy**
Custom error types inherit from `RuvectorError`:
```typescript
- VectorOperationError
- GraphQueryError
- RAGError
- EntityNotFoundError
- ClusteringError
```

### 4. **Resilience Patterns**
- **Circuit Breaker**: Prevents cascading failures (5 failures → open for 60s)
- **Rate Limiting**: 60 req/min default (configurable)
- **Exponential Backoff**: 1s base delay, doubles on each retry
- **Timeout Handling**: 30s default with abort controller

### 5. **Performance Optimization**
- **Caching Layer**: 5-minute TTL for GET requests
- **Connection Pooling**: Shared HTTP client across services
- **Batch Operations**: Support for bulk inserts/updates

## Service Layer Design

### Directory Structure

```
src/services/ruvector/
├── index.ts              # Public exports, constants, utilities
├── client.ts             # Singleton client with resilience patterns
├── types.ts              # Complete TypeScript interfaces
├── VectorService.ts      # Vector operations (to be implemented)
├── GraphService.ts       # Cypher graph queries (to be implemented)
├── RAGService.ts         # RAG-enhanced AI (to be implemented)
├── EntityService.ts      # Entity persistence (to be implemented)
└── ClusterService.ts     # GNN clustering (to be implemented)
```

## Service Specifications

### 1. VectorService - Embedding Storage & Similarity Search

**Purpose:** Manage vector embeddings for semantic search

**Key Methods:**
```typescript
class VectorService {
  constructor(client: RuvectorClient);

  // CRUD Operations
  async upsert(embeddings: Embedding[], options?: VectorUpsertOptions): Promise<VectorUpsertResult>;
  async search(query: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
  async delete(ids: string[], options?: VectorDeleteOptions): Promise<void>;
  async getById(id: string): Promise<Embedding | null>;

  // Batch Operations
  async batchUpsert(batches: Embedding[][]): Promise<VectorUpsertResult[]>;

  // Statistics
  async getStats(namespace?: string): Promise<VectorStats>;
}
```

**Integration Points:**
- Replaces `src/services/ml/similarity.ts` functions
- Uses existing `EmbeddingVector` type from similarity.ts
- Connects to paragraph embedding storage

**Data Flow:**
```
Document → Paragraphs → Generate Embeddings → VectorService.upsert()
Query → Embedding → VectorService.search() → Ranked Results
```

### 2. GraphService - Cypher-based Graph Database

**Purpose:** Manage paragraph relationships as a graph

**Key Methods:**
```typescript
class GraphService {
  constructor(client: RuvectorClient);

  // Cypher Queries
  async executeCypher(query: string, options?: CypherQueryOptions): Promise<GraphQueryResult>;

  // Node Operations
  async createNode(labels: string[], properties: Record<string, unknown>): Promise<GraphNode>;
  async updateNode(id: string, properties: Record<string, unknown>): Promise<GraphNode>;
  async deleteNode(id: string): Promise<void>;

  // Relationship Operations
  async createRelationship(from: string, to: string, type: string, properties?: Record<string, unknown>): Promise<GraphRelationship>;
  async deleteRelationship(id: string): Promise<void>;

  // Traversal
  async traverse(startNodeId: string, options?: GraphTraversalOptions): Promise<GraphPath[]>;
  async findShortestPath(fromId: string, toId: string): Promise<GraphPath | null>;

  // Pattern Matching
  async matchPattern(pattern: GraphPattern): Promise<GraphQueryResult>;
}
```

**Integration Points:**
- Replaces `src/services/paragraphLinks.ts` Supabase operations
- Migrates `paragraph_links` table to graph database
- Enables advanced graph queries (shortest path, clustering)

**Data Model:**
```cypher
// Nodes
(p:Paragraph {id, content, documentId, position})
(d:Document {id, title, userId})
(a:Annotation {id, type, content})

// Relationships
(p1)-[:RELATED_TO {strength, type}]->(p2)
(p)-[:CONTAINS]->(a)
(d)-[:HAS_PARAGRAPH]->(p)
```

### 3. RAGService - Retrieval-Augmented Generation

**Purpose:** AI-powered Q&A over document corpus

**Key Methods:**
```typescript
class RAGService {
  constructor(client: RuvectorClient);

  // Indexing
  async indexDocuments(docs: RAGDocument[], options?: RAGIndexOptions): Promise<void>;
  async indexParagraphs(paragraphs: Paragraph[]): Promise<void>;

  // Querying
  async query(question: string, options?: RAGQueryOptions): Promise<RAGQueryResult>;
  async queryWithContext(question: string, contextIds: string[]): Promise<RAGQueryResult>;

  // Context Management
  async getContext(query: string, topK?: number): Promise<RAGContext>;
  async rerank(query: string, candidates: string[], config?: RAGRerankerConfig): Promise<string[]>;
}
```

**Integration Points:**
- Enhances `ClaudeService.answerQuestion()` with vector retrieval
- Provides context-aware AI responses
- Supports cross-document search

**Workflow:**
```
User Question
  → Vector Search (retrieve relevant paragraphs)
  → Rerank by relevance
  → Build context
  → Claude API call with context
  → Structured answer with citations
```

### 4. EntityService - Semantic Entity Persistence

**Purpose:** Store and search entities with embeddings

**Key Methods:**
```typescript
class EntityService {
  constructor(client: RuvectorClient);

  // CRUD
  async create(entity: Omit<Entity, 'id'>, options?: EntityCreateOptions): Promise<Entity>;
  async update(id: string, updates: Partial<Entity>, options?: EntityUpdateOptions): Promise<Entity>;
  async delete(id: string): Promise<void>;
  async getById(id: string): Promise<Entity | null>;

  // Search
  async search(query: string, options?: EntitySearchOptions): Promise<EntitySearchResult[]>;
  async findByType(type: string, options?: EntityQueryOptions): Promise<Entity[]>;

  // Relationships
  async createRelationship(relationship: Omit<EntityRelationship, 'id'>): Promise<EntityRelationship>;
  async getRelationships(entityId: string): Promise<EntityRelationship[]>;

  // Batch Operations
  async batchOperation(operations: EntityBatchOperation[]): Promise<EntityBatchResult>;
}
```

**Integration Points:**
- Stores extracted entities from documents
- Enables semantic search over entities
- Powers entity relationship graphs

**Entity Types:**
```typescript
- Paragraph (existing content)
- Theme (extracted themes)
- Concept (key concepts)
- Annotation (user annotations)
- Citation (references)
```

### 5. ClusterService - GNN-based Clustering

**Purpose:** Cluster paragraphs using Graph Neural Networks

**Key Methods:**
```typescript
class ClusterService {
  constructor(client: RuvectorClient);

  // Clustering
  async cluster(embeddings: Embedding[], config?: ClusterConfig): Promise<ClusteringResult>;
  async clusterParagraphs(paragraphIds: string[], config?: ClusterConfig): Promise<ClusteringResult>;

  // GNN-specific
  async gnnCluster(graph: GraphNode[], options?: GNNClusteringOptions): Promise<ClusteringResult>;

  // Analysis
  async analyzeCluster(clusterId: string): Promise<ClusterAnalysis>;
  async visualize(result: ClusteringResult): Promise<ClusterVisualization>;

  // Hierarchical
  async hierarchicalCluster(embeddings: Embedding[]): Promise<HierarchicalCluster[]>;
}
```

**Integration Points:**
- Replaces `src/services/ml/similarity.ts::clusterBySimilarity()`
- Uses GNN for graph-aware clustering
- Supports hierarchical cluster analysis

**Algorithms:**
```
- K-means (baseline)
- Hierarchical (dendrogram)
- DBSCAN (density-based)
- GNN (graph-aware, uses relationships)
```

## Configuration Schema

### Environment Variables
```bash
# Required
RUVECTOR_API_KEY=rv_your_api_key_here

# Optional
RUVECTOR_BASE_URL=https://api.ruvector.ai
RUVECTOR_TIMEOUT=30000
RUVECTOR_RETRY_ATTEMPTS=3
RUVECTOR_RATE_LIMIT=60
RUVECTOR_CACHE_ENABLED=true
RUVECTOR_CACHE_TTL=300000
```

### Client Initialization
```typescript
import { getRuvectorClient } from './services/ruvector';

const client = getRuvectorClient({
  apiKey: process.env.RUVECTOR_API_KEY!,
  baseUrl: process.env.RUVECTOR_BASE_URL,
  timeout: 30000,
  retryAttempts: 3,
  rateLimitPerMinute: 60,
  cacheEnabled: true,
  cacheTtl: 300000,
  services: {
    vector: true,
    graph: true,
    rag: true,
    entity: true,
    cluster: true,
  },
});
```

### Service Usage
```typescript
import { VectorService, GraphService, RAGService } from './services/ruvector';

// Create service instances
const vectorService = new VectorService(client);
const graphService = new GraphService(client);
const ragService = new RAGService(client);

// Use services
const results = await vectorService.search(queryVector, { topK: 10 });
const paths = await graphService.findShortestPath(id1, id2);
const answer = await ragService.query("What is the main theme?");
```

## Error Handling Patterns

### Service-Level Error Handling
```typescript
try {
  const result = await vectorService.search(vector);
} catch (error) {
  if (error instanceof VectorOperationError) {
    console.error('Vector operation failed:', error.message);
    // Handle vector-specific error
  } else if (error instanceof RuvectorError) {
    console.error('Ruvector API error:', error.code, error.statusCode);
    // Handle general API error
  } else {
    // Unexpected error
    throw error;
  }
}
```

### Circuit Breaker Behavior
```typescript
// After 5 consecutive failures:
// - Circuit opens
// - All requests fail immediately
// - After 60s, circuit enters half-open state
// - 3 successful requests close the circuit

// Monitor circuit state:
const health = await client.healthCheck();
console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'
```

## Testing Strategy

### Unit Tests
```typescript
describe('VectorService', () => {
  let mockClient: jest.Mocked<RuvectorClient>;
  let vectorService: VectorService;

  beforeEach(() => {
    mockClient = {
      request: jest.fn(),
    } as any;
    vectorService = new VectorService(mockClient);
  });

  it('should search vectors', async () => {
    mockClient.request.mockResolvedValue({
      results: [{ id: '1', score: 0.95, text: 'test' }],
    });

    const results = await vectorService.search([0.1, 0.2]);
    expect(results).toHaveLength(1);
    expect(results[0].score).toBe(0.95);
  });
});
```

### Integration Tests
```typescript
describe('Ruvector Integration', () => {
  let client: RuvectorClient;

  beforeAll(() => {
    client = getRuvectorClient({
      apiKey: process.env.RUVECTOR_TEST_API_KEY!,
      baseUrl: 'https://api-test.ruvector.ai',
    });
  });

  afterAll(() => {
    resetRuvectorClient();
  });

  it('should perform end-to-end vector search', async () => {
    const vectorService = new VectorService(client);

    // Upsert
    await vectorService.upsert([{
      id: 'test-1',
      vector: [0.1, 0.2, 0.3],
      text: 'test paragraph',
    }]);

    // Search
    const results = await vectorService.search([0.1, 0.2, 0.3]);
    expect(results[0].id).toBe('test-1');
  });
});
```

## Performance Considerations

### Caching Strategy
- **Cache Key Format:** `METHOD:PATH:PARAMS`
- **TTL:** 5 minutes default (configurable)
- **Invalidation:** Manual via `clearCache()` or TTL expiry
- **Cache Hits:** Bypass rate limiter and API calls

### Rate Limiting
- **Window:** 60 seconds
- **Limit:** 60 requests (configurable)
- **Behavior:** Queue requests, wait for slot
- **Monitoring:** `getMetrics().activeConnections`

### Batch Operations
```typescript
// Good: Single batch upsert
await vectorService.upsert(embeddings, { batchSize: 100 });

// Bad: Multiple individual upserts
for (const embedding of embeddings) {
  await vectorService.upsert([embedding]); // 100x slower!
}
```

## Migration Plan

### Phase 1: Setup (This Architecture)
- ✅ Type definitions complete
- ✅ Client singleton complete
- ✅ Public API exports complete

### Phase 2: Implementation (Next Agents)
- ⏳ VectorService implementation
- ⏳ GraphService implementation
- ⏳ RAGService implementation
- ⏳ EntityService implementation
- ⏳ ClusterService implementation

### Phase 3: Integration
- Replace `similarity.ts` with VectorService
- Migrate `paragraphLinks.ts` to GraphService
- Enhance ClaudeService with RAGService
- Add entity extraction pipeline
- Implement cluster visualization

### Phase 4: Testing & Optimization
- Unit tests (90% coverage target)
- Integration tests with mock Ruvector API
- Load testing for rate limiting
- Cache effectiveness analysis

## API Versioning

### Version Strategy
- **URL Versioning:** `/v1/vector/search`
- **Header Versioning:** `X-API-Version: 1.0`
- **Backward Compatibility:** Maintain v1 for 1 year minimum

### Breaking Changes
Will trigger major version bump:
- Removing endpoints
- Changing response structure
- Modifying required parameters
- Changing authentication method

## Security Considerations

### API Key Management
- Never commit API keys to repository
- Use environment variables
- Rotate keys quarterly
- Implement key validation on startup

### Data Privacy
- All requests use HTTPS
- No PII in vector metadata (optional)
- Namespace isolation per user
- Audit logging for sensitive operations

### Rate Limiting
- Prevents abuse
- Per-user rate limits
- Burst allowance (20% over limit)
- Graceful degradation under load

## Monitoring & Observability

### Metrics to Track
```typescript
const metrics = client.getMetrics();
console.log({
  requestCount: metrics.requestCount,
  errorCount: metrics.errorCount,
  avgResponseTime: metrics.avgResponseTime,
  cacheHitRate: metrics.cacheHitRate,
  activeConnections: metrics.activeConnections,
});
```

### Health Checks
```typescript
const health = await client.healthCheck();
console.log({
  status: health.status,
  services: health.services, // { vector: true, graph: true, ... }
  uptime: health.uptime,
});
```

### Logging Strategy
- **Info:** Successful operations, cache hits
- **Warn:** Retry attempts, circuit breaker state changes
- **Error:** Failed operations, API errors
- **Debug:** Request/response payloads (development only)

## Dependencies

### Required
- `@anthropic-ai/sdk` (already installed)
- `node-fetch` or native fetch (Node 18+)

### Optional
- Redis for distributed caching (future)
- Prometheus client for metrics (future)

## Architectural Decisions

### ADR-001: Singleton Client Pattern
**Decision:** Use singleton pattern for `RuvectorClient`

**Rationale:**
- Single connection pool across application
- Shared rate limiter and circuit breaker
- Simplified configuration management
- Easier testing with `resetRuvectorClient()`

**Alternatives Considered:**
- Factory pattern (too complex)
- Dependency injection container (overkill)

### ADR-002: Service-Specific Error Types
**Decision:** Create custom error classes per service

**Rationale:**
- Type-safe error handling
- Clear error categorization
- Enables service-specific error recovery
- Better error messages

**Alternatives Considered:**
- Generic RuvectorError only (less informative)
- HTTP status codes (not type-safe)

### ADR-003: Circuit Breaker at Client Level
**Decision:** Implement circuit breaker in client, not services

**Rationale:**
- Protects entire API, not just individual services
- Prevents cascading failures across services
- Simpler state management
- Shared failure detection

**Alternatives Considered:**
- Per-service circuit breakers (too complex)
- No circuit breaker (risky)

### ADR-004: TypeScript-First Design
**Decision:** Complete type definitions before implementation

**Rationale:**
- Type safety across entire codebase
- Self-documenting interfaces
- IDE autocomplete and IntelliSense
- Catches errors at compile time

**Alternatives Considered:**
- JavaScript with JSDoc (less safe)
- Gradual typing (slower development)

## Next Steps

### For Implementation Agents

**VectorService Agent:**
1. Read `types.ts` for interfaces
2. Implement all methods in `VectorService.ts`
3. Add unit tests
4. Update `index.ts` exports

**GraphService Agent:**
1. Study Cypher query syntax
2. Implement graph operations
3. Design migration from `paragraphLinks.ts`
4. Add integration tests

**RAGService Agent:**
1. Design chunking strategy
2. Implement retrieval pipeline
3. Integrate with ClaudeService
4. Add reranking logic

**EntityService Agent:**
1. Define entity schema
2. Implement CRUD operations
3. Add semantic search
4. Design relationship model

**ClusterService Agent:**
1. Research GNN clustering
2. Implement k-means baseline
3. Add hierarchical clustering
4. Design visualization format

---

**Architecture Completed:** 2025-12-01
**Architect:** System Architect Agent
**Swarm ID:** swarm_1764621807653_p2cylzydm
**Status:** Ready for implementation phase
