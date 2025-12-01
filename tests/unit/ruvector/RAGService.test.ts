/**
 * RAGService Unit Tests
 *
 * Comprehensive test coverage for:
 * - Document indexing (single and batch)
 * - Document removal
 * - Context retrieval (general and document-specific)
 * - Prompt preparation for Claude
 * - Result reranking with fallback
 * - Token budget calculation
 * - Citation formatting
 * - Chunking with various sizes/overlaps
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RAGService, VectorService } from '../../../src/services/ruvector/RAGService';
import type { RuvectorClient } from '../../../src/services/ruvector/client';
import type {
  RAGDocument,
  RAGContext,
  VectorSearchResult,
} from '../../../src/services/ruvector/types';
import { RAGError } from '../../../src/services/ruvector/types';

// ============================================================================
// Mock Setup
// ============================================================================

const createMockClient = (): RuvectorClient => ({
  request: vi.fn(),
  getConfig: vi.fn(() => ({
    apiKey: 'test-key',
    baseUrl: 'https://api.ruvector.com',
  })),
} as unknown as RuvectorClient);

const createMockVectorService = (): VectorService => ({
  embed: vi.fn(),
  upsert: vi.fn(),
  search: vi.fn(),
  delete: vi.fn(),
} as unknown as VectorService);

// ============================================================================
// Test Suite
// ============================================================================

describe('RAGService', () => {
  let service: RAGService;
  let mockClient: RuvectorClient;
  let mockVectorService: VectorService;

  beforeEach(() => {
    mockClient = createMockClient();
    mockVectorService = createMockVectorService();
    service = new RAGService(mockClient, mockVectorService);
  });

  // ==========================================================================
  // Document Indexing Tests
  // ==========================================================================

  describe('indexDocument', () => {
    it('should index a document with automatic chunking', async () => {
      const document: RAGDocument = {
        id: 'doc-1',
        text: 'This is a test document with enough text to be chunked into multiple pieces for testing.',
        metadata: { source: 'test' },
      };

      vi.mocked(mockVectorService.embed).mockResolvedValue([
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ]);
      vi.mocked(mockVectorService.upsert).mockResolvedValue({
        upsertedCount: 2,
        ids: ['doc-1-chunk-0', 'doc-1-chunk-1'],
      });

      await service.indexDocument(document, { chunkSize: 5, chunkOverlap: 2 });

      expect(mockVectorService.embed).toHaveBeenCalled();
      expect(mockVectorService.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringContaining('doc-1-chunk'),
            metadata: expect.objectContaining({
              documentId: 'doc-1',
              source: 'test',
            }),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should use pre-chunked document if chunks are provided', async () => {
      const document: RAGDocument = {
        id: 'doc-2',
        text: 'Full text',
        chunks: [
          { id: 'custom-1', text: 'Chunk one', position: 0 },
          { id: 'custom-2', text: 'Chunk two', position: 1 },
        ],
      };

      vi.mocked(mockVectorService.embed).mockResolvedValue([
        [0.1, 0.2],
        [0.3, 0.4],
      ]);
      vi.mocked(mockVectorService.upsert).mockResolvedValue({
        upsertedCount: 2,
        ids: ['custom-1', 'custom-2'],
      });

      await service.indexDocument(document);

      expect(mockVectorService.embed).toHaveBeenCalledWith(['Chunk one', 'Chunk two']);
      expect(mockVectorService.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'custom-1', text: 'Chunk one' }),
          expect.objectContaining({ id: 'custom-2', text: 'Chunk two' }),
        ]),
        expect.any(Object)
      );
    });

    it('should respect chunk size and overlap configuration', async () => {
      const document: RAGDocument = {
        id: 'doc-3',
        text: 'word1 word2 word3 word4 word5 word6 word7 word8',
      };

      vi.mocked(mockVectorService.embed).mockResolvedValue([[0.1, 0.2]]);
      vi.mocked(mockVectorService.upsert).mockResolvedValue({
        upsertedCount: 1,
        ids: ['doc-3-chunk-0'],
      });

      await service.indexDocument(document, { chunkSize: 3, chunkOverlap: 1 });

      const embedCall = vi.mocked(mockVectorService.embed).mock.calls[0][0];
      expect(embedCall.length).toBeGreaterThan(1); // Should create multiple chunks
    });

    it('should include custom metadata in indexed chunks', async () => {
      const document: RAGDocument = {
        id: 'doc-4',
        text: 'Test document',
        metadata: { author: 'Test Author', date: '2025-01-01' },
      };

      vi.mocked(mockVectorService.embed).mockResolvedValue([[0.1]]);
      vi.mocked(mockVectorService.upsert).mockResolvedValue({
        upsertedCount: 1,
        ids: ['doc-4-chunk-0'],
      });

      await service.indexDocument(document, {
        metadata: { indexedBy: 'test-suite' },
      });

      expect(mockVectorService.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            metadata: expect.objectContaining({
              author: 'Test Author',
              date: '2025-01-01',
              indexedBy: 'test-suite',
              documentId: 'doc-4',
            }),
          }),
        ]),
        expect.any(Object)
      );
    });

    it('should throw RAGError when embedding fails', async () => {
      const document: RAGDocument = { id: 'doc-5', text: 'Test' };

      vi.mocked(mockVectorService.embed).mockRejectedValue(
        new Error('Embedding API failed')
      );

      await expect(service.indexDocument(document)).rejects.toThrow(RAGError);
      await expect(service.indexDocument(document)).rejects.toThrow(
        'Failed to index document doc-5'
      );
    });
  });

  describe('indexDocuments', () => {
    it('should index multiple documents in batch', async () => {
      const documents: RAGDocument[] = [
        { id: 'doc-1', text: 'Document one' },
        { id: 'doc-2', text: 'Document two' },
        { id: 'doc-3', text: 'Document three' },
      ];

      vi.mocked(mockVectorService.embed).mockResolvedValue([[0.1]]);
      vi.mocked(mockVectorService.upsert).mockResolvedValue({
        upsertedCount: 1,
        ids: ['chunk-0'],
      });

      const result = await service.indexDocuments(documents);

      expect(result.total).toBe(3);
      expect(result.succeeded).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockVectorService.embed).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures and continue processing', async () => {
      const documents: RAGDocument[] = [
        { id: 'doc-1', text: 'Success' },
        { id: 'doc-2', text: 'Fail' },
        { id: 'doc-3', text: 'Success' },
      ];

      vi.mocked(mockVectorService.embed)
        .mockResolvedValueOnce([[0.1]])
        .mockRejectedValueOnce(new Error('Embedding failed'))
        .mockResolvedValueOnce([[0.2]]);
      vi.mocked(mockVectorService.upsert).mockResolvedValue({
        upsertedCount: 1,
        ids: ['chunk-0'],
      });

      const result = await service.indexDocuments(documents);

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].index).toBe(1);
    });

    it('should return error details for failed documents', async () => {
      const documents: RAGDocument[] = [{ id: 'doc-1', text: 'Test' }];

      vi.mocked(mockVectorService.embed).mockRejectedValue(
        new Error('Custom error message')
      );

      const result = await service.indexDocuments(documents);

      expect(result.failed).toBe(1);
      expect(result.errors?.[0].error).toContain('Custom error message');
    });
  });

  describe('removeDocument', () => {
    it('should remove document and all its chunks', async () => {
      const documentId = 'doc-to-remove';

      const searchResults: VectorSearchResult[] = [
        { id: 'chunk-1', score: 1.0, text: 'Chunk 1' },
        { id: 'chunk-2', score: 1.0, text: 'Chunk 2' },
        { id: 'chunk-3', score: 1.0, text: 'Chunk 3' },
      ];

      vi.mocked(mockVectorService.search).mockResolvedValue(searchResults);
      vi.mocked(mockVectorService.delete).mockResolvedValue(undefined);

      await service.removeDocument(documentId);

      expect(mockVectorService.search).toHaveBeenCalledWith('', {
        filter: { documentId },
        topK: 1000,
      });
      expect(mockVectorService.delete).toHaveBeenCalledWith([
        'chunk-1',
        'chunk-2',
        'chunk-3',
      ]);
    });

    it('should handle removal of non-existent document gracefully', async () => {
      vi.mocked(mockVectorService.search).mockResolvedValue([]);
      vi.mocked(mockVectorService.delete).mockResolvedValue(undefined);

      await expect(service.removeDocument('nonexistent')).resolves.not.toThrow();
    });

    it('should throw RAGError when deletion fails', async () => {
      vi.mocked(mockVectorService.search).mockResolvedValue([
        { id: 'chunk-1', score: 1.0, text: 'Test' },
      ]);
      vi.mocked(mockVectorService.delete).mockRejectedValue(
        new Error('Delete failed')
      );

      await expect(service.removeDocument('doc-1')).rejects.toThrow(RAGError);
    });
  });

  // ==========================================================================
  // Context Retrieval Tests
  // ==========================================================================

  describe('retrieveContext', () => {
    it('should retrieve relevant context chunks for a query', async () => {
      const searchResults: VectorSearchResult[] = [
        {
          id: 'chunk-1',
          score: 0.95,
          text: 'Most relevant chunk',
          metadata: { documentId: 'doc-1' },
        },
        {
          id: 'chunk-2',
          score: 0.85,
          text: 'Second relevant chunk',
          metadata: { documentId: 'doc-1' },
        },
      ];

      vi.mocked(mockVectorService.search).mockResolvedValue(searchResults);

      const context = await service.retrieveContext('test query', {
        topK: 2,
        rerank: false,
      });

      expect(context.chunks).toHaveLength(2);
      expect(context.documentIds).toEqual(['doc-1']);
      expect(context.totalChunks).toBe(2);
      expect(context.chunks[0].text).toBe('Most relevant chunk');
    });

    it('should apply reranking when enabled', async () => {
      const candidateResults: VectorSearchResult[] = Array.from({ length: 20 }, (_, i) => ({
        id: `chunk-${i}`,
        score: 0.7,
        text: `Chunk ${i}`,
        metadata: { documentId: 'doc-1' },
      }));

      const rerankedResults = [
        { index: 5, score: 0.95 },
        { index: 2, score: 0.90 },
        { index: 8, score: 0.85 },
      ];

      vi.mocked(mockVectorService.search).mockResolvedValue(candidateResults);
      vi.mocked(mockClient.request).mockResolvedValue({ results: rerankedResults });

      const context = await service.retrieveContext('test query', {
        topK: 3,
        rerank: true,
      });

      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        path: '/v1/rag/rerank',
        body: expect.objectContaining({
          query: 'test query',
          documents: expect.arrayContaining([expect.any(String)]),
        }),
      });
      expect(context.chunks).toHaveLength(3);
    });

    it('should filter results by minimum relevance threshold', async () => {
      const searchResults: VectorSearchResult[] = [
        { id: 'chunk-1', score: 0.95, text: 'High relevance' },
        { id: 'chunk-2', score: 0.85, text: 'Medium relevance' },
        { id: 'chunk-3', score: 0.60, text: 'Low relevance' },
      ];

      vi.mocked(mockVectorService.search).mockResolvedValue(searchResults);

      await service.retrieveContext('test query', {
        minRelevance: 0.8,
        rerank: false,
      });

      expect(mockVectorService.search).toHaveBeenCalledWith('test query', {
        topK: expect.any(Number),
        minSimilarity: 0.8,
        includeMetadata: true,
      });
    });

    it('should collect unique document IDs from results', async () => {
      const searchResults: VectorSearchResult[] = [
        { id: 'c1', score: 0.9, text: 'T1', metadata: { documentId: 'doc-1' } },
        { id: 'c2', score: 0.8, text: 'T2', metadata: { documentId: 'doc-2' } },
        { id: 'c3', score: 0.7, text: 'T3', metadata: { documentId: 'doc-1' } },
      ];

      vi.mocked(mockVectorService.search).mockResolvedValue(searchResults);

      const context = await service.retrieveContext('query', { rerank: false });

      expect(context.documentIds).toEqual(['doc-1', 'doc-2']);
    });

    it('should throw RAGError when retrieval fails', async () => {
      vi.mocked(mockVectorService.search).mockRejectedValue(
        new Error('Search failed')
      );

      await expect(service.retrieveContext('query')).rejects.toThrow(RAGError);
      await expect(service.retrieveContext('query')).rejects.toThrow(
        'Failed to retrieve context'
      );
    });
  });

  describe('retrieveContextForQuestion', () => {
    it('should retrieve context filtered by document IDs', async () => {
      const documentIds = ['doc-1', 'doc-2'];
      const searchResults: VectorSearchResult[] = [
        { id: 'c1', score: 0.9, text: 'Test', metadata: { documentId: 'doc-1' } },
      ];

      vi.mocked(mockVectorService.search).mockResolvedValue(searchResults);

      const context = await service.retrieveContextForQuestion('question', documentIds);

      expect(mockVectorService.search).toHaveBeenCalledWith('question', {
        filter: { documentId: { $in: documentIds } },
        topK: 5,
        includeMetadata: true,
      });
      expect(context.documentIds).toEqual(documentIds);
    });

    it('should throw RAGError on failure', async () => {
      vi.mocked(mockVectorService.search).mockRejectedValue(new Error('Failed'));

      await expect(
        service.retrieveContextForQuestion('q', ['doc-1'])
      ).rejects.toThrow(RAGError);
    });
  });

  // ==========================================================================
  // Prompt Preparation Tests
  // ==========================================================================

  describe('preparePrompt', () => {
    it('should prepare complete prompt with context for Claude', async () => {
      const searchResults: VectorSearchResult[] = [
        {
          id: 'chunk-1',
          score: 0.9,
          text: 'Relevant information here',
          metadata: { documentId: 'doc-1', position: 0 },
        },
      ];

      vi.mocked(mockVectorService.search).mockResolvedValue(searchResults);

      const result = await service.preparePrompt('What is the answer?', {
        rerank: false,
      });

      expect(result.systemPrompt).toContain('helpful assistant');
      expect(result.systemPrompt).toContain('cite your sources');
      expect(result.userPrompt).toContain('Context:');
      expect(result.userPrompt).toContain('[Source 1]');
      expect(result.userPrompt).toContain('What is the answer?');
      expect(result.context.chunks).toHaveLength(1);
    });

    it('should use custom system prompt if provided', async () => {
      vi.mocked(mockVectorService.search).mockResolvedValue([
        { id: 'c1', score: 0.9, text: 'Test' },
      ]);

      const customSystemPrompt = 'You are a specialized expert in testing.';

      const result = await service.preparePrompt('query', {
        systemPrompt: customSystemPrompt,
        rerank: false,
      });

      expect(result.systemPrompt).toBe(customSystemPrompt);
    });

    it('should format context with proper citations', async () => {
      const searchResults: VectorSearchResult[] = [
        {
          id: 'c1',
          score: 0.95,
          text: 'First chunk',
          metadata: { documentId: 'doc-1', position: 0 },
        },
        {
          id: 'c2',
          score: 0.85,
          text: 'Second chunk',
          metadata: { documentId: 'doc-2', position: 5 },
        },
      ];

      vi.mocked(mockVectorService.search).mockResolvedValue(searchResults);

      const result = await service.preparePrompt('query', { rerank: false });

      expect(result.userPrompt).toContain('[Source 1]');
      expect(result.userPrompt).toContain('Document: doc-1');
      expect(result.userPrompt).toContain('Position: 0');
      expect(result.userPrompt).toContain('[Source 2]');
      expect(result.userPrompt).toContain('Document: doc-2');
    });

    it('should throw RAGError when preparation fails', async () => {
      vi.mocked(mockVectorService.search).mockRejectedValue(new Error('Failed'));

      await expect(service.preparePrompt('query')).rejects.toThrow(RAGError);
      await expect(service.preparePrompt('query')).rejects.toThrow(
        'Failed to prepare prompt'
      );
    });
  });

  // ==========================================================================
  // Reranking Tests
  // ==========================================================================

  describe('rerankResults', () => {
    it('should rerank results using API and apply threshold', async () => {
      const results: VectorSearchResult[] = [
        { id: 'c1', score: 0.7, text: 'Text 1' },
        { id: 'c2', score: 0.7, text: 'Text 2' },
        { id: 'c3', score: 0.7, text: 'Text 3' },
      ];

      const rerankedScores = [
        { index: 2, score: 0.95 },
        { index: 0, score: 0.85 },
        { index: 1, score: 0.45 }, // Below threshold
      ];

      vi.mocked(mockClient.request).mockResolvedValue({ results: rerankedScores });

      const reranked = await service.rerankResults('query', results, {
        threshold: 0.5,
      });

      expect(reranked).toHaveLength(2);
      expect(reranked[0].id).toBe('c3');
      expect(reranked[0].score).toBe(0.95);
      expect(reranked[1].id).toBe('c1');
      expect(reranked[1].score).toBe(0.85);
    });

    it('should limit candidates to maxCandidates', async () => {
      const results: VectorSearchResult[] = Array.from({ length: 50 }, (_, i) => ({
        id: `chunk-${i}`,
        score: 0.7,
        text: `Text ${i}`,
      }));

      vi.mocked(mockClient.request).mockResolvedValue({ results: [] });

      await service.rerankResults('query', results, { maxCandidates: 10 });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            documents: expect.arrayContaining([expect.any(String)]),
          }),
        })
      );

      const callBody = vi.mocked(mockClient.request).mock.calls[0][0].body as any;
      expect(callBody.documents).toHaveLength(10);
    });

    it('should fallback to original results if reranking fails', async () => {
      const results: VectorSearchResult[] = [
        { id: 'c1', score: 0.8, text: 'Test 1' },
        { id: 'c2', score: 0.7, text: 'Test 2' },
      ];

      vi.mocked(mockClient.request).mockRejectedValue(new Error('API error'));

      const reranked = await service.rerankResults('query', results);

      expect(reranked).toEqual(results);
    });
  });

  // ==========================================================================
  // Token Budget & Context Formatting Tests
  // ==========================================================================

  describe('getOptimalContextWindow', () => {
    it('should calculate context window for Claude Sonnet 4', () => {
      const window = service.getOptimalContextWindow(8000, 'claude-sonnet-4-20250514');

      // With 200k model limit, reserves 2700 tokens, applies 10% safety margin
      expect(window).toBeGreaterThan(6000);
      expect(window).toBeLessThan(8000);
    });

    it('should respect token budget when smaller than model limit', () => {
      const window = service.getOptimalContextWindow(5000, 'claude-sonnet-4-20250514');

      expect(window).toBeLessThan(5000);
    });

    it('should use model limit when token budget exceeds it', () => {
      const window = service.getOptimalContextWindow(
        300000,
        'claude-sonnet-4-20250514'
      );

      // Should cap at (200000 - 2700) * 0.9
      expect(window).toBeLessThan(200000);
    });

    it('should default to 200k for unknown models', () => {
      const window = service.getOptimalContextWindow(10000, 'unknown-model' as any);

      expect(window).toBeGreaterThan(0);
      expect(window).toBeLessThan(10000);
    });
  });

  describe('formatContextForClaude', () => {
    it('should format context with proper citations and metadata', () => {
      const context: RAGContext = {
        chunks: [
          {
            text: 'First relevant chunk',
            score: 0.95,
            metadata: { documentId: 'doc-1', position: 0 },
          },
          {
            text: 'Second relevant chunk',
            score: 0.85,
            metadata: { documentId: 'doc-2', position: 3 },
          },
        ],
        documentIds: ['doc-1', 'doc-2'],
        totalChunks: 2,
      };

      const formatted = service.formatContextForClaude(context);

      expect(formatted).toContain('[Source 1]');
      expect(formatted).toContain('Document: doc-1');
      expect(formatted).toContain('Position: 0');
      expect(formatted).toContain('Relevance: 95.0%');
      expect(formatted).toContain('First relevant chunk');
      expect(formatted).toContain('[Source 2]');
      expect(formatted).toContain('Document: doc-2');
      expect(formatted).toContain('Position: 3');
      expect(formatted).toContain('Relevance: 85.0%');
      expect(formatted).toContain('Second relevant chunk');
    });

    it('should handle missing metadata gracefully', () => {
      const context: RAGContext = {
        chunks: [{ text: 'Test chunk', score: 0.9 }],
        documentIds: [],
        totalChunks: 1,
      };

      const formatted = service.formatContextForClaude(context);

      expect(formatted).toContain('[Source 1]');
      expect(formatted).toContain('Document: Unknown');
      expect(formatted).toContain('Test chunk');
    });
  });

  describe('assembleContextWithinBudget', () => {
    it('should assemble context within token budget', () => {
      const chunks = [
        { text: 'Short chunk 1', score: 0.9, metadata: { documentId: 'doc-1' } },
        {
          text: 'Very long chunk that contains many words and exceeds token budget',
          score: 0.8,
          metadata: { documentId: 'doc-1' },
        },
        { text: 'Short chunk 2', score: 0.7, metadata: { documentId: 'doc-2' } },
      ];

      const context = service.assembleContextWithinBudget(chunks, 10);

      expect(context.chunks.length).toBeGreaterThan(0);
      expect(context.chunks.length).toBeLessThan(chunks.length);
      expect(context.documentIds.length).toBeGreaterThan(0);
    });

    it('should prioritize chunks by relevance score', () => {
      const chunks = [
        { text: 'Low score', score: 0.6 },
        { text: 'High score', score: 0.95 },
        { text: 'Medium score', score: 0.8 },
      ];

      const context = service.assembleContextWithinBudget(chunks, 1000);

      expect(context.chunks[0].text).toBe('High score');
    });

    it('should collect unique document IDs', () => {
      const chunks = [
        { text: 'C1', score: 0.9, metadata: { documentId: 'doc-1' } },
        { text: 'C2', score: 0.8, metadata: { documentId: 'doc-2' } },
        { text: 'C3', score: 0.7, metadata: { documentId: 'doc-1' } },
      ];

      const context = service.assembleContextWithinBudget(chunks, 1000);

      expect(context.documentIds).toEqual(['doc-1', 'doc-2']);
    });
  });

  // ==========================================================================
  // Monitoring & Health Check Tests
  // ==========================================================================

  describe('getIndexStats', () => {
    it('should return statistics for indexed documents', async () => {
      const searchResults: VectorSearchResult[] = [
        { id: 'c1', score: 1, text: 'T1', metadata: { documentId: 'doc-1' } },
        { id: 'c2', score: 1, text: 'T2', metadata: { documentId: 'doc-1' } },
        { id: 'c3', score: 1, text: 'T3', metadata: { documentId: 'doc-2' } },
        { id: 'c4', score: 1, text: 'T4', metadata: { documentId: 'doc-2' } },
      ];

      vi.mocked(mockVectorService.search).mockResolvedValue(searchResults);

      const stats = await service.getIndexStats();

      expect(stats.totalDocuments).toBe(2);
      expect(stats.totalChunks).toBe(4);
      expect(stats.avgChunksPerDocument).toBe(2);
    });

    it('should handle empty index', async () => {
      vi.mocked(mockVectorService.search).mockResolvedValue([]);

      const stats = await service.getIndexStats();

      expect(stats.totalDocuments).toBe(0);
      expect(stats.totalChunks).toBe(0);
      expect(stats.avgChunksPerDocument).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when service is operational', async () => {
      vi.mocked(mockVectorService.search).mockResolvedValue([]);

      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.latency).toBeGreaterThan(0);
    });

    it('should return unhealthy status on failure', async () => {
      vi.mocked(mockVectorService.search).mockRejectedValue(
        new Error('Service down')
      );

      const health = await service.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.error).toContain('Service down');
      expect(health.latency).toBeGreaterThan(0);
    });
  });
});
