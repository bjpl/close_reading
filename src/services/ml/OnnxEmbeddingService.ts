/**
 * ONNX Embedding Service
 *
 * High-performance semantic embeddings using ONNX Runtime Web
 * with all-MiniLM-L6-v2 model (384-dimensional embeddings)
 *
 * Features:
 * - WASM backend for optimal performance
 * - Lazy model loading (on first use)
 * - Batch processing support
 * - Multi-layer caching
 * - <100ms target per embedding
 *
 * @module OnnxEmbeddingService
 */

import * as ort from 'onnxruntime-web';
import { EmbeddingCache } from './cache';
import logger from '../../lib/logger';

/**
 * Configuration for ONNX embedding service
 */
export interface OnnxEmbeddingConfig {
  modelPath: string;
  maxSequenceLength: number;
  batchSize: number;
  cacheEnabled: boolean;
}

/**
 * Embedding vector with metadata
 */
export interface EmbeddingVector {
  text: string;
  vector: number[];
  modelVersion: string;
  timestamp: number;
}

/**
 * Batch embedding result with statistics
 */
export interface BatchEmbeddingResult {
  embeddings: EmbeddingVector[];
  cached: number;
  computed: number;
  duration: number;
  cacheHitRate: number;
}

/**
 * Tokenizer for text preprocessing
 */
class SimpleTokenizer {
  private vocab: Map<string, number> = new Map();
  private readonly PAD_TOKEN = '[PAD]';
  private readonly CLS_TOKEN = '[CLS]';
  private readonly SEP_TOKEN = '[SEP]';
  private readonly UNK_TOKEN = '[UNK]';

  constructor() {
    // Basic vocabulary - in production, load from vocab.json
    this.vocab.set(this.PAD_TOKEN, 0);
    this.vocab.set(this.UNK_TOKEN, 100);
    this.vocab.set(this.CLS_TOKEN, 101);
    this.vocab.set(this.SEP_TOKEN, 102);
  }

  /**
   * Tokenize and encode text to input IDs
   */
  encode(text: string, maxLength: number): { inputIds: number[]; attentionMask: number[] } {
    // Simple word-based tokenization (replace with proper WordPiece tokenizer)
    const words = text.toLowerCase().split(/\s+/).slice(0, maxLength - 2);

    const inputIds: number[] = [101]; // CLS token
    const attentionMask: number[] = [1];

    for (const word of words) {
      const tokenId = this.vocab.get(word) ?? 100; // UNK token
      inputIds.push(tokenId);
      attentionMask.push(1);
    }

    inputIds.push(102); // SEP token
    attentionMask.push(1);

    // Pad to maxLength
    while (inputIds.length < maxLength) {
      inputIds.push(0); // PAD token
      attentionMask.push(0);
    }

    return {
      inputIds: inputIds.slice(0, maxLength),
      attentionMask: attentionMask.slice(0, maxLength),
    };
  }
}

/**
 * ONNX Embedding Service
 *
 * Provides high-performance semantic embeddings using ONNX Runtime Web.
 * Uses all-MiniLM-L6-v2 model for 384-dimensional sentence embeddings.
 */
export class OnnxEmbeddingService {
  private session: ort.InferenceSession | null = null;
  private tokenizer: SimpleTokenizer;
  private cache: EmbeddingCache;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  private readonly config: OnnxEmbeddingConfig = {
    modelPath: '/models/all-MiniLM-L6-v2.onnx',
    maxSequenceLength: 128,
    batchSize: 32,
    cacheEnabled: true,
  };

  private readonly MODEL_VERSION = 'onnx-minilm-l6-v2';

  // Performance tracking
  private stats = {
    totalInferences: 0,
    totalDuration: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(config?: Partial<OnnxEmbeddingConfig>) {
    this.config = { ...this.config, ...config };
    this.tokenizer = new SimpleTokenizer();
    this.cache = new EmbeddingCache();

    // Configure ONNX Runtime
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;
  }

  /**
   * Initialize the ONNX model and cache
   * Lazy loading - only initializes on first use
   */
  async initialize(): Promise<void> {
    if (this.session) return;

    if (this.isInitializing) {
      if (this.initPromise) {
        return this.initPromise;
      }
      throw new Error('Initialization already in progress');
    }

    this.isInitializing = true;

    this.initPromise = (async () => {
      try {
        logger.info('[ONNX] Initializing embedding service...');
        logger.debug({ modelPath: this.config.modelPath }, '[ONNX] Model path');

        // Initialize cache
        await this.cache.initialize();
        logger.info('[ONNX] Cache initialized');

        // Load ONNX model with WASM backend
        const startTime = performance.now();

        this.session = await ort.InferenceSession.create(this.config.modelPath, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });

        const duration = performance.now() - startTime;
        logger.info(`[ONNX] Model loaded successfully in ${duration.toFixed(2)}ms`);
        logger.debug({ inputNames: this.session.inputNames }, '[ONNX] Input names');
        logger.debug({ outputNames: this.session.outputNames }, '[ONNX] Output names');

      } catch (error) {
        logger.error({ error }, '[ONNX] Initialization failed');
        this.isInitializing = false;
        this.initPromise = null;
        throw new Error(`Failed to load ONNX model: ${error instanceof Error ? error.message : String(error)}`);
      }

      this.isInitializing = false;
    })();

    return this.initPromise;
  }

  /**
   * Generate embedding for a single text
   *
   * @param text - Input text to embed
   * @returns Embedding vector with metadata
   * @throws Error if model is not initialized or inference fails
   */
  async embed(text: string): Promise<EmbeddingVector> {
    if (!this.session) {
      await this.initialize();
    }

    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = await this.cache.get(text, this.MODEL_VERSION);
      if (cached) {
        this.stats.cacheHits++;
        return cached;
      }
      this.stats.cacheMisses++;
    }

