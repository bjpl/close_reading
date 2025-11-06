/**
 * ML Embeddings Service
 *
 * Generates sentence embeddings for paragraph similarity using:
 * - TensorFlow.js Universal Sentence Encoder (temporary)
 * - Future: ruv-FANN WASM modules for optimal performance
 *
 * Features:
 * - WASM module initialization
 * - Batch processing support
 * - Multi-layer caching (Memory → IndexedDB → Supabase)
 */

import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { EmbeddingCache } from './cache';

export interface EmbeddingVector {
  text: string;
  vector: number[];
  modelVersion: string;
  timestamp: number;
}

export interface BatchEmbeddingResult {
  embeddings: EmbeddingVector[];
  cached: number;
  computed: number;
  duration: number;
}

/**
 * ML Embedding Service
 * Handles embedding generation with automatic caching
 */
export class EmbeddingService {
  private model: use.UniversalSentenceEncoder | null = null;
  private cache: EmbeddingCache;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private readonly MODEL_VERSION = 'tfjs-use-v1'; // Will change to 'ruv-fann-v1' when available

  constructor() {
    this.cache = new EmbeddingCache();
  }

  /**
   * Initialize the embedding model
   * Uses TensorFlow.js Universal Sentence Encoder as placeholder
   * TODO: Replace with ruv-FANN WASM when available
   */
  async initialize(): Promise<void> {
    if (this.model) return;

    if (this.isInitializing) {
      if (this.initPromise) {
        return this.initPromise;
      }
      throw new Error('Initialization already in progress');
    }

    this.isInitializing = true;

    this.initPromise = (async () => {
      try {
        console.log('[Embeddings] Initializing TensorFlow.js Universal Sentence Encoder...');

        // Set TensorFlow.js backend
        await tf.ready();
        console.log('[Embeddings] TensorFlow.js backend:', tf.getBackend());

        // Load Universal Sentence Encoder
        this.model = await use.load();
        console.log('[Embeddings] Model loaded successfully');

        // Initialize cache
        await this.cache.initialize();
        console.log('[Embeddings] Cache initialized');

      } catch (error) {
        console.error('[Embeddings] Initialization failed:', error);
        this.isInitializing = false;
        this.initPromise = null;
        throw error;
      }

      this.isInitializing = false;
    })();

    return this.initPromise;
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<EmbeddingVector> {
    if (!this.model) {
      await this.initialize();
    }

    // Check cache first
    const cached = await this.cache.get(text, this.MODEL_VERSION);
    if (cached) {
      return cached;
    }

    // Generate new embedding
    const startTime = performance.now();

    try {
      const embeddings = await this.model!.embed([text]);
      const vector = Array.from(await embeddings.data());
      embeddings.dispose(); // Clean up tensors

      const duration = performance.now() - startTime;
      console.log(`[Embeddings] Generated embedding in ${duration.toFixed(2)}ms`);

      const result: EmbeddingVector = {
        text,
        vector,
        modelVersion: this.MODEL_VERSION,
        timestamp: Date.now(),
      };

      // Cache the result
      await this.cache.set(text, result);

      return result;
    } catch (error) {
      console.error('[Embeddings] Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * More efficient than individual calls
   */
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (!this.model) {
      await this.initialize();
    }

    const startTime = performance.now();
    const results: EmbeddingVector[] = [];
    let cached = 0;
    let computed = 0;

    // Check cache for all texts
    const cachePromises = texts.map(text =>
      this.cache.get(text, this.MODEL_VERSION)
    );
    const cachedResults = await Promise.all(cachePromises);

    // Separate cached and uncached texts
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    texts.forEach((text, index) => {
      if (cachedResults[index]) {
        results[index] = cachedResults[index]!;
        cached++;
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(index);
      }
    });

    // Generate embeddings for uncached texts in batch
    if (uncachedTexts.length > 0) {
      try {
        const embeddings = await this.model!.embed(uncachedTexts);
        const vectors = await embeddings.array();
        embeddings.dispose(); // Clean up tensors

        // Process results
        const cachePromises: Promise<void>[] = [];

        uncachedTexts.forEach((text, batchIndex) => {
          const resultIndex = uncachedIndices[batchIndex];
          const vector = vectors[batchIndex];

          const result: EmbeddingVector = {
            text,
            vector,
            modelVersion: this.MODEL_VERSION,
            timestamp: Date.now(),
          };

          results[resultIndex] = result;
          computed++;

          // Cache asynchronously
          cachePromises.push(this.cache.set(text, result));
        });

        // Wait for all cache operations
        await Promise.all(cachePromises);

      } catch (error) {
        console.error('[Embeddings] Batch generation failed:', error);
        throw error;
      }
    }

    const duration = performance.now() - startTime;

    console.log(
      `[Embeddings] Batch complete: ${cached} cached, ${computed} computed in ${duration.toFixed(2)}ms`
    );

    return {
      embeddings: results,
      cached,
      computed,
      duration,
    };
  }

  /**
   * Clear all cached embeddings
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.model !== null;
  }

  /**
   * Dispose of the model and free resources
   */
  dispose(): void {
    if (this.model) {
      // TensorFlow models don't need explicit disposal
      this.model = null;
    }
  }
}

// Singleton instance
let embeddingService: EmbeddingService | null = null;

/**
 * Get the singleton embedding service instance
 */
export function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) {
    embeddingService = new EmbeddingService();
  }
  return embeddingService;
}
