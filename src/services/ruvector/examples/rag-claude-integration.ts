/**
 * RAG + Claude Integration Example
 *
 * Demonstrates how to use RAGService to enhance ClaudeService with
 * retrieval-augmented generation for question answering over documents.
 *
 * Use Case: Multi-document question answering with source citations
 */

import { getRuvectorClient } from '../client';
import { RAGService } from '../RAGService';
import { ClaudeService } from '../../ai/ClaudeService';
import type { RAGDocument, RAGQueryOptions } from '../types';

// ============================================================================
// Setup
// ============================================================================

async function setupServices() {
  // Initialize Ruvector client
  const ruvectorClient = getRuvectorClient({
    apiKey: process.env.RUVECTOR_API_KEY!,
    baseUrl: 'https://api.ruvector.ai',
    cacheEnabled: true,
  });

  // Initialize RAG service
  const ragService = new RAGService(ruvectorClient);

  // Initialize Claude service
  const claudeService = new ClaudeService({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-sonnet-4-20250514',
  });

  return { ragService, claudeService };
}

// ============================================================================
// Example 1: Index Documents and Answer Questions
// ============================================================================

async function exampleBasicRAG() {
  console.log('\n=== Example 1: Basic RAG Question Answering ===\n');

  const { ragService, claudeService } = await setupServices();

  // Sample documents to index
  const documents: RAGDocument[] = [
    {
      id: 'moby-dick-ch1',
      text: `Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.`,
      metadata: {
        title: 'Moby Dick',
        author: 'Herman Melville',
        chapter: 1,
      },
    },
    {
      id: 'moby-dick-ch36',
      text: `"Hast seen the White Whale?" "Look!" replied the hollow-cheeked captain from his taffrail; and with his trumpet he pointed to the wreck. "Hast seen the White Whale?"`,
      metadata: {
        title: 'Moby Dick',
        author: 'Herman Melville',
        chapter: 36,
      },
    },
  ];

  // Index documents
  console.log('Indexing documents...');
  const indexResult = await ragService.indexDocuments(documents, {
    chunkSize: 100,
    chunkOverlap: 20,
    namespace: 'literature:moby-dick',
  });

  console.log(`Indexed: ${indexResult.succeeded}/${indexResult.total} documents`);

  // Ask a question
  const question = "What is the narrator's name and what does he want to do?";

  console.log(`\nQuestion: ${question}\n`);

  // Retrieve context and prepare prompt
  const { systemPrompt, userPrompt, context } = await ragService.preparePrompt(
    question,
    {
      topK: 3,
      rerank: true,
      minRelevance: 0.7,
    }
  );

  console.log(`Retrieved ${context.totalChunks} relevant chunks`);
  console.log(`Documents: ${context.documentIds.join(', ')}\n`);

  // Generate answer using Claude
  const response = await claudeService.answerQuestion(question, userPrompt, {
    includeEvidence: true,
    confidenceThreshold: 0.8,
  });

  console.log('Answer:', response.data.answer);
  console.log('Confidence:', response.data.confidence);
  console.log('\nEvidence:');
  response.data.evidence.forEach((ev, i) => {
    console.log(`${i + 1}. "${ev.quote}" (relevance: ${ev.relevanceScore})`);
  });

  console.log('\nToken Usage:', response.usage);
  console.log('Cost: $', response.usage.estimatedCost.toFixed(4));
}

// ============================================================================
// Example 2: Multi-Document Comparative Analysis
// ============================================================================

async function exampleComparativeAnalysis() {
  console.log('\n=== Example 2: Comparative Analysis Across Documents ===\n');

  const { ragService, claudeService } = await setupServices();

  const documents: RAGDocument[] = [
    {
      id: 'whitman-leaves',
      text: `I celebrate myself, and sing myself, And what I assume you shall assume, For every atom belonging to me as good belongs to you.`,
      metadata: {
        title: 'Leaves of Grass',
        author: 'Walt Whitman',
        year: 1855,
      },
    },
    {
      id: 'dickinson-poem',
      text: `I'm Nobody! Who are you? Are you – Nobody – too? Then there's a pair of us! Don't tell! they'd advertise – you know!`,
      metadata: {
        title: "I'm Nobody! Who are you?",
        author: 'Emily Dickinson',
        year: 1891,
      },
    },
  ];

  // Index documents
  await ragService.indexDocuments(documents, {
    namespace: 'poetry:american',
  });

  // Comparative question
  const question =
    'How do these poets approach the concept of individual identity?';

  // Retrieve context from both documents
  const context = await ragService.retrieveContextForQuestion(question, [
    'whitman-leaves',
    'dickinson-poem',
  ]);

  // Prepare comparative analysis prompt
  const systemPrompt = `You are a literary scholar specializing in comparative poetry analysis.
Compare the treatment of themes across multiple works, citing specific textual evidence.`;

  const userPrompt = `Context from multiple poems:
${ragService.formatContextForClaude(context)}

Question: ${question}

Provide a comparative analysis that:
1. Identifies each poet's approach
2. Highlights similarities and differences
3. Cites specific evidence from each text
4. Synthesizes insights about their contrasting perspectives`;

  // Generate comparative analysis
  const response = await claudeService.compareDocuments(
    documents.map((doc) => ({
      id: doc.id,
      title: doc.metadata?.title as string,
      text: doc.text,
    })),
    {
      focusAreas: ['individual identity', 'self-expression'],
      includeThemes: true,
      includeSynthesis: true,
    }
  );

  console.log('Comparative Analysis:\n');
  console.log(response.data.synthesis.overallAnalysis);

  console.log('\n\nKey Themes:');
  response.data.themes.forEach((theme) => {
    console.log(`\n- ${theme.theme}`);
    theme.occurrences.forEach((occ) => {
      console.log(`  ${occ.documentId}: ${occ.treatment}`);
    });
  });
}

