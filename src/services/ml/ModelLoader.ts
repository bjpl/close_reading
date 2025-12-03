/**
 * Model Loader Service
 *
 * Lazy loads ML models on demand to reduce initial bundle size.
 * Implements dynamic model loading, caching, and error handling.
 *
 * Features:
 * - Lazy loading of ONNX models (only when ML features are used)
 * - External model hosting (CDN or local public folder)
 * - Progress tracking for large models
 * - Automatic retry with exponential backoff
 * - Model version management
 *
 * @module ModelLoader
 */

import * as ort from 'onnxruntime-web';
import logger from '../../lib/logger';

/**
 * Model configuration
 */
export interface ModelConfig {
  name: string;
  version: string;
  url: string;
  size: number; // Size in bytes
  checksum?: string; // Optional SHA-256 checksum for verification
}

/**
 * Model loading progress
 */
export interface LoadingProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Model loading status
 */
export type ModelStatus = 'unloaded' | 'loading' | 'loaded' | 'error';

/**
 * Model Loader Service
 *
 * Handles dynamic loading of ML models with caching and error handling.
 * Models are externalized to reduce bundle size and loaded on-demand.
 */
export class ModelLoader {
  private models: Map<string, ort.InferenceSession> = new Map();
  private loadingPromises: Map<string, Promise<ort.InferenceSession>> = new Map();
  private status: Map<string, ModelStatus> = new Map();
  private retryCount: Map<string, number> = new Map();

  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 second base delay

  /**
   * Default model configurations
   * Models should be hosted in /public/models/ or on a CDN
   */
  private readonly MODEL_CONFIGS: Record<string, ModelConfig> = {
    'all-MiniLM-L6-v2': {
      name: 'all-MiniLM-L6-v2',
      version: '1.0.0',
      url: '/models/all-MiniLM-L6-v2.onnx',
      size: 87 * 1024 * 1024, // 87MB
    },
  };

  /**
   * Load a model by name
   *
   * @param modelName - Name of the model to load
   * @param onProgress - Optional callback for loading progress
   * @returns InferenceSession for the loaded model
   * @throws Error if model loading fails after retries
   */
  async loadModel(
    modelName: string,
    onProgress?: (progress: LoadingProgress) => void
  ): Promise<ort.InferenceSession> {
    // Return cached model if already loaded
    const cached = this.models.get(modelName);
    if (cached) {
      logger.info(`[ModelLoader] Using cached model: ${modelName}`);
      return cached;
    }

    // Return in-progress loading promise if model is being loaded
    const loadingPromise = this.loadingPromises.get(modelName);
    if (loadingPromise) {
      logger.info(`[ModelLoader] Waiting for in-progress load: ${modelName}`);
      return loadingPromise;
    }

    // Get model configuration
    const config = this.MODEL_CONFIGS[modelName];
    if (!config) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    // Start new loading process
    this.status.set(modelName, 'loading');
    const promise = this.loadModelWithRetry(config, onProgress);
    this.loadingPromises.set(modelName, promise);

    try {
      const session = await promise;
      this.models.set(modelName, session);
      this.status.set(modelName, 'loaded');
      this.loadingPromises.delete(modelName);
      this.retryCount.delete(modelName);

      logger.info(`[ModelLoader] Successfully loaded model: ${modelName}`);
      return session;
    } catch (error) {
      this.status.set(modelName, 'error');
      this.loadingPromises.delete(modelName);
      logger.error({ error, modelName }, '[ModelLoader] Failed to load model');
      throw error;
    }
  }

  /**
   * Load model with retry logic
   */
  private async loadModelWithRetry(
    config: ModelConfig,
    onProgress?: (progress: LoadingProgress) => void
  ): Promise<ort.InferenceSession> {
    const currentRetry = this.retryCount.get(config.name) || 0;

    try {
      logger.info(`[ModelLoader] Loading ${config.name} from ${config.url} (attempt ${currentRetry + 1}/${this.MAX_RETRIES + 1})`);

      // Fetch model with progress tracking
      const response = await fetch(config.url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get content length for progress tracking
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      const total = contentLength || config.size;

      // Read response body with progress tracking
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const chunks: Uint8Array[] = [];
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        loaded += value.length;

        // Report progress
        if (onProgress) {
          onProgress({
            loaded,
            total,
            percentage: (loaded / total) * 100,
          });
        }
      }

      // Combine chunks into single buffer
      const modelData = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) {
        modelData.set(chunk, offset);
        offset += chunk.length;
      }

      // Verify checksum if provided
      if (config.checksum) {
        const checksum = await this.calculateChecksum(modelData);
        if (checksum !== config.checksum) {
          throw new Error(`Checksum verification failed for ${config.name}`);
        }
      }

      // Create ONNX session
      logger.info(`[ModelLoader] Creating ONNX session for ${config.name}`);
      const session = await ort.InferenceSession.create(modelData, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });

      logger.info(`[ModelLoader] Model ${config.name} loaded successfully (${(loaded / 1024 / 1024).toFixed(2)} MB)`);
      return session;

    } catch (error) {
      logger.error({ error, config, attempt: currentRetry + 1 }, '[ModelLoader] Load attempt failed');

      // Retry with exponential backoff
      if (currentRetry < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY_BASE * Math.pow(2, currentRetry);
        logger.info(`[ModelLoader] Retrying in ${delay}ms...`);

        this.retryCount.set(config.name, currentRetry + 1);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.loadModelWithRetry(config, onProgress);
      }

      throw new Error(
        `Failed to load model ${config.name} after ${this.MAX_RETRIES + 1} attempts: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Calculate SHA-256 checksum of model data
   */
  private async calculateChecksum(data: Uint8Array): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get model loading status
   */
  getStatus(modelName: string): ModelStatus {
    return this.status.get(modelName) || 'unloaded';
  }

  /**
   * Check if model is loaded
   */
  isLoaded(modelName: string): boolean {
    return this.models.has(modelName);
  }

  /**
   * Unload a model to free memory
   */
  async unloadModel(modelName: string): Promise<void> {
    const session = this.models.get(modelName);
    if (session) {
      await session.release();
      this.models.delete(modelName);
      this.status.set(modelName, 'unloaded');
      logger.info(`[ModelLoader] Unloaded model: ${modelName}`);
    }
  }

  /**
   * Unload all models
   */
  async unloadAll(): Promise<void> {
    const promises = Array.from(this.models.keys()).map(name => this.unloadModel(name));
    await Promise.all(promises);
    logger.info('[ModelLoader] All models unloaded');
  }

  /**
   * Get list of available models
   */
  getAvailableModels(): string[] {
    return Object.keys(this.MODEL_CONFIGS);
  }

  /**
   * Get model configuration
   */
  getModelConfig(modelName: string): ModelConfig | undefined {
    return this.MODEL_CONFIGS[modelName];
  }

  /**
   * Add custom model configuration
   */
  registerModel(config: ModelConfig): void {
    this.MODEL_CONFIGS[config.name] = config;
    logger.info(`[ModelLoader] Registered custom model: ${config.name}`);
  }
}

// Singleton instance
let modelLoader: ModelLoader | null = null;

/**
 * Get the singleton ModelLoader instance
 */
export function getModelLoader(): ModelLoader {
  if (!modelLoader) {
    modelLoader = new ModelLoader();
  }
  return modelLoader;
}
