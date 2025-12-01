/**
 * Full Workflow Example
 *
 * Demonstrates complete document processing pipeline:
 * 1. Index document with VectorService
 * 2. Create paragraph relationships with GraphService
 * 3. RAG-enhanced Q&A with RAGService + Claude
 * 4. Extract and persist entities with EntityService
 * 5. Discover themes with ClusterService
 *
 * @module RuvectorFullWorkflow
 */

import type { Document } from '../../../types';
import { RuvectorServiceFactory } from '../factory';

// =============================================================================
// COMPLETE DOCUMENT PROCESSING WORKFLOW
// =============================================================================

/**
 * Processing result containing all analysis artifacts
 */
export interface ProcessingResult {
  // Document identification
  documentId: string;
  documentTitle: string;
  processingTimestamp: Date;

  // Vector indexing
  indexing: {
    totalParagraphs: number;
    totalTokens: number;
    indexingTimeMs: number;
    success: boolean;
  };

  // Graph analysis
  graph: {
    nodes: number;
    edges: number;
    communities: string[][];
    centralParagraphs: Array<{ id: string; centrality: number; text: string }>;
    graphMetrics: {
      density: number;
      avgDegree: number;
      diameter: number;
    };
  };

  // Theme discovery
  themes: Array<{
    id: string;
    name: string;
    keywords: string[];
    paragraphs: string[];
    coherence: number;
    evolution: Array<{ position: number; strength: number }>;
  }>;

  // Entity extraction
  entities: {
    people: string[];
    organizations: string[];
    places: string[];
    concepts: string[];
    relationships: Array<{
      source: string;
      target: string;
      type: string;
      strength: number;
    }>;
    topEntities: Array<{ entity: string; mentions: number; importance: number }>;
  };

  // RAG capabilities
  rag: {
    ready: boolean;
    sampleQuestions: string[];
    contextChunks: number;
  };

