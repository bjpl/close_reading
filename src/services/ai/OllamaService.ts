/**
 * OllamaService - Local LLM Integration
 * Provides privacy-focused AI capabilities using locally-hosted Ollama
 */

import {
  IAIProvider,
  AIProviderMetadata,
  AIRequestOptions,
  AIResponse,
  SummaryResult,
  QuestionAnswerResult,
  ThemeExtractionResult,
} from './types';

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

interface OllamaListResponse {
  models: OllamaModel[];
}

export class OllamaService implements IAIProvider {
  private baseUrl: string;
  private defaultModel: string;
  private timeout: number;
  private retryAttempts: number;
  private retryDelay: number;
  private abortControllers: Map<string, AbortController>;

  public readonly metadata: AIProviderMetadata = {
    name: 'Ollama',
    type: 'ollama',
    cost: 'free',
    speed: 'fast',
    quality: 'high',
    privacy: 'local',
    requiresSetup: true,
    requiresApiKey: false,
  };

  constructor(options?: {
    baseUrl?: string;
    defaultModel?: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
  }) {
    this.baseUrl = options?.baseUrl || 'http://localhost:11434';
    this.defaultModel = options?.defaultModel || 'qwen2.5-coder:32b-instruct';
    this.timeout = options?.timeout || 120000; // 2 minutes
    this.retryAttempts = options?.retryAttempts || 3;
    this.retryDelay = options?.retryDelay || 1000;
    this.abortControllers = new Map();
  }

  /**
   * Check if Ollama is available and running
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      const data = (await response.json()) as OllamaListResponse;

      // Check if our preferred model is available
      const hasModel = data.models.some(m =>
        m.name === this.defaultModel ||
        m.name.startsWith(this.defaultModel.split(':')[0])
      );

      return hasModel;
    } catch (error) {
      // Ollama not running or unreachable
      return false;
    }
  }

  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error(
        `Ollama is not available. Please ensure:\n` +
        `1. Ollama is installed (https://ollama.ai)\n` +
        `2. Ollama is running (run 'ollama serve')\n` +
        `3. Model '${this.defaultModel}' is pulled (run 'ollama pull ${this.defaultModel}')`
      );
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }
      const data = (await response.json()) as OllamaListResponse;
      return data.models;
    } catch (error) {
      throw new Error(`Failed to list Ollama models: ${error}`);
    }
  }

  /**
   * Generate text with retry logic
   */
  private async generateWithRetry(
    request: OllamaGenerateRequest,
    options?: AIRequestOptions,
    attempt: number = 1
  ): Promise<OllamaGenerateResponse> {
    try {
      const controller = options?.signal
        ? new AbortController()
        : new AbortController();

      // Link external signal to our controller
      if (options?.signal) {
        options.signal.addEventListener('abort', () => controller.abort());
      }

      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`);
      }

      const data = (await response.json()) as OllamaGenerateResponse;
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }

      if (attempt < this.retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        return this.generateWithRetry(request, options, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Summarize text
   */
  async summarize(
    text: string,
    options?: AIRequestOptions
  ): Promise<SummaryResult> {

    const prompt = `Analyze the following text and provide:
1. A concise summary (2-3 sentences)
2. 3-5 key points

Text:
${text}

Respond in this exact format:
SUMMARY: [your summary here]
KEY POINTS:
- [point 1]
- [point 2]
- [point 3]`;

    const request: OllamaGenerateRequest = {
      model: this.defaultModel,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 0.9,
        num_predict: options?.maxTokens || 500,
      },
    };

    const response = await this.generateWithRetry(request, options);

    // Parse the response
    const lines = response.response.split('\n').filter(l => l.trim());
    const summaryLine = lines.find(l => l.startsWith('SUMMARY:'));
    const summary = summaryLine
      ? summaryLine.replace('SUMMARY:', '').trim()
      : response.response.substring(0, 200) + '...';

    const keyPointsStart = lines.findIndex(l => l.includes('KEY POINTS'));
    const keyPoints = keyPointsStart >= 0
      ? lines.slice(keyPointsStart + 1)
          .filter(l => l.trim().startsWith('-'))
          .map(l => l.replace(/^-\s*/, '').trim())
      : [];

    return {
      text: summary,
      summary,
      keyPoints: keyPoints.length > 0 ? keyPoints : [summary],
      provider: 'ollama',
    };
  }

  /**
   * Answer a question about text
   */
  async answerQuestion(
    text: string,
    question: string,
    options?: AIRequestOptions
  ): Promise<QuestionAnswerResult> {
    const prompt = `Based on the following text, answer this question: ${question}

Text:
${text}

Provide a clear, accurate answer based only on the information in the text. If the text doesn't contain enough information to answer the question, say so.`;

    const request: OllamaGenerateRequest = {
      model: this.defaultModel,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature || 0.3,
        top_p: options?.topP || 0.9,
        num_predict: options?.maxTokens || 300,
      },
    };

    const response = await this.generateWithRetry(request, options);

    return {
      text: response.response.trim(),
      answer: response.response.trim(),
      confidence: 0.8, // Ollama doesn't provide confidence scores
      provider: 'ollama',
    };
  }

