/**
 * Adapter that makes Ruvector VectorService compatible with existing similarity.ts usage
 * Allows gradual migration without breaking existing code
 */

import { VectorService } from '../core/VectorService';
import type { VectorSearchResult } from '../types';

/**
 * Configuration for similarity operations
 */
export interface SimilarityConfig {
  threshold?: number;
  topK?: number;
  includeMetadata?: boolean;
}

/**
 * Represents a similar paragraph result
 */
export interface SimilarParagraph {
  id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, any>;
}

/**
 * Represents similarity between two items
 */
export interface SimilarityPair {
  id1: string;
  id2: string;
  similarity: number;
}

/**
 * Represents a cluster of similar items
 */
export interface SimilarityCluster {
  id: string;
  items: string[];
  centroid?: number[];
  avgSimilarity: number;
}

/**
 * Adapter that wraps VectorService to match similarity.ts API
 */
export class SimilarityAdapter {
  constructor(private vectorService: VectorService) {}

  /**
   * Find paragraphs similar to a query paragraph
   */
  async findSimilarParagraphs(
    queryParagraphId: string,
    documentId: string,
    config: SimilarityConfig = {}
  ): Promise<SimilarParagraph[]> {
    const {
      threshold = 0.7,
      topK = 10,
      includeMetadata = true
    } = config;

    // Search for similar paragraphs
    const results = await this.vectorService.search({
      id: queryParagraphId,
      documentId,
      topK,
      threshold,
      includeMetadata
    });

    // Convert to SimilarParagraph format
    return results.map(this.convertToSimilarParagraph);
  }

  /**
   * Calculate pairwise similarities between all paragraphs in a document
   */
  async calculateSimilarities(
    documentId: string,
    config: SimilarityConfig = {}
  ): Promise<SimilarityPair[]> {
    const { threshold = 0.5 } = config;

    // Get all paragraph IDs for the document
    const paragraphIds = await this.getParagraphIds(documentId);
    const similarities: SimilarityPair[] = [];

    // Calculate pairwise similarities
    for (let i = 0; i < paragraphIds.length; i++) {
      const results = await this.vectorService.search({
        id: paragraphIds[i],
        documentId,
        topK: paragraphIds.length,
        threshold,
        includeMetadata: false
      });

      // Add pairs where j > i to avoid duplicates
      for (const result of results) {
        const j = paragraphIds.indexOf(result.id);
        if (j > i) {
          similarities.push({
            id1: paragraphIds[i],
            id2: result.id,
            similarity: result.score
          });
        }
      }
    }

    return similarities;
  }

  /**
   * Cluster paragraphs by similarity
   */
  async clusterBySimilarity(
    documentId: string,
    config: SimilarityConfig & { minClusterSize?: number; maxClusters?: number } = {}
  ): Promise<SimilarityCluster[]> {
    const {
      threshold = 0.7,
      minClusterSize = 2,
      maxClusters = 10
    } = config;

    // Get all paragraph IDs and their vectors
    const paragraphIds = await this.getParagraphIds(documentId);
    const vectors = await this.getParagraphVectors(documentId, paragraphIds);

    // Simple clustering algorithm based on similarity threshold
    const clusters: SimilarityCluster[] = [];
    const assigned = new Set<string>();

    for (const paragraphId of paragraphIds) {
      if (assigned.has(paragraphId)) continue;

      // Find all similar paragraphs
      const results = await this.vectorService.search({
        id: paragraphId,
        documentId,
        topK: paragraphIds.length,
        threshold,
        includeMetadata: false
      });

      const clusterItems = [paragraphId];
      let totalSimilarity = 0;

      for (const result of results) {
        if (!assigned.has(result.id) && result.id !== paragraphId) {
          clusterItems.push(result.id);
          totalSimilarity += result.score;
        }
      }

      // Only create cluster if it meets minimum size
      if (clusterItems.length >= minClusterSize) {
        const cluster: SimilarityCluster = {
          id: `cluster-${clusters.length}`,
          items: clusterItems,
          avgSimilarity: totalSimilarity / (clusterItems.length - 1)
        };

        // Calculate centroid if vectors are available
        if (vectors.length > 0) {
          cluster.centroid = this.calculateCentroid(
            clusterItems.map(id => vectors.find(v => v.id === id)?.vector).filter(Boolean) as number[][]
          );
        }

        clusters.push(cluster);
        clusterItems.forEach(id => assigned.add(id));

        // Stop if we've reached max clusters
        if (clusters.length >= maxClusters) break;
      }
    }

    return clusters;
  }

  /**
   * Get similarity score between two specific paragraphs
   */
  async getSimilarity(
    paragraphId1: string,
    paragraphId2: string,
    documentId: string
  ): Promise<number> {
    const results = await this.vectorService.search({
      id: paragraphId1,
      documentId,
      topK: 100,
      threshold: 0,
      includeMetadata: false
    });

    const match = results.find(r => r.id === paragraphId2);
    return match?.score ?? 0;
  }

  /**
   * Batch find similar paragraphs for multiple queries
   */
  async batchFindSimilar(
    queryParagraphIds: string[],
    documentId: string,
    config: SimilarityConfig = {}
  ): Promise<Map<string, SimilarParagraph[]>> {
    const results = new Map<string, SimilarParagraph[]>();

    // Process in parallel
    await Promise.all(
      queryParagraphIds.map(async (id) => {
        const similar = await this.findSimilarParagraphs(id, documentId, config);
        results.set(id, similar);
      })
    );

    return results;
  }

  /**
   * Convert VectorSearchResult to SimilarParagraph format
   */
  private convertToSimilarParagraph(result: VectorSearchResult): SimilarParagraph {
    return {
      id: result.id,
      content: result.metadata?.content as string || '',
      similarity: result.score,
      metadata: result.metadata
    };
  }

  /**
   * Get all paragraph IDs for a document
   */
  private async getParagraphIds(documentId: string): Promise<string[]> {
    // Use vector service to get all paragraphs
    // This is a placeholder - actual implementation depends on vector store
    const results = await this.vectorService.search({
      id: 'dummy', // Will be replaced with actual query
      documentId,
      topK: 1000,
      threshold: 0,
      includeMetadata: false
    });

    return results.map(r => r.id);
  }

  /**
   * Get vectors for specific paragraphs
   */
  private async getParagraphVectors(
    documentId: string,
    paragraphIds: string[]
  ): Promise<Array<{ id: string; vector: number[] }>> {
    // This would need to be implemented based on vector store capabilities
    // For now, return empty array as vectors might not be directly accessible
    return [];
  }

  /**
   * Calculate centroid of a set of vectors
   */
  private calculateCentroid(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];

    const dimensions = vectors[0].length;
    const centroid = new Array(dimensions).fill(0);

    for (const vector of vectors) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += vector[i];
      }
    }

    return centroid.map(val => val / vectors.length);
  }
}