    // Generate new embedding
    const startTime = performance.now();

    try {
      // Tokenize input
      const { inputIds, attentionMask } = this.tokenizer.encode(
        text,
        this.config.maxSequenceLength
      );

      // Create input tensors
      const inputIdsTensor = new ort.Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), [1, inputIds.length]);
      const attentionMaskTensor = new ort.Tensor('int64', BigInt64Array.from(attentionMask.map(BigInt)), [1, attentionMask.length]);

      // Run inference
      const feeds = {
        input_ids: inputIdsTensor,
        attention_mask: attentionMaskTensor,
      };

      const results = await this.session!.run(feeds);

      // Extract embedding from output
      const output = results[this.session!.outputNames[0]];
      const vector = this.meanPooling(
        Array.from(output.data as Float32Array),
        attentionMask,
        this.config.maxSequenceLength
      );

      // Normalize vector
      const normalizedVector = this.normalize(vector);

      const duration = performance.now() - startTime;
      this.stats.totalInferences++;
      this.stats.totalDuration += duration;

      if (duration > 100) {
        logger.warn(`[ONNX] Embedding took ${duration.toFixed(2)}ms (target: <100ms)`);
      }

      const result: EmbeddingVector = {
        text,
        vector: normalizedVector,
        modelVersion: this.MODEL_VERSION,
        timestamp: Date.now(),
      };

      // Cache the result
      if (this.config.cacheEnabled) {
        await this.cache.set(text, result);
      }

      return result;

    } catch (error) {
      logger.error({ error }, '[ONNX] Embedding generation failed');
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * More efficient than individual calls
   *
   * @param texts - Array of input texts
   * @returns Batch result with embeddings and statistics
   */
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (!this.session) {
      await this.initialize();
    }

    const startTime = performance.now();
    const results: EmbeddingVector[] = new Array(texts.length);
    let cached = 0;
    let computed = 0;

    // Check cache for all texts
    if (this.config.cacheEnabled) {
      const cachePromises = texts.map(text =>
        this.cache.get(text, this.MODEL_VERSION)
      );
      const cachedResults = await Promise.all(cachePromises);

      cachedResults.forEach((result, index) => {
        if (result) {
          results[index] = result;
          cached++;
          this.stats.cacheHits++;
        }
      });
    }

    // Collect uncached texts
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    texts.forEach((text, index) => {
      if (!results[index]) {
        uncachedTexts.push(text);
        uncachedIndices.push(index);
      }
    });

    // Process uncached texts in batches
    if (uncachedTexts.length > 0) {
      this.stats.cacheMisses += uncachedTexts.length;

      for (let i = 0; i < uncachedTexts.length; i += this.config.batchSize) {
        const batch = uncachedTexts.slice(i, i + this.config.batchSize);
        const batchIndices = uncachedIndices.slice(i, i + this.config.batchSize);

        // Process each text in the batch (ONNX model expects batch dim = 1)
        const batchPromises = batch.map(text => this.embed(text));
        const batchResults = await Promise.all(batchPromises);

        batchResults.forEach((result, batchIdx) => {
          const originalIdx = batchIndices[batchIdx];
          results[originalIdx] = result;
          computed++;
        });
      }
    }

    const duration = performance.now() - startTime;
    const cacheHitRate = texts.length > 0 ? cached / texts.length : 0;

    logger.info(
      `[ONNX] Batch complete: ${texts.length} texts, ${cached} cached (${(cacheHitRate * 100).toFixed(1)}%), ` +
      `${computed} computed in ${duration.toFixed(2)}ms (${(duration / texts.length).toFixed(2)}ms per text)`
    );

    return {
      embeddings: results,
      cached,
      computed,
      duration,
      cacheHitRate,
    };
  }

  /**
   * Mean pooling with attention mask
   */
  private meanPooling(embeddings: number[], attentionMask: number[], seqLength: number): number[] {
    const hiddenSize = embeddings.length / seqLength;
    const pooled = new Array(hiddenSize).fill(0);
    let maskSum = 0;

    for (let i = 0; i < seqLength; i++) {
      if (attentionMask[i] === 1) {
        for (let j = 0; j < hiddenSize; j++) {
          pooled[j] += embeddings[i * hiddenSize + j];
        }
        maskSum++;
      }
    }

    if (maskSum > 0) {
      for (let j = 0; j < hiddenSize; j++) {
        pooled[j] /= maskSum;
      }
    }

    return pooled;
  }

  /**
   * Normalize vector to unit length (L2 normalization)
   */
  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map(val => val / magnitude);
  }

  /**
   * Get embedding dimensions
   */
  getDimensions(): number {
    return 384; // all-MiniLM-L6-v2 produces 384-dimensional embeddings
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.session !== null;
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const avgDuration = this.stats.totalInferences > 0
      ? this.stats.totalDuration / this.stats.totalInferences
      : 0;

    const cacheHitRate = (this.stats.cacheHits + this.stats.cacheMisses) > 0
      ? this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)
      : 0;

    return {
      totalInferences: this.stats.totalInferences,
      averageDuration: avgDuration,
      cacheHitRate,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
    };
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear all cached embeddings
   */
  async clearCache(): Promise<void> {
    await this.cache.clear();
    this.stats.cacheHits = 0;
    this.stats.cacheMisses = 0;
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
  }
}

// Singleton instance
let onnxEmbeddingService: OnnxEmbeddingService | null = null;

/**
 * Get the singleton ONNX embedding service instance
 */
export function getOnnxEmbeddingService(): OnnxEmbeddingService {
  if (!onnxEmbeddingService) {
    onnxEmbeddingService = new OnnxEmbeddingService();
  }
  return onnxEmbeddingService;
}
