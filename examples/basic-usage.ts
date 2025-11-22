/**
 * Basic Usage Examples for Close Reading Platform
 *
 * This file demonstrates common usage patterns for the core services.
 */

import {
  bibliographyService,
  documentParserService,
  annotationService,
  BibliographyService,
  DocumentParserService,
  AnnotationService
} from '../src/services';

// ============================================================================
// Example 1: Bibliography Management
// ============================================================================

async function bibliographyExample() {
  console.log('=== Bibliography Management ===\n');

  // Import from BibTeX
  const bibtexData = `
    @article{smith2023ml,
      title={Machine Learning in Research},
      author={Smith, John and Doe, Jane},
      journal={Journal of Computing},
      volume={45},
      number={2},
      pages={123--145},
      year={2023},
      publisher={ACM}
    }
  `;

  const entries = await bibliographyService.importBibliography(bibtexData, 'bibtex');
  console.log(`Imported ${entries.length} entries`);

  // Create manual entry
  const entry = bibliographyService.createEntry({
    type: 'book',
    title: 'Research Methods in Computer Science',
    author: [
      { given: 'Alice', family: 'Johnson' },
      { given: 'Bob', family: 'Williams' }
    ],
    issued: { 'date-parts': [[2024]] },
    publisher: 'Academic Press'
  }, ['methodology', 'textbook']);

  console.log('Created entry:', entry.formatted);

  // Format in different styles
  console.log('\nFormatted in APA:', bibliographyService.formatCitation(entry.citation, 'apa'));
  console.log('Formatted in MLA:', bibliographyService.formatCitation(entry.citation, 'mla'));

  // Generate in-text citation
  const inText = bibliographyService.generateInTextCitation(entry.citation, 'apa', { page: '42' });
  console.log('In-text citation:', inText);

  // Search entries
  const results = bibliographyService.searchEntries('machine learning');
  console.log(`\nSearch found ${results.length} entries`);

  // Export to RIS
  const allEntries = bibliographyService.getAllEntries();
  const risExport = bibliographyService.exportBibliography(allEntries, 'ris');
  console.log('\nRIS Export:\n', risExport.substring(0, 200) + '...');
}

// ============================================================================
// Example 2: Document Parsing
// ============================================================================

async function documentParsingExample() {
  console.log('\n\n=== Document Parsing ===\n');

  // Parse plain text
  const sampleText = `
    This is the first paragraph of our sample document.
    It contains multiple sentences. Each sentence will be parsed separately.

    This is the second paragraph. It discusses different concepts.
    The parser will extract both paragraphs and sentences.

    The third paragraph demonstrates the parsing capabilities.
  `;

  const parsed = documentParserService.parseText(sampleText.trim(), {
    minParagraphLength: 10,
    minSentenceLength: 5
  });

  console.log('Document Statistics:');
  console.log(`- Paragraphs: ${parsed.paragraphs.length}`);
  console.log(`- Sentences: ${parsed.sentences.length}`);
  console.log(`- Words: ${parsed.metadata.wordCount}`);
  console.log(`- Characters: ${parsed.metadata.characterCount}`);

  console.log('\nParagraphs:');
  parsed.paragraphs.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.id}: "${p.text.substring(0, 50)}..."`);
    console.log(`     Sentences: ${p.sentences.length}`);
  });

  console.log('\nFirst paragraph sentences:');
  parsed.paragraphs[0].sentences.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.id}: "${s.text}"`);
  });

  // Validate document
  const validation = documentParserService.validateDocument(parsed);
  console.log('\nValidation:', validation.valid ? 'PASS' : 'FAIL');
  if (validation.errors.length > 0) {
    console.log('Errors:', validation.errors);
  }
}

// ============================================================================
// Example 3: Annotation Management
// ============================================================================

