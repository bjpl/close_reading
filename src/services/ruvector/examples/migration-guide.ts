/**
 * Migration Guide: From existing services to Ruvector
 *
 * This file shows before/after code examples for migrating
 * from similarity.ts and paragraphLinks.ts to Ruvector services.
 *
 * @module RuvectorMigrationGuide
 */

import type { Document, Paragraph } from '../../../types';
import { RuvectorServiceFactory } from '../factory';

// =============================================================================
// EXAMPLE 1: Migrating Similarity Search
// =============================================================================

// BEFORE: Using similarity.ts
async function findSimilarParagraphsOld(
  targetParagraph: Paragraph,
  allParagraphs: Paragraph[],
  topK: number = 5
): Promise<Array<{ paragraph: Paragraph; similarity: number }>> {
  const { findSimilarParagraphs } = await import('../../ml/similarity');
  return findSimilarParagraphs(targetParagraph, allParagraphs, topK);
}

// AFTER: Using Ruvector with adapters (minimal code changes)
async function findSimilarParagraphsAdapter(
  targetParagraph: Paragraph,
  allParagraphs: Paragraph[],
  topK: number = 5
): Promise<Array<{ paragraph: Paragraph; similarity: number }>> {
  // Factory automatically detects and uses Ruvector if available
  const factory = RuvectorServiceFactory.getInstance();
  const vectorService = await factory.getVectorService();

  // Adapter provides same interface as old similarity.ts
  return vectorService.findSimilarParagraphs(targetParagraph, allParagraphs, topK);
}

// AFTER: Using Ruvector directly (recommended - more features)
async function findSimilarParagraphsRuvector(
  targetParagraph: Paragraph,
  documentId: string,
  topK: number = 5
): Promise<Array<{ id: string; text: string; score: number; metadata: any }>> {
  const factory = RuvectorServiceFactory.getInstance();
  const vectorService = await factory.getVectorService();

  // Ruvector searches pre-indexed vectors (much faster!)
  // Also returns richer metadata and supports filters
  return vectorService.search({
    query: targetParagraph.text,
    topK,
    filters: {
      documentId,
      // Can filter by any metadata: author, date, section, etc.
    },
    includeMetadata: true,
    scoreThreshold: 0.7 // Only return results above similarity threshold
  });
}

// =============================================================================
// EXAMPLE 2: Migrating Paragraph Links
// =============================================================================

// BEFORE: Using paragraphLinks.ts
async function generateParagraphLinksOld(
  paragraphs: Paragraph[]
): Promise<Map<string, string[]>> {
  const { generateLinks } = await import('../../analysis/paragraphLinks');
  return generateLinks(paragraphs, {
    similarityThreshold: 0.75,
    maxLinksPerParagraph: 10
  });
}

// AFTER: Using Ruvector with GraphService (more powerful)
async function generateParagraphLinksRuvector(
  documentId: string,
  paragraphs: Paragraph[]
): Promise<Map<string, string[]>> {
  const factory = RuvectorServiceFactory.getInstance();
  const graphService = await factory.getGraphService();

  // First, index paragraphs if not already done
  const vectorService = await factory.getVectorService();
  await vectorService.indexDocumentBatch(paragraphs.map((p, idx) => ({
    id: `${documentId}_p${idx}`,
    text: p.text,
    metadata: {
      documentId,
      paragraphIndex: idx,
      position: p.position
    }
  })));

  // Build relationship graph with semantic similarity
  const graph = await graphService.buildRelationshipGraph(documentId, {
    relationshipType: 'semantic_similarity',
    similarityThreshold: 0.75,
    maxEdgesPerNode: 10,
    bidirectional: true
  });

  // Convert to same format as old paragraphLinks
  const linksMap = new Map<string, string[]>();
  for (const [nodeId, edges] of graph.edges.entries()) {
    linksMap.set(nodeId, edges.map(e => e.target));
  }

  return linksMap;
}

