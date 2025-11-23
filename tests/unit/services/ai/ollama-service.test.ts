/**
 * OllamaService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OllamaService } from '@/services/ai/OllamaService';

// Mock fetch
global.fetch = vi.fn();

describe('OllamaService', () => {
  let service: OllamaService;

  beforeEach(() => {
    service = new OllamaService();
    vi.clearAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is running and model is available', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              name: 'qwen2.5-coder:32b-instruct',
              modified_at: '2025-01-01T00:00:00Z',
              size: 1000000,
              digest: 'abc123',
            },
          ],
        }),
      });

      const available = await service.isAvailable();
      expect(available).toBe(true);
    });

    it('should return true when model with matching prefix is available', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              name: 'qwen2.5-coder:7b-instruct',
              modified_at: '2025-01-01T00:00:00Z',
              size: 1000000,
              digest: 'abc123',
            },
          ],
        }),
      });

      const available = await service.isAvailable();
      expect(available).toBe(true);
    });

    it('should return false when Ollama is not running', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection refused'));

      const available = await service.isAvailable();
      expect(available).toBe(false);
    });

    it('should return false when model is not available', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              name: 'llama2:7b',
              modified_at: '2025-01-01T00:00:00Z',
              size: 1000000,
              digest: 'abc123',
            },
          ],
        }),
      });

      const available = await service.isAvailable();
      expect(available).toBe(false);
    });

    it('should timeout after 5 seconds', async () => {
      vi.useFakeTimers();

      (global.fetch as any).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(resolve, 10000);
          })
      );

      const availablePromise = service.isAvailable();
      vi.advanceTimersByTime(5000);

      const available = await availablePromise;
      expect(available).toBe(false);

      vi.useRealTimers();
    });
  });

  describe('initialize', () => {
    it('should succeed when Ollama is available', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            {
              name: 'qwen2.5-coder:32b-instruct',
              modified_at: '2025-01-01T00:00:00Z',
              size: 1000000,
              digest: 'abc123',
            },
          ],
        }),
      });

      await expect(service.initialize()).resolves.toBeUndefined();
    });

    it('should throw error when Ollama is not available', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection refused'));

      await expect(service.initialize()).rejects.toThrow(
        /Ollama is not available/
      );
    });
  });

  describe('listModels', () => {
    it('should return list of available models', async () => {
      const mockModels = [
        {
          name: 'qwen2.5-coder:32b-instruct',
          modified_at: '2025-01-01T00:00:00Z',
          size: 20000000000,
          digest: 'abc123',
        },
        {
          name: 'llama2:7b',
          modified_at: '2025-01-01T00:00:00Z',
          size: 5000000000,
          digest: 'def456',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: mockModels }),
      });

      const models = await service.listModels();
      expect(models).toEqual(mockModels);
    });

    it('should throw error when request fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(service.listModels()).rejects.toThrow(
        /Failed to list models/
      );
    });
  });

  describe('summarize', () => {
    it('should generate summary with key points', async () => {
      const mockResponse = {
        model: 'qwen2.5-coder:32b-instruct',
        created_at: '2025-01-01T00:00:00Z',
        response:
          'SUMMARY: This is a test summary of the content.\nKEY POINTS:\n- First key point\n- Second key point\n- Third key point',
        done: true,
        eval_count: 50,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.summarize('Test text');

      expect(result.summary).toContain('This is a test summary');
      expect(result.keyPoints).toHaveLength(3);
      expect(result.keyPoints[0]).toBe('First key point');
      expect(result.provider).toBe('ollama');
    });

    it('should handle responses without proper formatting', async () => {
      const mockResponse = {
        model: 'qwen2.5-coder:32b-instruct',
        created_at: '2025-01-01T00:00:00Z',
        response: 'Just a plain text response without formatting',
        done: true,
        eval_count: 20,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.summarize('Test text');

      expect(result.summary).toBeTruthy();
      expect(result.keyPoints).toHaveLength(1);
      expect(result.provider).toBe('ollama');
    });

    it('should respect request options', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'qwen2.5-coder:32b-instruct',
          response: 'SUMMARY: Test\nKEY POINTS:\n- Point',
          done: true,
        }),
      });

      await service.summarize('Test', {
        temperature: 0.5,
        topP: 0.8,
        maxTokens: 200,
      });

      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.options.temperature).toBe(0.5);
      expect(body.options.top_p).toBe(0.8);
      expect(body.options.num_predict).toBe(200);
    });
  });

  describe('answerQuestion', () => {
    it('should answer questions about text', async () => {
      const mockResponse = {
        model: 'qwen2.5-coder:32b-instruct',
        created_at: '2025-01-01T00:00:00Z',
        response: 'The answer to your question is 42.',
        done: true,
        eval_count: 30,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.answerQuestion(
        'Some context text',
        'What is the answer?'
      );

      expect(result.answer).toContain('42');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.provider).toBe('ollama');
    });
  });

  describe('extractThemes', () => {
    it('should extract themes from text', async () => {
      const mockResponse = {
        model: 'qwen2.5-coder:32b-instruct',
        created_at: '2025-01-01T00:00:00Z',
        response: '- Technology\n- Innovation\n- Future\n- AI',
        done: true,
        eval_count: 25,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.extractThemes('Tech article text');

      expect(result.themes).toHaveLength(4);
      expect(result.themes).toContain('Technology');
      expect(result.themes).toContain('AI');
      expect(result.provider).toBe('ollama');
    });

    it('should return default theme when no themes found', async () => {
      const mockResponse = {
        model: 'qwen2.5-coder:32b-instruct',
        created_at: '2025-01-01T00:00:00Z',
        response: 'No clear themes in this text.',
        done: true,
        eval_count: 15,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.extractThemes('Random text');

      expect(result.themes).toHaveLength(1);
      expect(result.themes[0]).toBe('General content');
    });
  });

  describe('error handling', () => {
    it('should retry on failure', async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            model: 'qwen2.5-coder:32b-instruct',
            response: 'Success on third try',
            done: true,
          }),
        });

      const result = await service.generateInsights('Test');

      expect(result.text).toBe('Success on third try');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(service.generateInsights('Test')).rejects.toThrow(
        /Network error/
      );
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on cancellation', async () => {
      const controller = new AbortController();
      const abortError = new Error('Request was cancelled');
      abortError.name = 'AbortError';

      (global.fetch as any).mockRejectedValueOnce(abortError);

      await expect(
        service.generateInsights('Test', undefined, {
          signal: controller.signal,
        })
      ).rejects.toThrow(/cancelled/);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('disposal', () => {
    it('should abort pending requests on dispose', async () => {
      const controller = new AbortController();
      const abortSpy = vi.spyOn(controller, 'abort');

      // Start a request (don't await)
      service.generateInsights('Test');

      await service.dispose();

      // Verify cleanup happened
      expect(service['abortControllers'].size).toBe(0);
    });
  });

  describe('metadata', () => {
    it('should have correct provider metadata', () => {
      expect(service.metadata.type).toBe('ollama');
      expect(service.metadata.privacy).toBe('local');
      expect(service.metadata.cost).toBe('free');
      expect(service.metadata.requiresSetup).toBe(true);
      expect(service.metadata.requiresApiKey).toBe(false);
    });
  });
});