// ============================================================================
// Example 3: Context-Aware Annotation Suggestions
// ============================================================================

async function exampleAnnotationSuggestions() {
  console.log('\n=== Example 3: RAG-Enhanced Annotation Suggestions ===\n');

  const { ragService, claudeService } = await setupServices();

  const document: RAGDocument = {
    id: 'shakespeare-hamlet',
    text: `To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer The slings and arrows of outrageous fortune, Or to take arms against a sea of troubles And by opposing end them.`,
    metadata: {
      title: 'Hamlet',
      author: 'William Shakespeare',
      act: 3,
      scene: 1,
    },
  };

  // Index the passage
  await ragService.indexDocument(document, {
    chunkSize: 50,
    namespace: 'drama:shakespeare',
  });

  // Retrieve related context (if we had a larger corpus)
  const context = await ragService.retrieveContext(
    'philosophical questions about life and death',
    {
      topK: 5,
      namespace: 'drama:shakespeare',
    }
  );

  // Use Claude to generate annotations with RAG context
  const systemPrompt = `You are an expert literary educator. Generate pedagogically valuable annotations that:
- Explain difficult concepts
- Highlight literary devices
- Connect to broader themes
- Suggest discussion questions

Use the provided context to make connections across related texts.`;

  const userPrompt = `Text to annotate:
${document.text}

Related context from other works:
${ragService.formatContextForClaude(context)}

Generate annotations that help students understand this passage deeply.`;

  const response = await claudeService.suggestAnnotations(document.text, {
    types: ['definition', 'interpretation', 'connection', 'question'],
    minPedagogicalValue: 0.7,
    maxSuggestions: 5,
  });

  console.log('RAG-Enhanced Annotations:\n');
  response.data.forEach((annotation, i) => {
    console.log(`${i + 1}. [${annotation.type}] "${annotation.passage}"`);
    console.log(`   ${annotation.suggestedNote}`);
    console.log(
      `   Pedagogical Value: ${(annotation.pedagogicalValue * 100).toFixed(0)}%\n`
    );
  });
}

// ============================================================================
// Example 4: Optimized Context Assembly
// ============================================================================

async function exampleContextOptimization() {
  console.log('\n=== Example 4: Context Assembly with Token Budget ===\n');

  const { ragService, claudeService } = await setupServices();

  // Large document that needs chunking
  const largeDocument: RAGDocument = {
    id: 'long-essay',
    text: `${'This is a paragraph in a very long essay. '.repeat(200)}`,
    metadata: { title: 'Long Essay', wordCount: 2000 },
  };

  await ragService.indexDocument(largeDocument, {
    chunkSize: 200,
    chunkOverlap: 50,
  });

  // Retrieve with token budget
  const tokenBudget = ragService.getOptimalContextWindow(
    4000,
    'claude-sonnet-4-20250514'
  );

  console.log(`Available context window: ${tokenBudget} tokens`);

  const context = await ragService.retrieveContext(
    'main argument of the essay',
    {
      topK: 20, // Get many candidates
      rerank: true,
    }
  );

  // Assemble context within budget
  const optimizedContext = ragService.assembleContextWithinBudget(
    context.chunks,
    tokenBudget
  );

  console.log(`\nOptimized from ${context.totalChunks} to ${optimizedContext.totalChunks} chunks`);
  console.log(
    `Estimated tokens: ${Math.ceil(
      optimizedContext.chunks.map((c) => c.text).join(' ').length / 4
    )}`
  );

  // Use optimized context with Claude
  const formattedContext = ragService.formatContextForClaude(optimizedContext);

  const response = await claudeService.summarize(formattedContext, {
    style: 'academic',
    level: 'advanced',
    maxLength: 200,
    includeCitations: true,
  });

  console.log('\nSummary:', response.data.text);
  console.log('Key Points:', response.data.keyPoints);
}

// ============================================================================
// Example 5: Health Monitoring and Statistics
// ============================================================================

async function exampleMonitoring() {
  console.log('\n=== Example 5: RAG Service Monitoring ===\n');

  const { ragService } = await setupServices();

  // Check service health
  const health = await ragService.healthCheck();
  console.log('Health Status:', health.status);
  console.log('Latency:', health.latency, 'ms');

  // Get index statistics
  const stats = await ragService.getIndexStats('literature:moby-dick');
  console.log('\nIndex Statistics:');
  console.log(`- Total Documents: ${stats.totalDocuments}`);
  console.log(`- Total Chunks: ${stats.totalChunks}`);
  console.log(`- Avg Chunks/Doc: ${stats.avgChunksPerDocument.toFixed(2)}`);
}

// ============================================================================
// Run Examples
// ============================================================================

async function main() {
  try {
    // Check environment variables
    if (!process.env.RUVECTOR_API_KEY || !process.env.ANTHROPIC_API_KEY) {
      console.error('Missing required environment variables:');
      console.error('- RUVECTOR_API_KEY');
      console.error('- ANTHROPIC_API_KEY');
      process.exit(1);
    }

    // Run examples
    await exampleBasicRAG();
    await exampleComparativeAnalysis();
    await exampleAnnotationSuggestions();
    await exampleContextOptimization();
    await exampleMonitoring();

    console.log('\n✓ All examples completed successfully!\n');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  exampleBasicRAG,
  exampleComparativeAnalysis,
  exampleAnnotationSuggestions,
  exampleContextOptimization,
  exampleMonitoring,
};