  // Processing summary
  summary: {
    totalTimeMs: number;
    memoryUsed: number;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Process a document through the complete Ruvector pipeline
 */
export async function processDocument(
  document: Document,
  options: {
    documentId?: string;
    claudeApiKey?: string;
    enableRAG?: boolean;
    enableEntities?: boolean;
    enableGraph?: boolean;
    enableThemes?: boolean;
    verbose?: boolean;
  } = {}
): Promise<ProcessingResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  // Setup
  const documentId = options.documentId || `doc_${Date.now()}`;
  const verbose = options.verbose ?? true;

  const factory = RuvectorServiceFactory.getInstance();

  const result: ProcessingResult = {
    documentId,
    documentTitle: document.title || 'Untitled',
    processingTimestamp: new Date(),
    indexing: {
      totalParagraphs: 0,
      totalTokens: 0,
      indexingTimeMs: 0,
      success: false
    },
    graph: {
      nodes: 0,
      edges: 0,
      communities: [],
      centralParagraphs: [],
      graphMetrics: {
        density: 0,
        avgDegree: 0,
        diameter: 0
      }
    },
    themes: [],
    entities: {
      people: [],
      organizations: [],
      places: [],
      concepts: [],
      relationships: [],
      topEntities: []
    },
    rag: {
      ready: false,
      sampleQuestions: [],
      contextChunks: 0
    },
    summary: {
      totalTimeMs: 0,
      memoryUsed: 0,
      errors,
      warnings
    }
  };

  if (verbose) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Processing Document: ${result.documentTitle}`);
    console.log(`Document ID: ${documentId}`);
    console.log(`${'='.repeat(80)}\n`);
  }

  try {
    // =========================================================================
    // STEP 1: Index Document with VectorService
    // =========================================================================
    if (verbose) console.log('📊 Step 1: Indexing document...');
    const indexStart = Date.now();

    const vectorService = await factory.getVectorService();

    // Split document into paragraphs
    const paragraphs = document.text
      .split('\n\n')
      .filter(p => p.trim().length > 0)
      .map((text, idx) => ({
        id: `${documentId}_p${idx}`,
        text: text.trim(),
        metadata: {
          documentId,
          documentTitle: document.title,
          paragraphIndex: idx,
          author: document.metadata?.author,
          date: document.metadata?.date,
          section: detectSection(text, idx)
        }
      }));

    // Batch index all paragraphs
    await vectorService.indexDocumentBatch(paragraphs);

    result.indexing = {
      totalParagraphs: paragraphs.length,
      totalTokens: paragraphs.reduce((sum, p) => sum + estimateTokens(p.text), 0),
      indexingTimeMs: Date.now() - indexStart,
      success: true
    };

    if (verbose) {
      console.log(`✓ Indexed ${result.indexing.totalParagraphs} paragraphs`);
      console.log(`  Tokens: ${result.indexing.totalTokens.toLocaleString()}`);
      console.log(`  Time: ${result.indexing.indexingTimeMs}ms\n`);
    }

    // =========================================================================
    // STEP 2: Build Paragraph Relationship Graph
    // =========================================================================
    if (options.enableGraph !== false) {
      if (verbose) console.log('🕸️  Step 2: Building relationship graph...');
      const graphStart = Date.now();

      const graphService = await factory.getGraphService();

      // Build multi-type relationship graph
      const graph = await graphService.buildRelationshipGraph(documentId, {
        relationshipTypes: [
          'semantic_similarity',
          'temporal_sequence',
          'citation_reference'
        ],
        similarityThreshold: 0.70,
        maxEdgesPerNode: 8,
        bidirectional: true
      });

      // Detect communities (thematic clusters)
      const communities = await graphService.detectCommunities(graph, {
        algorithm: 'louvain',
        minCommunitySize: 3,
        resolution: 1.0
      });

      // Analyze centrality (importance)
      const centrality = await graphService.analyzeCentrality(graph);
      const topCentral = Object.entries(centrality)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, score]) => ({
          id,
          centrality: score,
          text: paragraphs.find(p => p.id === id)?.text.slice(0, 100) + '...' || ''
        }));

      // Calculate graph metrics
      const metrics = await graphService.analyzeGraphMetrics(graph);

      result.graph = {
        nodes: graph.nodes.size,
        edges: Array.from(graph.edges.values()).reduce(
          (sum, edges) => sum + edges.length,
          0
        ),
        communities,
        centralParagraphs: topCentral,
        graphMetrics: metrics
      };

      if (verbose) {
        console.log(`✓ Graph built with ${result.graph.nodes} nodes, ${result.graph.edges} edges`);
        console.log(`  Communities: ${result.graph.communities.length}`);
        console.log(`  Density: ${result.graph.graphMetrics.density.toFixed(3)}`);
        console.log(`  Time: ${Date.now() - graphStart}ms\n`);
      }
    }

    // =========================================================================
    // STEP 3: Discover Themes with ClusterService
    // =========================================================================
    if (options.enableThemes !== false) {
      if (verbose) console.log('🎨 Step 3: Discovering themes...');
      const themeStart = Date.now();

      const clusterService = await factory.getClusterService();

      // Discover themes with automatic cluster number detection
      const themes = await clusterService.discoverThemes(documentId, {
        numClusters: 'auto',
        algorithm: 'kmeans',
        minClusterSize: 3,
        extractKeywords: true,
        computeCoherence: true
      });

      // Track theme evolution through document
      const evolution = await clusterService.trackThemeEvolution(documentId, {
        windowSize: Math.max(5, Math.floor(result.indexing.totalParagraphs / 10)),
        stride: 3,
        trackTransitions: true
      });

      // Combine themes with evolution data
      result.themes = themes.map((theme, idx) => ({
        id: theme.id,
        name: generateThemeName(theme.keywords),
        keywords: theme.keywords,
        paragraphs: theme.members,
        coherence: theme.coherence,
        evolution: evolution[idx] || []
      }));

      if (verbose) {
        console.log(`✓ Discovered ${result.themes.length} themes`);
        result.themes.forEach((theme, idx) => {
          console.log(
            `  ${idx + 1}. ${theme.name} (${theme.paragraphs.length} paragraphs, coherence: ${theme.coherence.toFixed(2)})`
          );
          console.log(`     Keywords: ${theme.keywords.slice(0, 5).join(', ')}`);
        });
        console.log(`  Time: ${Date.now() - themeStart}ms\n`);
      }
    }

    // =========================================================================
    // STEP 4: Extract Entities and Relationships
    // =========================================================================
    if (options.enableEntities !== false) {
      if (verbose) console.log('🏷️  Step 4: Extracting entities...');
      const entityStart = Date.now();

      const entityService = await factory.getEntityService();

      // Extract entities from full document
      const entities = await entityService.extractEntities(document.text, {
        types: ['PERSON', 'ORG', 'GPE', 'EVENT', 'CONCEPT'],
        includeContext: true,
        resolveAliases: true,
        extractRelationships: true
      });

      // Build entity relationship graph
      const relationships = await entityService.buildEntityGraph(documentId, {
        relationshipTypes: ['co-occurrence', 'reference', 'hierarchy'],
        minStrength: 0.3,
        maxRelationshipsPerEntity: 10
      });

      // Analyze entity importance
      const networkStats = await entityService.analyzeEntityNetwork(documentId);

      // Categorize entities by type
      const entityByType = {
        people: entities.filter(e => e.type === 'PERSON').map(e => e.text),
        organizations: entities.filter(e => e.type === 'ORG').map(e => e.text),
        places: entities.filter(e => e.type === 'GPE').map(e => e.text),
        concepts: entities.filter(e => e.type === 'CONCEPT').map(e => e.text)
      };

      result.entities = {
        ...entityByType,
        relationships: relationships.map(r => ({
          source: r.source,
          target: r.target,
          type: r.type,
          strength: r.weight
        })),
        topEntities: networkStats.topEntities || []
      };

      // Persist entities for future searches
      await entityService.persistEntities(documentId, entities, relationships);

      if (verbose) {
        console.log(`✓ Extracted entities:`);
        console.log(`  People: ${result.entities.people.length}`);
        console.log(`  Organizations: ${result.entities.organizations.length}`);
        console.log(`  Places: ${result.entities.places.length}`);
        console.log(`  Concepts: ${result.entities.concepts.length}`);
        console.log(`  Relationships: ${result.entities.relationships.length}`);
        console.log(`  Time: ${Date.now() - entityStart}ms\n`);
      }
    }

    // =========================================================================
    // STEP 5: Setup RAG for Q&A
    // =========================================================================
    if (options.enableRAG !== false && options.claudeApiKey) {
      if (verbose) console.log('🤖 Step 5: Setting up RAG...');
      const ragStart = Date.now();

      const ragService = await factory.getRAGService();

      // Validate RAG readiness
      const readiness = await ragService.validateReadiness(documentId);

      if (readiness.ready) {
        // Generate sample questions based on document content
        const sampleQuestions = await generateSampleQuestions(
          document,
          result.themes,
          result.entities
        );

        result.rag = {
          ready: true,
          sampleQuestions,
          contextChunks: readiness.totalChunks
        };

        if (verbose) {
          console.log(`✓ RAG ready with ${result.rag.contextChunks} context chunks`);
          console.log(`  Sample questions:`);
          sampleQuestions.slice(0, 3).forEach((q, idx) => {
            console.log(`  ${idx + 1}. ${q}`);
          });
          console.log(`  Time: ${Date.now() - ragStart}ms\n`);
        }
      } else {
        warnings.push('RAG setup incomplete: ' + readiness.reason);
        if (verbose) console.log(`⚠ RAG not ready: ${readiness.reason}\n`);
      }
    }

    // =========================================================================
    // PROCESSING COMPLETE
    // =========================================================================
    const totalTime = Date.now() - startTime;
    result.summary = {
      totalTimeMs: totalTime,
      memoryUsed: process.memoryUsage().heapUsed,
      errors,
      warnings
    };

    if (verbose) {
      console.log(`${'='.repeat(80)}`);
      console.log(`✓ Processing Complete`);
      console.log(`  Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
      console.log(`  Memory Used: ${(result.summary.memoryUsed / 1024 / 1024).toFixed(2)} MB`);
      if (errors.length > 0) {
        console.log(`  ❌ Errors: ${errors.length}`);
        errors.forEach(e => console.log(`    - ${e}`));
      }
      if (warnings.length > 0) {
        console.log(`  ⚠ Warnings: ${warnings.length}`);
        warnings.forEach(w => console.log(`    - ${w}`));
      }
      console.log(`${'='.repeat(80)}\n`);
    }

