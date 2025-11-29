/**
 * Claude Service Unit Tests
 * Test all 8 premium features and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeService } from '../../../../src/services/ai/ClaudeService';
import type { ClaudeConfig } from '../../../../src/services/ai/types';

// Create a shared mock for messages.create
const mockMessagesCreate = vi.fn();

// Mock Anthropic SDK with a proper class mock
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockMessagesCreate,
      };
      constructor() {}
    },
  };
});

describe('ClaudeService', () => {
  let service: ClaudeService;
  let mockConfig: ClaudeConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      apiKey: 'sk-ant-test-key',
      model: 'claude-sonnet-4-20250514',
      maxRetries: 2,
      retryDelay: 100,
      timeout: 5000,
      rateLimitPerMinute: 10,
    };

    service = new ClaudeService(mockConfig);
  });

  describe('Configuration', () => {
    it('should initialize with provided config', () => {
      const config = service.getConfig();
      expect(config.apiKey).toBe(mockConfig.apiKey);
      expect(config.model).toBe(mockConfig.model);
    });

    it('should validate API key format', () => {
      expect(service.validateApiKey()).toBe(true);

      const invalidService = new ClaudeService({ apiKey: 'invalid-key' });
      expect(invalidService.validateApiKey()).toBe(false);
    });

    it('should update configuration', () => {
      service.updateConfig({ model: 'claude-3-haiku-20240307' });
      const config = service.getConfig();
      expect(config.model).toBe('claude-3-haiku-20240307');
    });

    it('should use default values for missing config', () => {
      const minimalService = new ClaudeService({ apiKey: 'sk-ant-test' });
      const config = minimalService.getConfig();
      expect(config.maxRetries).toBe(3);
      expect(config.rateLimitPerMinute).toBe(50);
    });
  });

  describe('Feature 1: Summarization', () => {
    it('should generate academic summary', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              text: 'This is an academic summary.',
              keyPoints: ['Point 1', 'Point 2'],
              citations: [],
              wordCount: 5,
              confidence: 0.95,
            }),
          },
        ],
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      };

      mockMessagesCreate.mockResolvedValue(mockResponse);

      const result = await service.summarize('Test document', {
        style: 'academic',
        level: 'document',
      });

      expect(result.data.text).toBe('This is an academic summary.');
      expect(result.data.keyPoints).toHaveLength(2);
      expect(result.data.style).toBe('academic');
      expect(result.usage.inputTokens).toBe(100);
    });

    it('should handle brief summary style', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              text: 'Brief summary.',
              keyPoints: ['Main point'],
              wordCount: 2,
              confidence: 0.9,
            }),
          },
        ],
        usage: { input_tokens: 50, output_tokens: 25 },
      };

      mockMessagesCreate.mockResolvedValue(mockResponse);

      const result = await service.summarize('Short text', {
        style: 'brief',
        level: 'paragraph',
      });

      expect(result.data.style).toBe('brief');
      expect(result.data.level).toBe('paragraph');
    });

    it('should include citations when requested', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              text: 'Summary with citations.',
              keyPoints: ['Point 1'],
              citations: [{ text: 'Citation 1', source: 'Document', page: 1 }],
              wordCount: 3,
              confidence: 0.92,
            }),
          },
        ],
        usage: { input_tokens: 100, output_tokens: 60 },
      };

      mockMessagesCreate.mockResolvedValue(mockResponse);

      const result = await service.summarize('Document', {
        style: 'detailed',
        level: 'document',
        includeCitations: true,
      });

      expect(result.data.citations).toBeDefined();
      expect(result.data.citations).toHaveLength(1);
    });
  });

  describe('Feature 2: Q&A System', () => {
    it('should answer questions with evidence', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              answer: 'This is the answer.',
              evidence: [
                {
                  quote: 'Evidence quote',
                  source: 'Document',
                  relevanceScore: 0.95,
                },
              ],
              confidence: 0.9,
              followUpQuestions: ['Follow-up 1', 'Follow-up 2'],
              reasoning: 'Based on the evidence...',
            }),
          },
        ],
        usage: { input_tokens: 200, output_tokens: 100 },
      };

      mockMessagesCreate.mockResolvedValue(mockResponse);

      const result = await service.answerQuestion(
        'What is the main topic?',
        'Context document',
        { includeEvidence: true, maxFollowUps: 2 }
      );

      expect(result.data.answer).toBe('This is the answer.');
      expect(result.data.evidence).toHaveLength(1);
      expect(result.data.followUpQuestions).toHaveLength(2);
      expect(result.data.confidence).toBe(0.9);
    });

    it('should handle questions without evidence', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              answer: 'Simple answer.',
              evidence: [],
              confidence: 0.85,
              followUpQuestions: [],
              reasoning: 'Direct answer.',
            }),
          },
        ],
        usage: { input_tokens: 150, output_tokens: 50 },
      };

      mockMessagesCreate.mockResolvedValue(mockResponse);

      const result = await service.answerQuestion('Simple question?', 'Context', {
        includeEvidence: false,
      });

      expect(result.data.evidence).toHaveLength(0);
    });
  });

  describe('Feature 3: Theme Extraction', () => {
    it('should extract themes with examples', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                name: 'Theme 1',
                description: 'Description of theme 1',
                examples: [
                  {
                    text: 'Example passage',
                    location: 'Page 1',
                    context: 'Context',
                    significance: 'Significant',
                  },
                ],
                prevalence: 0.8,
                relatedThemes: ['Theme 2'],
                interpretation: 'Interpretation of theme',
              },
            ]),
          },
        ],
        usage: { input_tokens: 500, output_tokens: 300 },
      };

      mockMessagesCreate.mockResolvedValue(mockResponse);

      const result = await service.extractThemes('Document text', {
        minThemes: 2,
        maxThemes: 5,
        includeExamples: true,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Theme 1');
      expect(result.data[0].examples).toHaveLength(1);
    });
  });

  describe('Feature 4: Annotation Suggestions', () => {
    it('should suggest annotations with pedagogical value', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                type: 'key-passage',
                passage: 'Important passage',
                location: { page: 1, paragraph: 2, startOffset: 0, endOffset: 50 },
                reasoning: 'This is key because...',
                suggestedNote: 'Note about passage',
                pedagogicalValue: 0.9,
                relatedConcepts: ['Concept 1'],
              },
            ]),
          },
        ],
        usage: { input_tokens: 400, output_tokens: 200 },
      };

      mockMessagesCreate.mockResolvedValue(mockResponse);

      const result = await service.suggestAnnotations('Document', {
        minPedagogicalValue: 0.7,
        maxSuggestions: 5,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('key-passage');
      expect(result.data[0].pedagogicalValue).toBe(0.9);
    });
  });

  describe('Feature 5: Argument Mining', () => {
    it('should extract argument structure', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              mainClaim: {
                type: 'main',
                text: 'Main claim',
                location: 'Page 1',
                evidence: [],
                strength: 0.95,
                relatedClaims: [],
              },
              supportingClaims: [
                {
                  type: 'supporting',
                  text: 'Supporting claim',
                  location: 'Page 2',
                  evidence: [],
                  strength: 0.8,
                  relatedClaims: [],
                },
              ],
              counterClaims: [],
              evidence: [],
              structure: {
                coherence: 0.9,
                completeness: 0.85,
                logicalFlow: 'Well-structured argument',
              },
              argumentMap: {
                nodes: [],
                edges: [],
              },
            }),
          },
        ],
        usage: { input_tokens: 600, output_tokens: 400 },
      };

      mockMessagesCreate.mockResolvedValue(mockResponse);

      const result = await service.mineArguments('Argumentative text', {
        includeCounterArguments: true,
        generateMap: true,
      });

      expect(result.data.mainClaim.text).toBe('Main claim');
      expect(result.data.supportingClaims).toHaveLength(1);
      expect(result.data.structure.coherence).toBe(0.9);
    });
  });

  describe('Feature 6: Question Generation', () => {
    it('should generate pedagogical questions', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify([
              {
                question: 'What is the main argument?',
                type: 'analysis',
                difficulty: 'intermediate',
                focusArea: 'Main argument',
                suggestedAnswer: 'The main argument is...',
                relatedConcepts: ['Argument structure'],
                pedagogicalGoal: 'Develop analytical skills',
              },
            ]),
          },
        ],
        usage: { input_tokens: 300, output_tokens: 150 },
      };

      mockMessagesCreate.mockResolvedValue(mockResponse);

      const result = await service.generateQuestions('Document', {
        count: 5,
        includeAnswers: true,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('analysis');
      expect(result.data[0].suggestedAnswer).toBeDefined();
    });
  });

  describe('Feature 7: Entity Relationships', () => {
    it('should extract entity network', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              entities: [
                {
                  name: 'Entity 1',
                  type: 'character',
                  description: 'Main character',
                  firstMention: 'Page 1',
                  significance: 0.95,
                },
              ],
              relationships: [
                {
                  entity1: 'Entity 1',
                  entity2: 'Entity 2',
                  type: 'ally',
                  description: 'They work together',
                  strength: 0.8,
                  evidence: [],
                },
              ],
              powerDynamics: [],
              socialStructure: {
                centrality: { 'Entity 1': 0.9 },
                clusters: [],
              },
            }),
          },
        ],
        usage: { input_tokens: 500, output_tokens: 300 },
      };

      mockMessagesCreate.mockResolvedValue(mockResponse);

      const result = await service.extractRelationships('Narrative text', {
        includePowerDynamics: true,
        includeNetworkAnalysis: true,
      });

      expect(result.data.entities).toHaveLength(1);
      expect(result.data.relationships).toHaveLength(1);
    });
  });

  describe('Feature 8: Comparative Analysis', () => {
    it('should compare multiple documents', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              documents: [
                {
                  documentId: 'doc1',
                  title: 'Document 1',
                  summary: 'Summary 1',
                  keyThemes: ['Theme 1'],
                },
              ],
              themes: [],
              similarities: [],
              differences: [],
              synthesis: {
                overallAnalysis: 'Overall analysis',
                keyInsights: ['Insight 1'],
                suggestedConnections: [],
                futureDirections: [],
              },
            }),
          },
        ],
        usage: { input_tokens: 800, output_tokens: 500 },
      };

      mockMessagesCreate.mockResolvedValue(mockResponse);

      const result = await service.compareDocuments(
        [
          { id: 'doc1', title: 'Doc 1', text: 'Text 1' },
          { id: 'doc2', title: 'Doc 2', text: 'Text 2' },
        ],
        { includeThemes: true, includeSynthesis: true }
      );

      expect(result.data.documents).toHaveLength(1);
      expect(result.data.synthesis.overallAnalysis).toBe('Overall analysis');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      mockMessagesCreate.mockRejectedValue({
        status: 401,
        message: 'Invalid API key',
      });

      await expect(
        service.summarize('Test', { style: 'brief', level: 'document' })
      ).rejects.toThrow();
    });

    it('should retry on rate limit errors', async () => {
      let attempts = 0;
      mockMessagesCreate.mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject({ status: 429, message: 'Rate limit' });
        }
        return Promise.resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                text: 'Success',
                keyPoints: [],
                wordCount: 1,
                confidence: 0.9,
              }),
            },
          ],
          usage: { input_tokens: 10, output_tokens: 10 },
        });
      });

      const result = await service.summarize('Test', {
        style: 'brief',
        level: 'document',
      });
      expect(attempts).toBe(2);
      expect(result.data.text).toBe('Success');
    });

    it('should handle server errors with retry', async () => {
      let attempts = 0;
      mockMessagesCreate.mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject({ status: 500, message: 'Server error' });
        }
        return Promise.resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                text: 'Recovered',
                keyPoints: [],
                wordCount: 1,
                confidence: 0.9,
              }),
            },
          ],
          usage: { input_tokens: 10, output_tokens: 10 },
        });
      });

      await service.summarize('Test', {
        style: 'brief',
        level: 'document',
      });
      expect(attempts).toBe(2);
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate costs accurately', () => {
      const estimate = service.estimateCost('Test document text', 'summarize');
      expect(estimate.tokens).toBeGreaterThan(0);
      expect(estimate.cost).toBeGreaterThan(0);
    });

    it('should vary estimates by feature', () => {
      const text = 'Sample text for cost estimation';
      const summarizeEstimate = service.estimateCost(text, 'summarize');
      const argumentEstimate = service.estimateCost(text, 'mineArguments');

      expect(argumentEstimate.cost).toBeGreaterThan(summarizeEstimate.cost);
    });
  });
});
