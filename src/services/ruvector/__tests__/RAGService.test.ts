/**
 * RAGService Test Suite
 *
 * Tests cover:
 * - Document indexing (single and batch)
 * - Context retrieval
 * - Prompt preparation for Claude
 * - Reranking
 * - Claude integration utilities
 * - Error handling and recovery
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RAGService, VectorService } from '../RAGService';
import { RuvectorClient } from '../client';
import type {
  RAGDocument,
  VectorSearchResult,
  RAGContext,
} from '../types';

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock('../client');

const createMockClient = () => {
  return {
    request: vi.fn(),
  } as unknown as RuvectorClient;
};

const createMockVectorService = () => {
  return {
    embed: vi.fn(),
    upsert: vi.fn(),
    search: vi.fn(),
    delete: vi.fn(),
  } as unknown as VectorService;
};

// ============================================================================
// Test Data
// ============================================================================

const mockDocument: RAGDocument = {
  id: 'doc-1',
  text: 'This is a test document. It contains multiple sentences. We will use it to test chunking and indexing functionality.',
  metadata: {
    author: 'Test Author',
    title: 'Test Document',
  },
};

const mockSearchResults: VectorSearchResult[] = [
  {
    id: 'chunk-1',
    text: 'This is a relevant chunk of text.',
    score: 0.95,
    metadata: { documentId: 'doc-1', position: 0 },
  },
  {
    id: 'chunk-2',
    text: 'Another relevant chunk with useful information.',
    score: 0.88,
    metadata: { documentId: 'doc-1', position: 1 },
  },
  {
    id: 'chunk-3',
    text: 'A third chunk with additional context.',
    score: 0.82,
    metadata: { documentId: 'doc-2', position: 0 },
  },
];

// ============================================================================
// Document Indexing Tests
// ============================================================================

describe('RAGService - Document Indexing', () => {
  let ragService: RAGService;
  let mockClient: RuvectorClient;
  let mockVectorService: VectorService;

  beforeEach(() => {
    mockClient = createMockClient();
    mockVectorService = createMockVectorService();
    ragService = new RAGService(mockClient, mockVectorService);
  });

  it('should index a single document with chunking', async () => {
    // Mock embedding generation
    vi.mocked(mockVectorService.embed).mockResolvedValue([
      Array(768).fill(0.1),
      Array(768).fill(0.2),
    ]);

    // Mock successful upsert
    vi.mocked(mockVectorService.upsert).mockResolvedValue({
      upsertedCount: 2,
      ids: ['doc-1-chunk-0', 'doc-1-chunk-1'],
    });

    await ragService.indexDocument(mockDocument, {
      chunkSize: 10,
      chunkOverlap: 2,
    });

    expect(mockVectorService.embed).toHaveBeenCalled();
    expect(mockVectorService.upsert).toHaveBeenCalled();

    const upsertCall = vi.mocked(mockVectorService.upsert).mock.calls[0];
    const embeddings = upsertCall[0];

    expect(embeddings.length).toBeGreaterThan(0);
    expect(embeddings[0]).toHaveProperty('id');
    expect(embeddings[0]).toHaveProperty('vector');
    expect(embeddings[0]).toHaveProperty('text');
    expect(embeddings[0].metadata).toHaveProperty('documentId', 'doc-1');
  });

  it('should use pre-existing chunks if provided', async () => {
    const documentWithChunks: RAGDocument = {
      ...mockDocument,
      chunks: [
        { id: 'custom-1', text: 'First chunk', position: 0 },
        { id: 'custom-2', text: 'Second chunk', position: 1 },
      ],
    };

    vi.mocked(mockVectorService.embed).mockResolvedValue([
      Array(768).fill(0.1),
      Array(768).fill(0.2),
    ]);

    vi.mocked(mockVectorService.upsert).mockResolvedValue({
      upsertedCount: 2,
      ids: ['custom-1', 'custom-2'],
    });

    await ragService.indexDocument(documentWithChunks);

    const upsertCall = vi.mocked(mockVectorService.upsert).mock.calls[0];
    const embeddings = upsertCall[0];

    expect(embeddings[0].id).toBe('custom-1');
    expect(embeddings[1].id).toBe('custom-2');
  });

  it('should handle batch indexing with error recovery', async () => {
    const documents: RAGDocument[] = [
      mockDocument,
      { id: 'doc-2', text: 'Second document' },
      { id: 'doc-3', text: '' }, // Invalid - empty text
    ];

    vi.mocked(mockVectorService.embed).mockResolvedValue([
      Array(768).fill(0.1),
    ]);

    vi.mocked(mockVectorService.upsert).mockResolvedValue({
      upsertedCount: 1,
      ids: ['chunk-1'],
    });

    const result = await ragService.indexDocuments(documents);

    expect(result.total).toBe(3);
    expect(result.succeeded).toBe(2); // doc-1 and doc-2
    expect(result.failed).toBe(1); // doc-3 (empty text)
    expect(result.errors).toHaveLength(1);
  });

  it('should remove document and all chunks', async () => {
    vi.mocked(mockVectorService.search).mockResolvedValue([
      { id: 'chunk-1', text: 'text', score: 0.9 },
      { id: 'chunk-2', text: 'text', score: 0.8 },
    ]);

    vi.mocked(mockVectorService.delete).mockResolvedValue();

    await ragService.removeDocument('doc-1');

    expect(mockVectorService.search).toHaveBeenCalledWith('', {
      filter: { documentId: 'doc-1' },
      topK: 1000,
    });

    expect(mockVectorService.delete).toHaveBeenCalledWith([
      'chunk-1',
      'chunk-2',
    ]);
  });
});

// ============================================================================
// Context Retrieval Tests
// ============================================================================

describe('RAGService - Context Retrieval', () => {
  let ragService: RAGService;
  let mockClient: RuvectorClient;
  let mockVectorService: VectorService;

  beforeEach(() => {
    mockClient = createMockClient();
    mockVectorService = createMockVectorService();
    ragService = new RAGService(mockClient, mockVectorService);
  });

  it('should retrieve context for a query', async () => {
    vi.mocked(mockVectorService.search).mockResolvedValue(mockSearchResults);

    const context = await ragService.retrieveContext('test query', {
      topK: 3,
      minRelevance: 0.7,
      rerank: false,
    });

    expect(context.chunks).toHaveLength(3);
    expect(context.documentIds).toContain('doc-1');
    expect(context.documentIds).toContain('doc-2');
    expect(context.totalChunks).toBe(3);

    expect(context.chunks[0].text).toBe('This is a relevant chunk of text.');
    expect(context.chunks[0].score).toBe(0.95);
  });

  it('should apply reranking when enabled', async () => {
    const candidates = Array(15)
      .fill(null)
      .map((_, i) => ({
        id: `chunk-${i}`,
        text: `Chunk ${i}`,
        score: 0.9 - i * 0.01,
        metadata: { documentId: 'doc-1' },
      }));

    vi.mocked(mockVectorService.search).mockResolvedValue(candidates);

    // Mock reranking API
    vi.mocked(mockClient.request).mockResolvedValue({
      results: [
        { index: 5, score: 0.95 }, // Boost lower-ranked item
        { index: 0, score: 0.92 },
        { index: 1, score: 0.88 },
        { index: 2, score: 0.85 },
        { index: 3, score: 0.82 },
      ],
    });

    const context = await ragService.retrieveContext('test query', {
      topK: 5,
      rerank: true,
    });

    expect(context.chunks).toHaveLength(5);
    // First result should be chunk-5 (reranked to top)
    expect(context.chunks[0].text).toBe('Chunk 5');
    expect(context.chunks[0].score).toBe(0.95);
  });

  it('should filter by document IDs', async () => {
    vi.mocked(mockVectorService.search).mockResolvedValue(
      mockSearchResults.filter((r) => r.metadata?.documentId === 'doc-1')
    );

    const context = await ragService.retrieveContextForQuestion(
      'test question',
      ['doc-1']
    );

    expect(context.documentIds).toEqual(['doc-1']);
    expect(context.chunks.every((c) => c.metadata?.documentId === 'doc-1')).toBe(
      true
    );

    const searchCall = vi.mocked(mockVectorService.search).mock.calls[0];
    expect(searchCall[1]?.filter).toEqual({
      documentId: { $in: ['doc-1'] },
    });
  });

  it('should handle empty search results', async () => {
    vi.mocked(mockVectorService.search).mockResolvedValue([]);

    const context = await ragService.retrieveContext('obscure query');

    expect(context.chunks).toHaveLength(0);
    expect(context.documentIds).toHaveLength(0);
    expect(context.totalChunks).toBe(0);
  });
});

// ============================================================================
// Prompt Preparation Tests
// ============================================================================

describe('RAGService - Prompt Preparation', () => {
  let ragService: RAGService;
  let mockClient: RuvectorClient;
  let mockVectorService: VectorService;

  beforeEach(() => {
    mockClient = createMockClient();
    mockVectorService = createMockVectorService();
    ragService = new RAGService(mockClient, mockVectorService);
  });

  it('should prepare complete prompt with context', async () => {
    vi.mocked(mockVectorService.search).mockResolvedValue(mockSearchResults);

    const result = await ragService.preparePrompt('What is the main topic?', {
      topK: 2,
      rerank: false,
    });

    expect(result.systemPrompt).toContain('helpful assistant');
    expect(result.systemPrompt).toContain('cite your sources');

    expect(result.userPrompt).toContain('Context:');
    expect(result.userPrompt).toContain('[Source 1]');
    expect(result.userPrompt).toContain('What is the main topic?');

    expect(result.context.chunks).toHaveLength(2);
  });

  it('should use custom system prompt if provided', async () => {
    vi.mocked(mockVectorService.search).mockResolvedValue(mockSearchResults);

    const customPrompt = 'You are an expert legal analyst.';

    const result = await ragService.preparePrompt('Analyze this case', {
      systemPrompt: customPrompt,
      topK: 2,
      rerank: false,
    });

    expect(result.systemPrompt).toBe(customPrompt);
  });

  it('should format context with proper citations', async () => {
    vi.mocked(mockVectorService.search).mockResolvedValue(mockSearchResults);

    const result = await ragService.preparePrompt('test query', {
      rerank: false,
    });

    const formatted = result.userPrompt;

    expect(formatted).toContain('[Source 1]');
    expect(formatted).toContain('[Source 2]');
    expect(formatted).toContain('Document: doc-1');
    expect(formatted).toContain('Relevance: 95.0%');
  });
});

// ============================================================================
// Claude Integration Tests
// ============================================================================

describe('RAGService - Claude Integration', () => {
  let ragService: RAGService;
  let mockClient: RuvectorClient;
  let mockVectorService: VectorService;

  beforeEach(() => {
    mockClient = createMockClient();
    mockVectorService = createMockVectorService();
    ragService = new RAGService(mockClient, mockVectorService);
  });

  it('should calculate optimal context window', () => {
    const contextWindow = ragService.getOptimalContextWindow(
      8000,
      'claude-sonnet-4-20250514'
    );

    expect(contextWindow).toBeGreaterThan(0);
    expect(contextWindow).toBeLessThan(8000);
  });

  it('should format context with source citations', () => {
    const context: RAGContext = {
      chunks: [
        {
          text: 'First chunk',
          score: 0.95,
          metadata: { documentId: 'doc-1', position: 0 },
        },
        {
          text: 'Second chunk',
          score: 0.88,
          metadata: { documentId: 'doc-2', position: 1 },
        },
      ],
      documentIds: ['doc-1', 'doc-2'],
      totalChunks: 2,
    };

    const formatted = ragService.formatContextForClaude(context);

    expect(formatted).toContain('[Source 1]');
    expect(formatted).toContain('[Source 2]');
    expect(formatted).toContain('Document: doc-1');
    expect(formatted).toContain('Position: 0');
    expect(formatted).toContain('Relevance: 95.0%');
    expect(formatted).toContain('First chunk');
    expect(formatted).toContain('---');
  });

  it('should assemble context within token budget', () => {
    const chunks = Array(20)
      .fill(null)
      .map((_, i) => ({
        text: `This is chunk ${i}. `.repeat(100), // ~500 chars per chunk
        score: 0.9 - i * 0.01,
        metadata: { documentId: `doc-${i}` },
      }));

    const tokenBudget = 2000; // ~8000 chars

    const context = ragService.assembleContextWithinBudget(chunks, tokenBudget);

    // Calculate actual tokens used
    const totalText = context.chunks.map((c) => c.text).join(' ');
    const estimatedTokens = Math.ceil(totalText.length / 4);

    expect(estimatedTokens).toBeLessThanOrEqual(tokenBudget);
    expect(context.chunks.length).toBeGreaterThan(0);
    expect(context.chunks.length).toBeLessThan(chunks.length);

    // Verify sorted by relevance
    for (let i = 1; i < context.chunks.length; i++) {
      expect(context.chunks[i - 1].score).toBeGreaterThanOrEqual(
        context.chunks[i].score
      );
    }
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('RAGService - Error Handling', () => {
  let ragService: RAGService;
  let mockClient: RuvectorClient;
  let mockVectorService: VectorService;

  beforeEach(() => {
    mockClient = createMockClient();
    mockVectorService = createMockVectorService();
    ragService = new RAGService(mockClient, mockVectorService);
  });

  it('should handle embedding generation failure', async () => {
    vi.mocked(mockVectorService.embed).mockRejectedValue(
      new Error('Embedding API error')
    );

    await expect(ragService.indexDocument(mockDocument)).rejects.toThrow(
      'Failed to index document'
    );
  });

  it('should handle vector search failure', async () => {
    vi.mocked(mockVectorService.search).mockRejectedValue(
      new Error('Search API error')
    );

    await expect(ragService.retrieveContext('test query')).rejects.toThrow(
      'Failed to retrieve context'
    );
  });

  it('should fall back gracefully when reranking fails', async () => {
    vi.mocked(mockVectorService.search).mockResolvedValue(mockSearchResults);
    vi.mocked(mockClient.request).mockRejectedValue(
      new Error('Reranking API error')
    );

    // Should not throw, should return original results
    const results = await ragService.rerankResults('query', mockSearchResults);

    expect(results).toEqual(mockSearchResults);
  });

  it('should handle health check gracefully', async () => {
    vi.mocked(mockVectorService.search).mockResolvedValue([]);

    const health = await ragService.healthCheck();

    expect(health.status).toBe('healthy');
    expect(health.latency).toBeGreaterThan(0);
  });

  it('should report unhealthy status on failure', async () => {
    vi.mocked(mockVectorService.search).mockRejectedValue(
      new Error('Service unavailable')
    );

    const health = await ragService.healthCheck();

    expect(health.status).toBe('unhealthy');
    expect(health.error).toBeDefined();
  });
});

// ============================================================================
// Statistics & Monitoring Tests
// ============================================================================

describe('RAGService - Statistics', () => {
  let ragService: RAGService;
  let mockClient: RuvectorClient;
  let mockVectorService: VectorService;

  beforeEach(() => {
    mockClient = createMockClient();
    mockVectorService = createMockVectorService();
    ragService = new RAGService(mockClient, mockVectorService);
  });

  it('should calculate index statistics', async () => {
    const mockResults = [
      {
        id: 'c1',
        text: 'text',
        score: 0.9,
        metadata: { documentId: 'doc-1' },
      },
      {
        id: 'c2',
        text: 'text',
        score: 0.9,
        metadata: { documentId: 'doc-1' },
      },
      {
        id: 'c3',
        text: 'text',
        score: 0.9,
        metadata: { documentId: 'doc-2' },
      },
    ];

    vi.mocked(mockVectorService.search).mockResolvedValue(mockResults);

    const stats = await ragService.getIndexStats();

    expect(stats.totalDocuments).toBe(2);
    expect(stats.totalChunks).toBe(3);
    expect(stats.avgChunksPerDocument).toBe(1.5);
  });
});