// AFTER: Using advanced graph features (recommended)
async function generateParagraphLinksAdvanced(
  documentId: string,
  paragraphs: Paragraph[]
): Promise<{
  links: Map<string, string[]>;
  communities: string[][];
  centralNodes: string[];
  graph: any;
}> {
  const factory = RuvectorServiceFactory.getInstance();
  const graphService = await factory.getGraphService();

  // Build graph with multiple relationship types
  const graph = await graphService.buildRelationshipGraph(documentId, {
    relationshipTypes: [
      'semantic_similarity',
      'temporal_sequence', // Paragraphs that follow each other
      'citation_reference', // Paragraphs that reference same entities
      'thematic_connection' // Paragraphs in same theme cluster
    ],
    similarityThreshold: 0.75,
    maxEdgesPerNode: 10
  });

  // Detect communities (groups of related paragraphs)
  const communities = await graphService.detectCommunities(graph, {
    algorithm: 'louvain',
    minCommunitySize: 3
  });

  // Find most central/important paragraphs
  const centrality = await graphService.analyzeCentrality(graph);
  const centralNodes = Object.entries(centrality)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id]) => id);

  // Convert edges to simple links map
  const linksMap = new Map<string, string[]>();
  for (const [nodeId, edges] of graph.edges.entries()) {
    linksMap.set(nodeId, edges.map(e => e.target));
  }

  return {
    links: linksMap,
    communities,
    centralNodes,
    graph
  };
}

// =============================================================================
// EXAMPLE 3: Migrating Clustering
// =============================================================================

// BEFORE: Using similarity.ts clustering
async function clusterParagraphsOld(
  paragraphs: Paragraph[],
  numClusters: number = 5
): Promise<Array<{ paragraphs: Paragraph[]; centroid: string }>> {
  const { clusterBySimilarity } = await import('../../ml/similarity');
  return clusterBySimilarity(paragraphs, numClusters);
}

// AFTER: Using Ruvector ClusterService (more algorithms, better performance)
async function clusterParagraphsRuvector(
  documentId: string,
  numClusters: number = 5
): Promise<Array<{
  id: string;
  members: string[];
  centroid: string;
  coherence: number;
  keywords: string[];
}>> {
  const factory = RuvectorServiceFactory.getInstance();
  const clusterService = await factory.getClusterService();

  // Discover themes with multiple clustering algorithms
  const themes = await clusterService.discoverThemes(documentId, {
    numClusters,
    algorithm: 'kmeans', // or 'hierarchical', 'dbscan', 'spectral'
    minClusterSize: 3,
    extractKeywords: true, // Auto-extract theme keywords
    computeCoherence: true // Measure cluster quality
  });

  return themes;
}

// AFTER: Hierarchical clustering with theme evolution
async function clusterParagraphsHierarchical(
  documentId: string
): Promise<{
  themes: any[];
  hierarchy: any;
  evolution: any[];
}> {
  const factory = RuvectorServiceFactory.getInstance();
  const clusterService = await factory.getClusterService();

  // Build hierarchical theme structure
  const hierarchy = await clusterService.hierarchicalClustering(documentId, {
    linkageMethod: 'ward',
    distanceMetric: 'cosine',
    maxDepth: 4,
    minClusterSize: 2
  });

  // Track how themes evolve through document
  const evolution = await clusterService.trackThemeEvolution(documentId, {
    windowSize: 10, // paragraphs per window
    stride: 5, // overlap between windows
    trackTransitions: true
  });

  // Get flat themes at optimal depth
  const themes = await clusterService.discoverThemes(documentId, {
    algorithm: 'hierarchical',
    numClusters: 'auto' // Auto-detect optimal number
  });

  return { themes, hierarchy, evolution };
}

// =============================================================================
// EXAMPLE 4: Adding RAG to Claude Integration
// =============================================================================

// BEFORE: Direct Claude API call without context
async function askClaudeOld(
  question: string,
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: question }]
    })
  });

  const data = await response.json();
  return data.content[0].text;
}

// AFTER: RAG-enhanced Claude with document context
async function askClaudeWithRAG(
  question: string,
  documentIds: string[],
  apiKey: string
): Promise<{
  answer: string;
  sources: Array<{ text: string; documentId: string; relevance: number }>;
  confidence: number;
}> {
  const factory = RuvectorServiceFactory.getInstance();
  const ragService = await factory.getRAGService();

  // RAG automatically:
  // 1. Searches relevant document chunks
  // 2. Ranks by relevance
  // 3. Constructs context-enhanced prompt
  // 4. Sends to Claude with citations
  const result = await ragService.query({
    question,
    documentIds,
    topK: 5, // Include 5 most relevant chunks
    includeMetadata: true,
    rerank: true, // Re-rank results for better relevance
    generateCitations: true, // Include source citations in answer
    model: 'claude-3-5-sonnet-20241022',
    apiKey
  });

  return {
    answer: result.answer,
    sources: result.sources,
    confidence: result.confidence
  };
}