function annotationExample() {
  console.log('\n\n=== Annotation Management ===\n');

  const documentId = 'doc-123';
  const userId = 'user-456';

  // Create different annotation types

  // 1. Simple highlight
  const highlight = annotationService.createAnnotation({
    documentId,
    userId,
    target: { type: 'paragraph', id: 'p-0001' },
    type: 'highlight',
    color: 'yellow',
    tags: ['important'],
    isPrivate: false
  });
  console.log('Created highlight:', highlight.id);

  // 2. Note annotation with content
  const note = annotationService.createAnnotation({
    documentId,
    userId,
    target: {
      type: 'range',
      id: 'p-0001',
      range: {
        startOffset: 10,
        endOffset: 50,
        selectedText: 'This is the selected text portion'
      }
    },
    type: 'note',
    content: 'This is an important concept that relates to our research question.',
    color: 'blue',
    tags: ['research-question', 'methodology'],
    isPrivate: true,
    metadata: {
      importance: 5,
      reviewed: false
    }
  });
  console.log('Created note:', note.id);

  // 3. Citation annotation
  const citation = annotationService.createAnnotation({
    documentId,
    userId,
    target: { type: 'paragraph', id: 'p-0002' },
    type: 'citation',
    content: 'Reference to Smith et al. 2023',
    color: 'green',
    tags: ['literature-review'],
    isPrivate: false,
    metadata: {
      citationId: 'bib-001'
    }
  });
  console.log('Created citation:', citation.id);

  // 4. Question annotation
  const question = annotationService.createAnnotation({
    documentId,
    userId,
    target: { type: 'sentence', id: 's-000005' },
    type: 'question',
    content: 'How does this relate to previous research?',
    color: 'pink',
    tags: ['needs-clarification'],
    isPrivate: false
  });
  console.log('Created question:', question.id);

  // Get all annotations for document
  const allAnnotations = annotationService.getDocumentAnnotations(documentId);
  console.log(`\nTotal annotations for document: ${allAnnotations.length}`);

  // Filter annotations
  const highlights = annotationService.getDocumentAnnotations(documentId, {
    types: ['highlight']
  });
  console.log(`Highlights: ${highlights.length}`);

  const importantNotes = annotationService.getDocumentAnnotations(documentId, {
    types: ['note'],
    importance: [4, 5]
  });
  console.log(`Important notes: ${importantNotes.length}`);

  // Search annotations
  const searchResults = annotationService.searchAnnotations('research', documentId);
  console.log(`Search results for "research": ${searchResults.length}`);

  // Add tags
  annotationService.addTags(note.id, ['chapter-3', 'key-finding']);
  console.log('Added tags to note');

  // Create annotation group
  const group = annotationService.createGroup(
    'Methodology Section',
    [note.id, question.id],
    {
      description: 'Annotations related to research methodology',
      color: 'blue'
    }
  );
  console.log('Created annotation group:', group.id);

  // Get statistics
  const stats = annotationService.getStatistics(documentId);
  console.log('\nAnnotation Statistics:');
  console.log(`- Total: ${stats.total}`);
  console.log('- By Type:', JSON.stringify(stats.byType, null, 2));
  console.log('- By Color:', JSON.stringify(stats.byColor, null, 2));
  console.log('- By Tag:', JSON.stringify(stats.byTag, null, 2));
  console.log(`- Average per paragraph: ${stats.averagePerParagraph.toFixed(2)}`);

  // Export annotations
  const exported = annotationService.exportToJSON(documentId);
  console.log('\nExported annotations (truncated):');
  console.log(exported.substring(0, 200) + '...');
}

// ============================================================================
// Example 4: ML Embeddings (if initialized)
// ============================================================================

async function embeddingExample() {
  console.log('\n\n=== ML Embeddings ===\n');

  // Note: This example requires TensorFlow.js model to be loaded
  // Uncomment and run if ML features are needed

  /*
  import { getEmbeddingService } from '../src/services/ml';

  const embeddingService = getEmbeddingService();

  console.log('Initializing embedding service...');
  await embeddingService.initialize();
  console.log('Service initialized!');

  // Generate single embedding
  const text = 'Machine learning is transforming research.';
  const embedding = await embeddingService.embed(text);
  console.log(`Generated embedding for: "${text}"`);
  console.log(`Vector dimensions: ${embedding.vector.length}`);
  console.log(`Model version: ${embedding.modelVersion}`);

  // Batch embedding
  const texts = [
    'First paragraph about data analysis.',
    'Second paragraph discusses methodology.',
    'Third paragraph presents results.'
  ];

  console.log('\nGenerating batch embeddings...');
  const result = await embeddingService.embedBatch(texts);
  console.log(`Generated ${result.embeddings.length} embeddings`);
  console.log(`Cached: ${result.cached}, Computed: ${result.computed}`);
  console.log(`Duration: ${result.duration.toFixed(2)}ms`);

  // Calculate similarity
  import { calculateCosineSimilarity } from '../src/services/ml/similarity';

  const similarity = calculateCosineSimilarity(
    result.embeddings[0].vector,
    result.embeddings[1].vector
  );
  console.log(`\nSimilarity between texts 1 and 2: ${(similarity * 100).toFixed(1)}%`);
  */
}

