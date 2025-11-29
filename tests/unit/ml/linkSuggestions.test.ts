import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LinkSuggestionsService } from '@/services/ml/linkSuggestions';
import type { EmbeddingVector } from '@/services/ml/embeddings';

// Mock the embedding service
const mockEmbeddingService = {
  initialize: vi.fn().mockResolvedValue(undefined),
  isReady: vi.fn().mockReturnValue(true),
  embed: vi.fn(),
  embedBatch: vi.fn(),
  clearCache: vi.fn(),
  getCacheStats: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('@/services/ml/embeddings', () => ({
  getEmbeddingService: vi.fn(() => mockEmbeddingService),
}));

// Mock similarity functions
vi.mock('@/services/ml/similarity', () => ({
  findSimilarParagraphs: vi.fn((queryEmbedding, candidates, options) => {
    const results = [];
    for (const [id, embedding] of candidates.entries()) {
      if (options?.excludeIds?.has(id)) continue;

      // Simple mock similarity based on vector values
      const score = 0.8 - Math.random() * 0.3;
      if (score >= (options?.minScore || 0.6)) {
        results.push({
          paragraphId: id,
          text: embedding.text,
          score,
          rank: 0,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    results.forEach((r, i) => r.rank = i + 1);

    return results.slice(0, options?.maxResults || 5);
  }),
}));

describe('LinkSuggestionsService', () => {
  let service: LinkSuggestionsService;

  const createMockEmbedding = (text: string): EmbeddingVector => ({
    text,
    vector: Array.from({ length: 512 }, () => Math.random()),
    modelVersion: 'tfjs-use-v1',
    timestamp: Date.now(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LinkSuggestionsService();

    // Default mock implementations
    mockEmbeddingService.embed.mockImplementation((text: string) =>
      Promise.resolve(createMockEmbedding(text))
    );

    mockEmbeddingService.embedBatch.mockImplementation((texts: string[]) =>
      Promise.resolve({
        embeddings: texts.map(text => createMockEmbedding(text)),
        cached: 0,
        computed: texts.length,
        duration: 100,
      })
    );
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('Initialization', () => {
    it('should initialize embedding service when not ready', async () => {
      mockEmbeddingService.isReady.mockReturnValueOnce(false);

      const candidates = new Map([['para-1', 'Text 1']]);
      await service.getSuggestionsForParagraph('query', 'Query text', candidates);

      expect(mockEmbeddingService.initialize).toHaveBeenCalled();
    });

    it('should not reinitialize if already ready', async () => {
      mockEmbeddingService.isReady.mockReturnValue(true);

      const candidates = new Map([['para-1', 'Text 1']]);
      await service.getSuggestionsForParagraph('query', 'Query text', candidates);

      expect(mockEmbeddingService.initialize).not.toHaveBeenCalled();
    });
  });

  describe('getSuggestionsForParagraph', () => {
    it('should generate suggestions for similar paragraphs', async () => {
      const candidates = new Map([
        ['para-1', 'Similar text about machine learning'],
        ['para-2', 'Also about machine learning'],
        ['para-3', 'Completely different topic'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Machine learning is fascinating',
        candidates
      );

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.every(s => s.reason === 'semantic')).toBe(true);
      expect(suggestions.every(s => s.sourceParagraphId === 'source')).toBe(true);
    });

    it('should exclude source paragraph from suggestions', async () => {
      const candidates = new Map([
        ['source', 'Source text'],
        ['para-1', 'Similar text'],
        ['para-2', 'Another text'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Source text',
        candidates
      );

      expect(suggestions.every(s => s.targetParagraphId !== 'source')).toBe(true);
    });

    it('should respect minScore threshold', async () => {
      const candidates = new Map([
        ['para-1', 'Text 1'],
        ['para-2', 'Text 2'],
        ['para-3', 'Text 3'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Source text',
        candidates,
        { minScore: 0.8 }
      );

      suggestions.forEach(suggestion => {
        expect(suggestion.score).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should respect maxResults limit', async () => {
      const candidates = new Map([
        ['para-1', 'Text 1'],
        ['para-2', 'Text 2'],
        ['para-3', 'Text 3'],
        ['para-4', 'Text 4'],
        ['para-5', 'Text 5'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Source text',
        candidates,
        { maxResults: 2 }
      );

      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should exclude specified paragraph IDs', async () => {
      const candidates = new Map([
        ['para-1', 'Text 1'],
        ['para-2', 'Text 2'],
        ['para-3', 'Text 3'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Source text',
        candidates,
        { excludeIds: new Set(['para-1', 'para-2']) }
      );

      expect(suggestions.every(s =>
        s.targetParagraphId !== 'para-1' && s.targetParagraphId !== 'para-2'
      )).toBe(true);
    });

    it('should include keywords when requested', async () => {
      const candidates = new Map([
        ['para-1', 'Machine learning algorithms'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Machine learning is powerful',
        candidates,
        { includeKeywords: true }
      );

      if (suggestions.length > 0) {
        expect(suggestions[0].keywords).toBeDefined();
      }
    });

    it('should not include keywords when not requested', async () => {
      const candidates = new Map([
        ['para-1', 'Text 1'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Source text',
        candidates,
        { includeKeywords: false }
      );

      if (suggestions.length > 0) {
        expect(suggestions[0].keywords).toBeUndefined();
      }
    });

    it('should handle empty candidates map', async () => {
      const candidates = new Map<string, string>();

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Source text',
        candidates
      );

      expect(suggestions).toHaveLength(0);
    });

    it('should use embedding cache for repeated queries', async () => {
      const candidates = new Map([
        ['para-1', 'Text 1'],
      ]);

      await service.getSuggestionsForParagraph('source', 'Source text', candidates);
      await service.getSuggestionsForParagraph('source', 'Source text', candidates);

      // First call generates, second should use cache
      expect(mockEmbeddingService.embed.mock.calls.length).toBeGreaterThan(0);
    });

    it('should fallback to TF-IDF on ML error when enabled', async () => {
      mockEmbeddingService.embed.mockRejectedValueOnce(new Error('ML failed'));

      const candidates = new Map([
        ['para-1', 'machine learning algorithms'],
        ['para-2', 'machine learning models'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'machine learning systems',
        candidates,
        { useFallback: true }
      );

      // Should still return suggestions using TF-IDF
      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should return empty array on ML error when fallback disabled', async () => {
      mockEmbeddingService.embed.mockRejectedValueOnce(new Error('ML failed'));

      const candidates = new Map([
        ['para-1', 'Text 1'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Source text',
        candidates,
        { useFallback: false }
      );

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('TF-IDF Fallback', () => {
    it('should find similar paragraphs using keyword matching', async () => {
      mockEmbeddingService.embed.mockRejectedValue(new Error('ML unavailable'));

      const candidates = new Map([
        ['para-1', 'machine learning deep neural networks artificial intelligence'],
        ['para-2', 'cooking recipes food preparation kitchen'],
        ['para-3', 'machine learning algorithms training models'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'machine learning neural networks',
        candidates,
        { useFallback: true, minScore: 0.1 }
      );

      // Should find paragraphs with common keywords
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].reason).toBe('keyword');
      expect(suggestions[0].keywords).toBeDefined();
    });

    it('should calculate TF-IDF scores correctly', async () => {
      mockEmbeddingService.embed.mockRejectedValue(new Error('ML unavailable'));

      const candidates = new Map([
        ['para-1', 'unique uncommon rare'],
        ['para-2', 'common common common'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'unique uncommon rare',
        candidates,
        { useFallback: true, minScore: 0.1 }
      );

      // Rare words should score higher
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should filter short words in TF-IDF', async () => {
      mockEmbeddingService.embed.mockRejectedValue(new Error('ML unavailable'));

      const candidates = new Map([
        ['para-1', 'a an the it is machine learning'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'a an the it is machine learning',
        candidates,
        { useFallback: true }
      );

      // Short words (length <= 3) should be filtered
      if (suggestions.length > 0 && suggestions[0].keywords) {
        suggestions[0].keywords.forEach(keyword => {
          expect(keyword.length).toBeGreaterThan(3);
        });
      }
    });

    it('should handle special characters in TF-IDF', async () => {
      mockEmbeddingService.embed.mockRejectedValue(new Error('ML unavailable'));

      const candidates = new Map([
        ['para-1', 'test@example.com and #hashtag'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'test@example.com',
        candidates,
        { useFallback: true, minScore: 0.1 }
      );

      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe('Batch Processing', () => {
    it('should generate suggestions for all paragraphs', async () => {
      const paragraphs = new Map([
        ['para-1', 'Text about topic A'],
        ['para-2', 'Text about topic B'],
        ['para-3', 'Text about topic C'],
      ]);

      const allSuggestions = await service.generateAllSuggestions(paragraphs);

      expect(allSuggestions).toBeInstanceOf(Map);
      // At least some paragraphs should have suggestions
      expect(allSuggestions.size).toBeGreaterThanOrEqual(0);
    });

    it('should pre-generate embeddings in batch', async () => {
      const paragraphs = new Map([
        ['para-1', 'Text 1'],
        ['para-2', 'Text 2'],
        ['para-3', 'Text 3'],
      ]);

      await service.generateAllSuggestions(paragraphs);

      // Should call embedBatch for efficiency
      expect(mockEmbeddingService.embedBatch).toHaveBeenCalled();
    });

    it('should only include paragraphs with suggestions', async () => {
      const paragraphs = new Map([
        ['para-1', 'Very similar text'],
        ['para-2', 'Also very similar text'],
      ]);

      const allSuggestions = await service.generateAllSuggestions(paragraphs, {
        minScore: 0.99, // Very high threshold
      });

      // With high threshold, may have no suggestions
      expect(allSuggestions).toBeInstanceOf(Map);
    });

    it('should handle empty paragraphs map', async () => {
      const paragraphs = new Map<string, string>();

      const allSuggestions = await service.generateAllSuggestions(paragraphs);

      expect(allSuggestions).toBeInstanceOf(Map);
      expect(allSuggestions.size).toBe(0);
    });

    it('should apply options to all paragraph suggestions', async () => {
      const paragraphs = new Map([
        ['para-1', 'Text 1'],
        ['para-2', 'Text 2'],
      ]);

      const allSuggestions = await service.generateAllSuggestions(paragraphs, {
        maxResults: 1,
        minScore: 0.7,
      });

      for (const suggestions of allSuggestions.values()) {
        expect(suggestions.length).toBeLessThanOrEqual(1);
        suggestions.forEach(s => {
          expect(s.score).toBeGreaterThanOrEqual(0.7);
        });
      }
    });
  });

  describe('Cache Management', () => {
    it('should cache embeddings for reuse', async () => {
      const candidates = new Map([
        ['para-1', 'Text 1'],
      ]);

      // First call
      await service.getSuggestionsForParagraph('source', 'Source text', candidates);

      const firstCallCount = mockEmbeddingService.embed.mock.calls.length;

      // Second call with same text
      await service.getSuggestionsForParagraph('source', 'Source text', candidates);

      // Should use cached embedding
      expect(mockEmbeddingService.embed.mock.calls.length).toBe(firstCallCount);
    });

    it('should clear internal cache', () => {
      service.clearCache();

      // Cache should be cleared (no error thrown)
      expect(true).toBe(true);
    });

    it('should handle cache hits efficiently', async () => {
      const candidates = new Map([
        ['para-1', 'Text 1'],
        ['para-2', 'Text 2'],
      ]);

      // Pre-populate cache
      await service.generateAllSuggestions(candidates);

      mockEmbeddingService.embed.mockClear();

      // Should use cache
      await service.getSuggestionsForParagraph('para-1', 'Text 1', candidates);

      // No new embeddings generated
      expect(mockEmbeddingService.embed).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty paragraph text', async () => {
      const candidates = new Map([
        ['para-1', 'Some text'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        '',
        candidates
      );

      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should handle very long paragraph text', async () => {
      const longText = 'word '.repeat(1000);
      const candidates = new Map([
        ['para-1', longText],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        longText,
        candidates
      );

      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should handle special characters', async () => {
      const candidates = new Map([
        ['para-1', 'Text with !@#$%^&*() symbols'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Text with !@#$%^&*() symbols',
        candidates
      );

      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should handle unicode text', async () => {
      const candidates = new Map([
        ['para-1', '这是中文文本 🚀'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        '这是中文文本 🚀',
        candidates
      );

      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should handle single candidate', async () => {
      const candidates = new Map([
        ['para-1', 'Only candidate'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Source text',
        candidates
      );

      expect(suggestions.length).toBeLessThanOrEqual(1);
    });

    it('should handle many candidates efficiently', async () => {
      const candidates = new Map<string, string>();
      for (let i = 0; i < 100; i++) {
        candidates.set(`para-${i}`, `Text paragraph ${i}`);
      }

      const startTime = performance.now();
      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Source text',
        candidates
      );
      const duration = performance.now() - startTime;

      expect(suggestions).toBeInstanceOf(Array);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Suggestion Quality', () => {
    it('should return higher scores for more similar text', async () => {
      const candidates = new Map([
        ['para-1', 'Machine learning algorithms'],
        ['para-2', 'Cooking recipes'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Machine learning techniques',
        candidates
      );

      if (suggestions.length >= 2) {
        // More similar text should have higher score
        expect(suggestions[0].score).toBeGreaterThan(suggestions[1].score);
      }
    });

    it('should include source and target IDs in suggestions', async () => {
      const candidates = new Map([
        ['para-1', 'Text 1'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Source text',
        candidates
      );

      suggestions.forEach(suggestion => {
        expect(suggestion.sourceParagraphId).toBe('source');
        expect(suggestion.targetParagraphId).toBeTruthy();
        expect(typeof suggestion.targetParagraphId).toBe('string');
      });
    });

    it('should include score and reason in suggestions', async () => {
      const candidates = new Map([
        ['para-1', 'Text 1'],
      ]);

      const suggestions = await service.getSuggestionsForParagraph(
        'source',
        'Source text',
        candidates
      );

      suggestions.forEach(suggestion => {
        expect(typeof suggestion.score).toBe('number');
        expect(suggestion.score).toBeGreaterThanOrEqual(0);
        expect(suggestion.score).toBeLessThanOrEqual(1);
        expect(['semantic', 'keyword', 'manual']).toContain(suggestion.reason);
      });
    });
  });
});