  /**
   * Extract themes from text
   */
  async extractThemes(
    text: string,
    options?: AIRequestOptions
  ): Promise<ThemeExtractionResult> {
    const prompt = `Analyze the following text and identify the main themes. List 3-5 major themes, one per line, starting with a dash (-).

Text:
${text}

Themes:`;

    const request: OllamaGenerateRequest = {
      model: this.defaultModel,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature || 0.5,
        top_p: options?.topP || 0.9,
        num_predict: options?.maxTokens || 200,
      },
    };

    const response = await this.generateWithRetry(request, options);

    // Parse themes from response
    const themeNames = response.response
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(theme => theme.length > 0);

    // Convert to Theme objects
    const themes = (themeNames.length > 0 ? themeNames : ['General content']).map((name) => ({
      name,
      description: `Theme identified from text analysis`,
      examples: [],
      prevalence: 1.0 / (themeNames.length || 1),
      relatedThemes: [],
      interpretation: '',
    }));

    return {
      text: response.response,
      themes,
      provider: 'ollama',
    };
  }

  /**
   * Suggest annotations
   */
  async suggestAnnotations(
    text: string,
    options?: AIRequestOptions
  ): Promise<AIResponse> {

    const prompt = `Analyze this text and suggest important annotations (highlights, key ideas, questions to consider):

${text}

Provide specific suggestions for what should be highlighted and why.`;

    const request: OllamaGenerateRequest = {
      model: this.defaultModel,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature || 0.6,
        top_p: options?.topP || 0.9,
        num_predict: options?.maxTokens || 400,
      },
    };

    const response = await this.generateWithRetry(request, options);

    return {
      text: response.response,
      provider: 'ollama',
      model: this.defaultModel,
      usage: {
        inputTokens: response.prompt_eval_count || 0,
        outputTokens: response.eval_count || 0,
        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
      },
    };
  }

  /**
   * Compare two texts
   */
  async compareTexts(
    text1: string,
    text2: string,
    options?: AIRequestOptions
  ): Promise<AIResponse> {

    const prompt = `Compare these two texts and identify:
1. Similarities
2. Differences
3. Key contrasts

Text 1:
${text1}

Text 2:
${text2}`;

    const request: OllamaGenerateRequest = {
      model: this.defaultModel,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature || 0.5,
        top_p: options?.topP || 0.9,
        num_predict: options?.maxTokens || 500,
      },
    };

    const response = await this.generateWithRetry(request, options);

    return {
      text: response.response,
      provider: 'ollama',
      model: this.defaultModel,
      usage: {
        inputTokens: response.prompt_eval_count || 0,
        outputTokens: response.eval_count || 0,
        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
      },
    };
  }

  /**
   * Generate insights
   */
  async generateInsights(
    text: string,
    context?: string,
    options?: AIRequestOptions
  ): Promise<AIResponse> {

    const prompt = context
      ? `Given this context: ${context}\n\nAnalyze this text and provide insights:\n${text}`
      : `Analyze this text and provide key insights:\n${text}`;

    const request: OllamaGenerateRequest = {
      model: this.defaultModel,
      prompt,
      stream: false,
      options: {
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 0.9,
        num_predict: options?.maxTokens || 400,
      },
    };

    const response = await this.generateWithRetry(request, options);

    return {
      text: response.response,
      provider: 'ollama',
      model: this.defaultModel,
      usage: {
        inputTokens: response.prompt_eval_count || 0,
        outputTokens: response.eval_count || 0,
        totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0),
      },
    };
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    // Abort any pending requests
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }
}