// ============================================================================
// Example 5: Complete Workflow
// ============================================================================

async function completeWorkflowExample() {
  console.log('\n\n=== Complete Research Workflow ===\n');

  // Step 1: Import bibliography
  console.log('Step 1: Importing bibliography...');
  const bibtex = `
    @article{example2024,
      title={Example Research},
      author={Author, First},
      year={2024},
      journal={Example Journal}
    }
  `;
  const bibEntries = await bibliographyService.importBibliography(bibtex, 'bibtex');
  console.log(`✓ Imported ${bibEntries.length} bibliography entries`);

  // Step 2: Parse document
  console.log('\nStep 2: Parsing document...');
  const documentText = `
    This research explores machine learning applications.
    It builds on previous work by Smith et al.

    Our methodology involves collecting data from multiple sources.
    The analysis reveals interesting patterns.
  `;
  const parsed = documentParserService.parseText(documentText.trim());
  console.log(`✓ Parsed ${parsed.paragraphs.length} paragraphs, ${parsed.sentences.length} sentences`);

  // Step 3: Create annotations
  console.log('\nStep 3: Creating annotations...');
  const annotations = [];

  // Highlight key concept
  annotations.push(annotationService.createAnnotation({
    documentId: 'research-doc-1',
    userId: 'researcher-1',
    target: { type: 'paragraph', id: parsed.paragraphs[0].id },
    type: 'main_idea',
    content: 'Core research focus',
    color: 'orange',
    tags: ['thesis', 'chapter-1'],
    isPrivate: false
  }));

  // Add citation reference
  annotations.push(annotationService.createAnnotation({
    documentId: 'research-doc-1',
    userId: 'researcher-1',
    target: { type: 'paragraph', id: parsed.paragraphs[0].id },
    type: 'citation',
    content: 'Cites Smith et al.',
    color: 'green',
    tags: ['literature-review'],
    isPrivate: false,
    metadata: { citationId: bibEntries[0].id }
  }));

  // Mark methodology section
  annotations.push(annotationService.createAnnotation({
    documentId: 'research-doc-1',
    userId: 'researcher-1',
    target: { type: 'paragraph', id: parsed.paragraphs[1].id },
    type: 'definition',
    content: 'Research methodology',
    color: 'purple',
    tags: ['methodology'],
    isPrivate: false
  }));

  console.log(`✓ Created ${annotations.length} annotations`);

  // Step 4: Generate statistics
  console.log('\nStep 4: Generating statistics...');
  const stats = annotationService.getStatistics('research-doc-1');
  console.log(`✓ Total annotations: ${stats.total}`);
  console.log(`✓ Types: ${Object.keys(stats.byType).join(', ')}`);
  console.log(`✓ Tags: ${Object.keys(stats.byTag).join(', ')}`);

  // Step 5: Export results
  console.log('\nStep 5: Exporting results...');
  const annotationExport = annotationService.exportToJSON('research-doc-1');
  const bibliographyExport = bibliographyService.exportBibliography(bibEntries, 'bibtex');
  console.log('✓ Exported annotations and bibliography');

  console.log('\n✅ Workflow complete!');
}

// ============================================================================
// Run Examples
// ============================================================================

async function runExamples() {
  try {
    await bibliographyExample();
    await documentParsingExample();
    annotationExample();
    // await embeddingExample(); // Uncomment if ML features needed
    await completeWorkflowExample();

    console.log('\n\n🎉 All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runExamples();
}

// Export for use in other files
export {
  bibliographyExample,
  documentParsingExample,
  annotationExample,
  embeddingExample,
  completeWorkflowExample
};
