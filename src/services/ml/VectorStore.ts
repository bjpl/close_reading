/**
 * Vector Store Service
 *
 * Manages storage and retrieval of embedding vectors with efficient
 * similarity search using IndexedDB for persistence.
 *
 * Features:
 * - Persistent storage in IndexedDB
 * - Fast cosine similarity search
 * - LRU cache for hot vectors (500MB limit)
 * - Batch operations for efficiency
 * - <50ms target for similarity search on 1000 vectors
 *
 * @module VectorStore
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

/**
 * Stored vector with metadata
 */
export interface StoredVector {
  id: string;
  documentId: string;
  paragraphId?: string;
  text: string;
  vector: number[];
  metadata: Record<string, unknown>;
  timestamp: number;
}

/**
 * Similarity search result
 */
export interface SimilarityResult {
  id: string;
  documentId: string;
  paragraphId?: string;
  text: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

/**
 * Vector store statistics
 */
export interface VectorStoreStats {
  totalVectors: number;
  cacheSize: number;
  cacheHitRate: number;
  averageSearchTime: number;
  totalSearches: number;
}

/**
 * IndexedDB schema for vector storage
 */
interface VectorStoreDB extends DBSchema {
  vectors: {
    key: string;
    value: StoredVector;
    indexes: {
      'by-document': string;
      'by-timestamp': number;
      'by-paragraph': string;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: unknown;
      timestamp: number;
    };
  };
}

/**
 * Vector Store
 *
 * Efficient storage and similarity search for embedding vectors.
 */
export class VectorStore {
  private db: IDBPDatabase<VectorStoreDB> | null = null;
  private memoryCache: Map<string, StoredVector> = new Map();
  private readonly DB_NAME = 'close-reading-vectors';
  private readonly DB_VERSION = 1;
  private readonly MAX_CACHE_ITEMS = 10000;

  // Performance tracking
  private stats = {
    totalSearches: 0,
    totalSearchTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  /**
   * Initialize the vector store
   */
  async initialize(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<VectorStoreDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          // Create vectors store
          const vectorStore = db.createObjectStore('vectors', {
            keyPath: 'id',
          });

          // Create indexes for efficient querying
          vectorStore.createIndex('by-document', 'documentId');
          vectorStore.createIndex('by-timestamp', 'timestamp');
          vectorStore.createIndex('by-paragraph', 'paragraphId');

          // Create metadata store
          db.createObjectStore('metadata', {
            keyPath: 'key',
          });
        },
      });

