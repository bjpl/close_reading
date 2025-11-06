/**
 * Similarity Service
 *
 * Calculates semantic similarity between text embeddings using:
 * - Cosine similarity for vector comparison
 * - Paragraph ranking by relevance
 * - Configurable similarity thresholds
 */

import { EmbeddingVector } from './embeddings';

export interface SimilarityResult {
  paragraphId: string;
  text: string;
  score: number;
  rank: number;
}

export interface SimilarityOptions {
  minScore?: number;
  maxResults?: number;
  excludeIds?: Set<string>;
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where:
 * - 1 = identical vectors
 * - 0 = orthogonal vectors
 * - -1 = opposite vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Calculate similarity between a query embedding and multiple target embeddings
 */
export function calculateSimilarities(
  queryVector: number[],
  targets: Array<{ id: string; text: string; vector: number[] }>
): SimilarityResult[] {
  const results: SimilarityResult[] = [];

  for (const target of targets) {
    const score = cosineSimilarity(queryVector, target.vector);

    results.push({
      paragraphId: target.id,
      text: target.text,
      score,
      rank: 0, // Will be set after sorting
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Assign ranks
  results.forEach((result, index) => {
    result.rank = index + 1;
  });

  return results;
}

/**
 * Find similar paragraphs based on embedding similarity
 */
export function findSimilarParagraphs(
  queryEmbedding: EmbeddingVector,
  candidateEmbeddings: Map<string, EmbeddingVector>,
  options: SimilarityOptions = {}
): SimilarityResult[] {
  const {
    minScore = 0.5,
    maxResults = 10,
    excludeIds = new Set<string>(),
  } = options;

  // Prepare target vectors
  const targets = Array.from(candidateEmbeddings.entries())
    .filter(([id]) => !excludeIds.has(id))
    .map(([id, embedding]) => ({
      id,
      text: embedding.text,
      vector: embedding.vector,
    }));

  // Calculate similarities
  const results = calculateSimilarities(queryEmbedding.vector, targets);

  // Filter by minimum score and limit results
  return results
    .filter(result => result.score >= minScore)
    .slice(0, maxResults);
}

/**
 * Calculate pairwise similarity matrix for a set of embeddings
 * Useful for clustering and visualization
 */
export function calculateSimilarityMatrix(
  embeddings: EmbeddingVector[]
): number[][] {
  const n = embeddings.length;
  const matrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1.0; // Self-similarity is always 1
      } else {
        const similarity = cosineSimilarity(
          embeddings[i].vector,
          embeddings[j].vector
        );
        matrix[i][j] = similarity;
        matrix[j][i] = similarity; // Symmetric
      }
    }
  }

  return matrix;
}

/**
 * Find clusters of similar paragraphs using simple threshold-based clustering
 */
export interface Cluster {
  id: number;
  members: string[];
  centroid: number[];
  avgSimilarity: number;
}

export function clusterBySimilarity(
  embeddings: Map<string, EmbeddingVector>,
  threshold: number = 0.7
): Cluster[] {
  const clusters: Cluster[] = [];
  const assigned = new Set<string>();
  const embeddingArray = Array.from(embeddings.entries());

  for (let i = 0; i < embeddingArray.length; i++) {
    const [id, embedding] = embeddingArray[i];

    if (assigned.has(id)) continue;

    // Start new cluster
    const members: string[] = [id];
    const vectors: number[][] = [embedding.vector];
    assigned.add(id);

    // Find similar unassigned embeddings
    for (let j = i + 1; j < embeddingArray.length; j++) {
      const [candidateId, candidateEmbedding] = embeddingArray[j];

      if (assigned.has(candidateId)) continue;

      // Check similarity to cluster centroid
      const centroid = calculateCentroid(vectors);
      const similarity = cosineSimilarity(candidateEmbedding.vector, centroid);

      if (similarity >= threshold) {
        members.push(candidateId);
        vectors.push(candidateEmbedding.vector);
        assigned.add(candidateId);
      }
    }

    // Calculate final centroid and average similarity
    const centroid = calculateCentroid(vectors);
    const avgSimilarity = calculateAverageSimilarity(vectors);

    clusters.push({
      id: clusters.length,
      members,
      centroid,
      avgSimilarity,
    });
  }

  return clusters;
}

/**
 * Calculate centroid (average) of multiple vectors
 */
function calculateCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    return [];
  }

  const dimensions = vectors[0].length;
  const centroid = new Array(dimensions).fill(0);

  for (const vector of vectors) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += vector[i];
    }
  }

  for (let i = 0; i < dimensions; i++) {
    centroid[i] /= vectors.length;
  }

  return centroid;
}

/**
 * Calculate average pairwise similarity within a set of vectors
 */
function calculateAverageSimilarity(vectors: number[][]): number {
  if (vectors.length <= 1) {
    return 1.0;
  }

  let totalSimilarity = 0;
  let count = 0;

  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      totalSimilarity += cosineSimilarity(vectors[i], vectors[j]);
      count++;
    }
  }

  return count > 0 ? totalSimilarity / count : 0;
}

/**
 * Get similarity statistics for a set of embeddings
 */
export interface SimilarityStats {
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
}

export function getSimilarityStats(similarities: number[]): SimilarityStats {
  if (similarities.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
    };
  }

  const sorted = [...similarities].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / sorted.length;

  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev,
  };
}