// AFTER: Advanced RAG with conversation history
async function askClaudeConversational(
  question: string,
  documentIds: string[],
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  apiKey: string
): Promise<{
  answer: string;
  sources: any[];
  followUpQuestions: string[];
}> {
  const factory = RuvectorServiceFactory.getInstance();
  const ragService = await factory.getRAGService();

  const result = await ragService.conversationalQuery({
    question,
    documentIds,
    conversationHistory,
    topK: 5,
    contextWindow: 3, // Include last 3 conversation turns
    generateFollowUps: true, // Suggest related questions
    model: 'claude-3-5-sonnet-20241022',
    apiKey
  });

  return result;
}

// =============================================================================
// EXAMPLE 5: Entity Extraction and Persistence
// =============================================================================

// NEW: Entity extraction (no old equivalent)
async function extractAndPersistEntities(
  document: Document,
  documentId: string
): Promise<{
  entities: any[];
  relationships: any[];
  networkStats: any;
}> {
  const factory = RuvectorServiceFactory.getInstance();
  const entityService = await factory.getEntityService();

  // Extract entities from document
  const entities = await entityService.extractEntities(document.text, {
    types: ['PERSON', 'ORG', 'GPE', 'EVENT', 'CONCEPT'],
    includeContext: true, // Where each entity appears
    resolveAliases: true, // "Steve Jobs" = "Jobs" = "he"
    extractRelationships: true // Entity co-occurrences
  });

  // Build entity relationship graph
  const relationships = await entityService.buildEntityGraph(documentId, {
    relationshipTypes: [
      'co-occurrence', // Entities mentioned together
      'reference', // One entity references another
      'hierarchy' // Parent-child relationships
    ],
    minStrength: 0.3 // Minimum relationship strength
  });

  // Analyze entity network
  const networkStats = await entityService.analyzeEntityNetwork(documentId);

  // Persist to vector store for future searches
  await entityService.persistEntities(documentId, entities, relationships);

  return { entities, relationships, networkStats };
}

// =============================================================================
// MIGRATION CHECKLIST
// =============================================================================

/**
 * Migration Checklist:
 *
 * 1. [ ] Install Ruvector: npm install @ruvector/client
 * 2. [ ] Set environment variable: RUVECTOR_API_KEY=your-key
 * 3. [ ] Initialize factory: RuvectorServiceFactory.getInstance()
 * 4. [ ] Test with adapter: Use adapter methods first for compatibility
 * 5. [ ] Index documents: Call vectorService.indexDocumentBatch()
 * 6. [ ] Migrate similarity searches: Replace similarity.ts calls
 * 7. [ ] Migrate paragraph links: Replace paragraphLinks.ts calls
 * 8. [ ] Add RAG to Claude: Enhance Q&A with context
 * 9. [ ] Add entity extraction: Extract and analyze entities
 * 10. [ ] Monitor performance: Check metrics and optimize
 *
 * Performance Benefits:
 * - 10-100x faster similarity search (pre-indexed vectors)
 * - Advanced clustering algorithms (DBSCAN, spectral, hierarchical)
 * - Entity extraction and relationship graphs
 * - RAG for context-aware Claude responses
 * - Graph analysis (communities, centrality, paths)
 * - Multi-document semantic search
 * - Theme evolution tracking
 * - Real-time collaboration features
 */

// =============================================================================
// SIDE-BY-SIDE COMPARISON
// =============================================================================

export const migrationExamples = {
  // Simple similarity search
  similarity: {
    old: findSimilarParagraphsOld,
    adapter: findSimilarParagraphsAdapter,
    new: findSimilarParagraphsRuvector
  },

  // Paragraph linking
  paragraphLinks: {
    old: generateParagraphLinksOld,
    new: generateParagraphLinksRuvector,
    advanced: generateParagraphLinksAdvanced
  },

  // Clustering
  clustering: {
    old: clusterParagraphsOld,
    new: clusterParagraphsRuvector,
    advanced: clusterParagraphsHierarchical
  },

  // Claude integration
  claude: {
    old: askClaudeOld,
    rag: askClaudeWithRAG,
    conversational: askClaudeConversational
  },

  // Entity extraction (new capability)
  entities: {
    extract: extractAndPersistEntities
  }
};

export default migrationExamples;