      console.log('[VectorStore] IndexedDB initialized');
    } catch (error) {
      console.error('[VectorStore] Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Store a single vector
   *
   * @param vector - Vector to store
   */
  async store(vector: StoredVector): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      // Store in IndexedDB
      await this.db!.put('vectors', vector);

      // Add to memory cache (with size limit)
      this.addToCache(vector);

      console.log(`[VectorStore] Stored vector: ${vector.id}`);
    } catch (error) {
      console.error('[VectorStore] Failed to store vector:', error);
      throw error;
    }
  }

  /**
   * Store multiple vectors in batch
   *
   * @param vectors - Array of vectors to store
   */
  async storeBatch(vectors: StoredVector[]): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const tx = this.db!.transaction('vectors', 'readwrite');
      const store = tx.objectStore('vectors');

      await Promise.all([
        ...vectors.map(vector => store.put(vector)),
        tx.done,
      ]);

      // Add to memory cache
      vectors.forEach(vector => this.addToCache(vector));

      console.log(`[VectorStore] Stored ${vectors.length} vectors in batch`);
    } catch (error) {
      console.error('[VectorStore] Failed to store batch:', error);
      throw error;
    }
  }

  /**
   * Get a vector by ID
   *
   * @param id - Vector ID
   * @returns The stored vector or null if not found
   */
  async get(id: string): Promise<StoredVector | null> {
    if (!this.db) {
      await this.initialize();
    }

    // Check memory cache first
    const cached = this.memoryCache.get(id);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    this.stats.cacheMisses++;

    // Fetch from IndexedDB
    try {
      const vector = await this.db!.get('vectors', id);
      if (vector) {
        this.addToCache(vector);
      }
      return vector || null;
    } catch (error) {
      console.error('[VectorStore] Failed to get vector:', error);
      return null;
    }
  }

  /**
   * Get all vectors for a document
   *
   * @param documentId - Document ID
   * @returns Array of vectors for the document
   */
  async getByDocument(documentId: string): Promise<StoredVector[]> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const vectors = await this.db!.getAllFromIndex('vectors', 'by-document', documentId);
      return vectors;
    } catch (error) {
      console.error('[VectorStore] Failed to get vectors by document:', error);
      return [];
    }
  }

  /**
   * Find similar vectors using cosine similarity
   *
   * @param queryVector - Query vector to compare against
   * @param options - Search options
   * @returns Array of similar vectors ranked by similarity
   */
  async findSimilar(
    queryVector: number[],
    options: {
      threshold?: number;
      topK?: number;
      documentId?: string;
      excludeIds?: string[];
    } = {}
  ): Promise<SimilarityResult[]> {
    if (!this.db) {
      await this.initialize();
    }

    const {
      threshold = 0.3,
      topK = 10,
      documentId,
      excludeIds = [],
    } = options;

    const startTime = performance.now();

    try {
      // Get all vectors (or filter by document)
      let vectors: StoredVector[];
      if (documentId) {
        vectors = await this.getByDocument(documentId);
      } else {
        vectors = await this.db!.getAll('vectors');
      }

      // Calculate similarities
      const results: SimilarityResult[] = [];

      for (const vector of vectors) {
        // Skip excluded vectors
        if (excludeIds.includes(vector.id)) continue;

        const similarity = this.cosineSimilarity(queryVector, vector.vector);

        if (similarity >= threshold) {
          results.push({
            id: vector.id,
            documentId: vector.documentId,
            paragraphId: vector.paragraphId,
            text: vector.text,
            similarity,
            metadata: vector.metadata,
          });
        }
      }

      // Sort by similarity (descending) and take top K
      results.sort((a, b) => b.similarity - a.similarity);
      const topResults = results.slice(0, topK);

      const duration = performance.now() - startTime;
      this.stats.totalSearches++;
      this.stats.totalSearchTime += duration;

      if (duration > 50) {
        console.warn(
          `[VectorStore] Search took ${duration.toFixed(2)}ms on ${vectors.length} vectors (target: <50ms)`
        );
      }

      console.log(
        `[VectorStore] Found ${topResults.length} similar vectors (${duration.toFixed(2)}ms, ` +
        `${(duration / Math.max(1, vectors.length)).toFixed(2)}ms per vector)`
      );

      return topResults;

    } catch (error) {
      console.error('[VectorStore] Similarity search failed:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   *
   * @param a - First vector
   * @param b - Second vector
   * @returns Cosine similarity score (0-1)
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Add vector to memory cache with LRU eviction
   */
  private addToCache(vector: StoredVector): void {
    // Simple size check (approximate)
    if (this.memoryCache.size >= this.MAX_CACHE_ITEMS) {
      // Remove oldest entry (first key)
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(vector.id, vector);
  }

  /**
   * Delete a vector by ID
   *
   * @param id - Vector ID to delete
   */
  async delete(id: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      await this.db!.delete('vectors', id);
      this.memoryCache.delete(id);
      console.log(`[VectorStore] Deleted vector: ${id}`);
    } catch (error) {
      console.error('[VectorStore] Failed to delete vector:', error);
      throw error;
    }
  }

  /**
   * Delete all vectors for a document
   *
   * @param documentId - Document ID
   */
  async deleteByDocument(documentId: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const vectors = await this.getByDocument(documentId);

      const tx = this.db!.transaction('vectors', 'readwrite');
      const store = tx.objectStore('vectors');

      await Promise.all([
        ...vectors.map(vector => {
          this.memoryCache.delete(vector.id);
          return store.delete(vector.id);
        }),
        tx.done,
      ]);

      console.log(`[VectorStore] Deleted ${vectors.length} vectors for document: ${documentId}`);
    } catch (error) {
      console.error('[VectorStore] Failed to delete vectors by document:', error);
      throw error;
    }
  }

  /**
   * Clear all vectors
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      await this.db!.clear('vectors');
      this.memoryCache.clear();
      console.log('[VectorStore] Cleared all vectors');
    } catch (error) {
      console.error('[VectorStore] Failed to clear vectors:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the vector store
   */
  async getStats(): Promise<VectorStoreStats> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const totalVectors = await this.db!.count('vectors');
      const cacheHitRate = (this.stats.cacheHits + this.stats.cacheMisses) > 0
        ? this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)
        : 0;

      const averageSearchTime = this.stats.totalSearches > 0
        ? this.stats.totalSearchTime / this.stats.totalSearches
        : 0;

      return {
        totalVectors,
        cacheSize: this.memoryCache.size,
        cacheHitRate,
        averageSearchTime,
        totalSearches: this.stats.totalSearches,
      };
    } catch (error) {
      console.error('[VectorStore] Failed to get stats:', error);
      return {
        totalVectors: 0,
        cacheSize: this.memoryCache.size,
        cacheHitRate: 0,
        averageSearchTime: 0,
        totalSearches: this.stats.totalSearches,
      };
    }
  }

  /**
   * Get metadata value
   */
  async getMetadata(key: string): Promise<unknown> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const result = await this.db!.get('metadata', key);
      return result?.value ?? null;
    } catch (error) {
      console.error('[VectorStore] Failed to get metadata:', error);
      return null;
    }
  }

  /**
   * Set metadata value
   */
  async setMetadata(key: string, value: unknown): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      await this.db!.put('metadata', {
        key,
        value,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[VectorStore] Failed to set metadata:', error);
      throw error;
    }
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.memoryCache.clear();
  }
}

// Singleton instance
let vectorStore: VectorStore | null = null;

/**
 * Get the singleton vector store instance
 */
export function getVectorStore(): VectorStore {
  if (!vectorStore) {
    vectorStore = new VectorStore();
  }
  return vectorStore;
}