    return result;
  } catch (error) {
    errors.push(`Fatal error: ${error.message}`);
    result.summary = {
      totalTimeMs: Date.now() - startTime,
      memoryUsed: process.memoryUsage().heapUsed,
      errors,
      warnings
    };
    throw error;
  }
}

// =============================================================================
// INTERACTIVE Q&A WITH RAG
// =============================================================================

/**
 * Interactive Q&A session using RAG
 */
export async function interactiveQA(
  documentId: string,
  claudeApiKey: string,
  options: {
    maxTurns?: number;
    verbose?: boolean;
  } = {}
): Promise<void> {
  const factory = RuvectorServiceFactory.getInstance();
  const ragService = await factory.getRAGService();

  const maxTurns = options.maxTurns || 10;
  const verbose = options.verbose ?? true;

  const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> =
    [];

  if (verbose) {
    console.log('\n🤖 Interactive Q&A Session');
    console.log('Ask questions about the document (type "exit" to quit)\n');
  }

  for (let turn = 0; turn < maxTurns; turn++) {
    // In real app, get question from user input
    // For demo, we'll use sample questions
    const question = await getNextQuestion(turn);

    if (!question || question.toLowerCase() === 'exit') {
      if (verbose) console.log('\nEnding Q&A session.\n');
      break;
    }

    if (verbose) console.log(`\nQ: ${question}`);

    // Query with RAG
    const result = await ragService.conversationalQuery({
      question,
      documentIds: [documentId],
      conversationHistory,
      topK: 5,
      contextWindow: 3,
      generateFollowUps: true,
      generateCitations: true,
      model: 'claude-3-5-sonnet-20241022',
      apiKey: claudeApiKey
    });

    if (verbose) {
      console.log(`\nA: ${result.answer}\n`);

      if (result.sources && result.sources.length > 0) {
        console.log('Sources:');
        result.sources.forEach((source, idx) => {
          console.log(`  [${idx + 1}] ${source.text.slice(0, 100)}...`);
          console.log(`      Relevance: ${(source.relevance * 100).toFixed(1)}%`);
        });
        console.log();
      }

      if (result.followUpQuestions && result.followUpQuestions.length > 0) {
        console.log('Suggested follow-up questions:');
        result.followUpQuestions.forEach((q, idx) => {
          console.log(`  ${idx + 1}. ${q}`);
        });
        console.log();
      }
    }

    // Update conversation history
    conversationHistory.push(
      { role: 'user', content: question },
      { role: 'assistant', content: result.answer }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function detectSection(text: string, index: number): string {
  // Simple section detection based on common patterns
  const lower = text.toLowerCase();
  if (lower.includes('introduction') || index === 0) return 'introduction';
  if (lower.includes('conclusion') || lower.includes('summary'))
    return 'conclusion';
  if (lower.includes('method')) return 'methodology';
  if (lower.includes('result')) return 'results';
  if (lower.includes('discussion')) return 'discussion';
  return 'body';
}

function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

function generateThemeName(keywords: string[]): string {
  // Generate human-readable theme name from keywords
  if (keywords.length === 0) return 'Untitled Theme';
  return keywords.slice(0, 3).join(' & ');
}

async function generateSampleQuestions(
  document: Document,
  themes: any[],
  entities: any
): Promise<string[]> {
  const questions: string[] = [];

  // General questions
  questions.push(`What is the main topic of "${document.title}"?`);
  questions.push('Can you summarize the key points?');

  // Theme-based questions
  if (themes.length > 0) {
    questions.push(
      `What does the document say about ${themes[0].keywords[0]}?`
    );
  }

  // Entity-based questions
  if (entities.people.length > 0) {
    questions.push(`What role does ${entities.people[0]} play?`);
  }
  if (entities.organizations.length > 0) {
    questions.push(`How is ${entities.organizations[0]} involved?`);
  }

  return questions.slice(0, 5);
}

async function getNextQuestion(turn: number): Promise<string | null> {
  // In real app, this would read from stdin or UI
  // For demo, return sample questions
  const sampleQuestions = [
    'What is the main argument?',
    'What evidence supports this?',
    'Are there any counterarguments?',
    'What are the implications?',
    'How does this relate to previous work?'
  ];

  return turn < sampleQuestions.length ? sampleQuestions[turn] : null;
}

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

/**
 * Example usage of the complete workflow
 */
export async function exampleUsage(): Promise<void> {
  // Load a document
  const document: Document = {
    id: 'doc_001',
    title: 'Climate Change and Global Policy',
    text: `
      Introduction
      Climate change represents one of the most pressing challenges of our time...

      Historical Context
      The scientific consensus on climate change has evolved significantly...

      Current Policy Framework
      International agreements such as the Paris Accord...

      Conclusion
      Urgent action is required to address these challenges...
    `.trim(),
    metadata: {
      author: 'Dr. Jane Smith',
      date: '2024-01-15',
      source: 'Journal of Environmental Policy'
    }
  };

  // Process document through complete pipeline
  const result = await processDocument(document, {
    documentId: 'climate_policy_001',
    claudeApiKey: process.env.ANTHROPIC_API_KEY,
    enableRAG: true,
    enableEntities: true,
    enableGraph: true,
    enableThemes: true,
    verbose: true
  });

  // Use the results
  console.log('\n📊 Processing Results:\n');
  console.log(`Themes discovered: ${result.themes.length}`);
  console.log(`Entities extracted: ${Object.values(result.entities).flat().length}`);
  console.log(`Graph nodes: ${result.graph.nodes}`);
  console.log(`RAG ready: ${result.rag.ready}`);

  // Start interactive Q&A
  if (result.rag.ready && process.env.ANTHROPIC_API_KEY) {
    await interactiveQA('climate_policy_001', process.env.ANTHROPIC_API_KEY, {
      verbose: true
    });
  }
}

export default processDocument;
