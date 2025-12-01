# RAG Service Guide

Complete guide to using RAGService for Retrieval-Augmented Generation with the Close Reading application.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Features](#core-features)
- [Installation & Setup](#installation--setup)
- [API Reference](#api-reference)
- [Claude Integration](#claude-integration)
- [Best Practices](#best-practices)
- [Performance Tuning](#performance-tuning)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Overview

RAGService provides production-ready Retrieval-Augmented Generation capabilities, enabling intelligent question answering, summarization, and analysis over document collections.

### Key Features

- **Document Indexing**: Automatic chunking and embedding generation
- **Semantic Search**: Vector similarity search with optional reranking
- **Context Assembly**: Token-budget aware context optimization
- **Claude Integration**: Optimized prompt formatting for Claude models
- **Source Citations**: Automatic citation tracking for transparency
- **Batch Operations**: Efficient bulk processing with error recovery

### Use Cases

1. **Question Answering**: Answer questions over large document collections
2. **Comparative Analysis**: Compare themes across multiple texts
3. **Annotation Enhancement**: Generate context-aware annotations
4. **Summarization**: Create summaries with cited sources
5. **Theme Extraction**: Identify cross-document themes

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     RAGService                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Document   │  │   Context    │  │   Claude     │ │
│  │   Indexing   │  │  Retrieval   │  │ Integration  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                  │                  │        │
└─────────┼──────────────────┼──────────────────┼────────┘
          │                  │                  │
          ▼                  ▼                  ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ VectorService│  │  Reranking   │  │ClaudeService │
  │  (Embeddings)│  │   Service    │  │ (Generation) │
  └──────────────┘  └──────────────┘  └──────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                    ┌────────▼────────┐
                    │ RuvectorClient  │
                    │   (REST API)    │
                    └─────────────────┘
```

## Core Features

### 1. Document Indexing

**Automatic Chunking**
```typescript
await ragService.indexDocument(document, {
  chunkSize: 512,        // Words per chunk
  chunkOverlap: 50,      // Overlapping words
  namespace: 'project:documents',
  metadata: { category: 'literature' }
});
```

**Pre-chunked Documents**
```typescript
const document: RAGDocument = {
  id: 'doc-1',
  text: 'Full document text...',
  chunks: [
    { id: 'chunk-1', text: 'First section...', position: 0 },
    { id: 'chunk-2', text: 'Second section...', position: 1 }
  ]
};

await ragService.indexDocument(document);
```

**Batch Indexing**
```typescript
const result = await ragService.indexDocuments(documents, options);

console.log(`Success: ${result.succeeded}/${result.total}`);
if (result.errors) {
  result.errors.forEach(err => {
    console.error(`Document ${err.index}: ${err.error}`);
  });
}
```

### 2. Context Retrieval

**Basic Retrieval**
```typescript
const context = await ragService.retrieveContext(query, {
  topK: 5,              // Number of chunks
  minRelevance: 0.7,    // Similarity threshold
  rerank: true          // Apply reranking
});

console.log(`Found ${context.totalChunks} chunks from ${context.documentIds.length} documents`);
```

**Document-Specific Retrieval**
```typescript
const context = await ragService.retrieveContextForQuestion(
  'What is the theme?',
  ['doc-1', 'doc-2']  // Only search these documents
);
```

### 3. Reranking

Improve relevance with cross-encoder reranking:

```typescript
const reranked = await ragService.rerankResults(query, initialResults, {
  model: 'cross-encoder',
  threshold: 0.6,
  maxCandidates: 20
});
```

**How it works:**
1. Retrieve 20+ candidates using vector similarity
2. Rerank using cross-encoder model (query + document)
3. Filter by threshold and return top-K

### 4. Prompt Preparation

**One-Step Prompt Generation**
```typescript
const { systemPrompt, userPrompt, context } =
  await ragService.preparePrompt(query, {
    topK: 5,
    rerank: true,
    systemPrompt: 'Custom system instructions...'
  });

// Use with Claude
const response = await claudeService.answerQuestion(
  query,
  userPrompt,
  { includeEvidence: true }
);
```

## Claude Integration

### Optimized Context Windows

```typescript
// Calculate optimal window for model
const contextWindow = ragService.getOptimalContextWindow(
  8000,                           // Token budget
  'claude-sonnet-4-20250514'      // Model
);

// Assemble context within budget
const optimizedContext = ragService.assembleContextWithinBudget(
  allChunks,
  contextWindow
);
```

**Token Limits by Model:**
- Claude Sonnet 4: 200,000 tokens
- Claude Sonnet 3.5: 200,000 tokens
- Claude Opus 3: 200,000 tokens

### Citation Formatting

Context is formatted with source citations:

```
[Source 1] (Document: moby-dick-ch1, Position: 0, Relevance: 95.3%)
Call me Ishmael. Some years ago—never mind how long precisely...

---

[Source 2] (Document: moby-dick-ch36, Position: 5, Relevance: 88.7%)
"Hast seen the White Whale?" replied the hollow-cheeked captain...
```

### Integration Pattern

```typescript
// 1. Setup services
const ragService = new RAGService(ruvectorClient);
const claudeService = new ClaudeService({ apiKey: '...' });

// 2. Index documents
await ragService.indexDocuments(documents);

// 3. Retrieve context
const { systemPrompt, userPrompt, context } =
  await ragService.preparePrompt(question);

// 4. Generate answer
const response = await claudeService.answerQuestion(
  question,
  userPrompt,
  { includeEvidence: true }
);

// 5. Process results
console.log(response.data.answer);
response.data.evidence.forEach(ev => {
  console.log(`"${ev.quote}" - ${ev.source}`);
});
```

## API Reference

### Document Management

#### `indexDocument(document, options?)`

Index a single document with chunking and embedding.

**Parameters:**
- `document: RAGDocument` - Document to index
  - `id: string` - Unique identifier
  - `text: string` - Document content
  - `metadata?: Record<string, unknown>` - Optional metadata
  - `chunks?: Array<{id, text, position}>` - Pre-defined chunks
- `options?: RAGIndexOptions`
  - `chunkSize?: number` - Words per chunk (default: 512)
  - `chunkOverlap?: number` - Overlapping words (default: 50)
  - `namespace?: string` - Isolation namespace
  - `metadata?: Record<string, unknown>` - Additional metadata

**Returns:** `Promise<void>`

**Example:**
```typescript
await ragService.indexDocument({
  id: 'hamlet-act3',
  text: 'To be, or not to be...',
  metadata: { play: 'Hamlet', act: 3 }
}, {
  chunkSize: 100,
  namespace: 'shakespeare'
});
```

#### `indexDocuments(documents, options?)`

Batch index multiple documents with error recovery.

**Returns:** `Promise<BatchOperationResult>`
```typescript
{
  total: number;
  succeeded: number;
  failed: number;
  errors?: Array<{ index: number; error: string }>;
}
```

#### `removeDocument(documentId)`

Remove document and all its chunks from index.

**Parameters:**
- `documentId: string` - Document to remove

**Returns:** `Promise<void>`

### Context Retrieval

#### `retrieveContext(query, options?)`

Retrieve relevant context chunks for a query.

**Parameters:**
- `query: string` - Search query
- `options?: RAGQueryOptions`
  - `topK?: number` - Number of chunks (default: 5)
  - `minRelevance?: number` - Min similarity (default: 0.7)
  - `rerank?: boolean` - Apply reranking (default: true)

**Returns:** `Promise<RAGContext>`
```typescript
{
  chunks: Array<{
    text: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>;
  documentIds: string[];
  totalChunks: number;
}
```

#### `retrieveContextForQuestion(question, documentIds)`

Retrieve context from specific documents.

**Parameters:**
- `question: string` - Question text
- `documentIds: string[]` - Documents to search

**Returns:** `Promise<RAGContext>`

### Prompt Generation

#### `preparePrompt(query, options?)`

Generate complete system and user prompts with context.

**Returns:** `Promise<{systemPrompt, userPrompt, context}>`

**Example:**
```typescript
const { systemPrompt, userPrompt, context } =
  await ragService.preparePrompt('What is the main theme?', {
    topK: 5,
    rerank: true,
    systemPrompt: 'You are a literary scholar...'
  });
```

### Reranking

#### `rerankResults(query, results, config?)`

Rerank search results for improved relevance.

**Parameters:**
- `query: string` - Original query
- `results: VectorSearchResult[]` - Initial results
- `config?: RAGRerankerConfig`
  - `model?: string` - Reranker model (default: 'cross-encoder')
  - `threshold?: number` - Min score (default: 0.5)
  - `maxCandidates?: number` - Max to rerank (default: 20)

**Returns:** `Promise<VectorSearchResult[]>`

### Utilities

#### `getOptimalContextWindow(tokenBudget?, model?)`

Calculate optimal context window for a Claude model.

**Parameters:**
- `tokenBudget?: number` - Desired budget (default: 8000)
- `model?: string` - Claude model name

**Returns:** `number` - Available tokens for context

#### `formatContextForClaude(context)`

Format context with source citations for Claude.

**Returns:** `string` - Formatted context

#### `assembleContextWithinBudget(chunks, tokenBudget)`

Assemble highest-relevance chunks within token budget.

**Returns:** `RAGContext`

### Monitoring

#### `getIndexStats(namespace?)`

Get statistics for indexed documents.

**Returns:**
```typescript
{
  totalDocuments: number;
  totalChunks: number;
  avgChunksPerDocument: number;
}
```

#### `healthCheck()`

Check service health and latency.

**Returns:**
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  error?: string;
}
```

## Best Practices

### 1. Chunking Strategy

**For Literary Texts:**
- Chunk by paragraph or semantic breaks
- Use 200-500 words per chunk
- Overlap 50-100 words to preserve context

**For Technical Documents:**
- Chunk by section or topic
- Use 300-700 words per chunk
- Lower overlap (20-50 words)

**Example:**
```typescript
// Literary text
await ragService.indexDocument(poem, {
  chunkSize: 250,
  chunkOverlap: 75
});

// Technical documentation
await ragService.indexDocument(manual, {
  chunkSize: 500,
  chunkOverlap: 30
});
```

### 2. Namespace Organization

Use hierarchical namespaces for isolation:

```typescript
const namespace = `${userId}:${projectId}:${category}`;

await ragService.indexDocument(doc, { namespace });
```

**Examples:**
- `user123:literature:shakespeare`
- `user456:research:climate-science`
- `public:samples:classic-literature`

### 3. Reranking When to Use

**Use reranking when:**
- Precision is critical (question answering)
- You have 15+ initial candidates
- Query is specific and targeted

**Skip reranking when:**
- Speed is critical
- Initial results are very relevant (>0.9 similarity)
- Broad exploration queries

### 4. Token Budget Management

```typescript
// Conservative: 4000 tokens
const budget = ragService.getOptimalContextWindow(4000);

// Aggressive: 15000 tokens (for long-context models)
const budget = ragService.getOptimalContextWindow(15000);

// Assemble context
const context = ragService.assembleContextWithinBudget(chunks, budget);
```

### 5. Error Handling

```typescript
try {
  await ragService.indexDocument(document);
} catch (error) {
  if (error instanceof RAGError) {
    console.error('RAG operation failed:', error.message);
    console.error('Details:', error.details);
  }
}

// Batch operations: check individual failures
const result = await ragService.indexDocuments(documents);
if (result.failed > 0) {
  result.errors?.forEach(err => {
    console.error(`Document ${err.index}: ${err.error}`);
  });
}
```

## Performance Tuning

### 1. Batch Size

```typescript
// Small batches for reliability
await ragService.indexDocuments(docs.slice(0, 10));

// Large batches for speed (with error recovery)
const result = await ragService.indexDocuments(allDocs);
```

### 2. Caching

RuvectorClient automatically caches GET requests:

```typescript
const client = getRuvectorClient({
  apiKey: '...',
  cacheEnabled: true,      // Enable caching
  cacheTtl: 300000         // 5 minutes
});
```

### 3. Parallel Indexing

```typescript
// Index multiple documents in parallel
await Promise.all(
  documentBatches.map(batch =>
    ragService.indexDocuments(batch)
  )
);
```

### 4. Monitoring Performance

```typescript
// Check index stats periodically
const stats = await ragService.getIndexStats(namespace);
console.log(`${stats.totalChunks} chunks across ${stats.totalDocuments} docs`);

// Monitor health
const health = await ragService.healthCheck();
console.log(`Status: ${health.status}, Latency: ${health.latency}ms`);
```

## Error Handling

### Common Errors

#### RAGError
Base error for all RAG operations:

```typescript
try {
  await ragService.indexDocument(doc);
} catch (error) {
  if (error instanceof RAGError) {
    console.error(error.code);     // 'RAG_ERROR'
    console.error(error.message);  // Human-readable message
    console.error(error.details);  // Additional context
  }
}
```

#### Network Errors
Handled by RuvectorClient with retries:

```typescript
const client = getRuvectorClient({
  apiKey: '...',
  maxRetries: 3,          // Retry attempts
  retryDelay: 1000        // Initial delay (exponential backoff)
});
```

#### Validation Errors
Documents are validated before indexing:

```typescript
// Invalid: missing text
await ragService.indexDocument({ id: 'doc-1', text: '' });
// Throws: RAGError('Document text cannot be empty')

// Invalid: malformed chunks
await ragService.indexDocument({
  id: 'doc-1',
  text: 'Content...',
  chunks: [{ id: 'c1', text: 'Text' }]  // Missing 'position'
});
// Throws: RAGError('Chunk must have id, text, and position fields')
```

## Examples

See `examples/rag-claude-integration.ts` for complete examples:

1. **Basic RAG Q&A**: Index documents and answer questions
2. **Comparative Analysis**: Compare themes across texts
3. **Annotation Enhancement**: Generate context-aware annotations
4. **Context Optimization**: Manage token budgets
5. **Monitoring**: Track health and statistics

Run examples:
```bash
export RUVECTOR_API_KEY="rv_..."
export ANTHROPIC_API_KEY="sk-ant-..."

ts-node src/services/ruvector/examples/rag-claude-integration.ts
```

## Migration from ClaudeService

Enhance existing ClaudeService usage with RAG:

### Before (Direct Claude)
```typescript
const response = await claudeService.answerQuestion(
  question,
  documentText,  // Limited to small documents
  { includeEvidence: true }
);
```

### After (RAG-Enhanced)
```typescript
// 1. Index document once
await ragService.indexDocument({ id: 'doc-1', text: documentText });

// 2. Retrieve relevant context
const { systemPrompt, userPrompt } =
  await ragService.preparePrompt(question);

// 3. Answer with context
const response = await claudeService.answerQuestion(
  question,
  userPrompt,      // Only relevant chunks
  { includeEvidence: true }
);
```

**Benefits:**
- Handle documents of any size
- Improve answer accuracy with focused context
- Reduce token usage and costs
- Enable multi-document queries
- Automatic source citations

## Next Steps

- **GraphService**: Link related passages and entities
- **EntityService**: Extract and query named entities
- **ClusterService**: Discover document clusters
- **Hybrid Search**: Combine keyword + semantic search

## Support

- API Documentation: https://docs.ruvector.ai
- Examples: `src/services/ruvector/examples/`
- Tests: `src/services/ruvector/__tests__/RAGService.test.ts`
