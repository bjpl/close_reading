# API Reference

**Version:** 0.1.0
**Last Updated:** November 11, 2025

Complete API reference for the Close Reading Platform services, components, and utilities.

## Table of Contents

- [Core Services](#core-services)
  - [BibliographyService](#bibliographyservice)
  - [DocumentParserService](#documentparserservice)
  - [AnnotationService](#annotationservice)
- [ML Services](#ml-services)
  - [EmbeddingService](#embeddingservice)
  - [SimilarityService](#similarityservice)
  - [LinkSuggestionService](#linksuggestionservice)
- [Citation Services](#citation-services)
- [Utility Services](#utility-services)
- [Type Definitions](#type-definitions)
- [Error Handling](#error-handling)

---

## Core Services

### BibliographyService

Comprehensive citation and bibliography management using citation-js.

#### Import

```typescript
import { BibliographyService, bibliographyService } from '@/services';
```

#### Constructor

```typescript
const service = new BibliographyService(defaultStyle?: CitationStyle);
```

**Parameters:**
- `defaultStyle` (optional): Default citation style ('apa' | 'mla' | 'chicago' | 'harvard' | 'vancouver')

#### Methods

##### `importBibliography(data: string, format: CitationFormat): Promise<BibliographyEntry[]>`

Import bibliography from various formats.

**Parameters:**
- `data`: Bibliography data as string
- `format`: 'bibtex' | 'biblatex' | 'ris' | 'json' | 'csl-json'

**Returns:** Promise<BibliographyEntry[]>

**Throws:** Error if parsing fails

**Example:**
```typescript
const bibtex = `@article{smith2023,
  title={Research Methods},
  author={Smith, John},
  year={2023}
}`;

const entries = await bibliographyService.importBibliography(bibtex, 'bibtex');
console.log(`Imported ${entries.length} entries`);
```

##### `exportBibliography(entries: BibliographyEntry[], format: CitationFormat): string`

Export bibliography to specified format.

**Parameters:**
- `entries`: Array of bibliography entries to export
- `format`: Target format

**Returns:** Formatted bibliography string

**Example:**
```typescript
const entries = bibliographyService.getAllEntries();
const ris = bibliographyService.exportBibliography(entries, 'ris');
```

##### `formatCitation(citation: Citation, style: CitationStyle): string`

Format a single citation in specified style.

**Parameters:**
- `citation`: Citation object
- `style`: Citation style

**Returns:** Formatted citation string

**Example:**
```typescript
const formatted = bibliographyService.formatCitation(citation, 'apa');
// Output: "Smith, J. (2023). Research Methods."
```

##### `createEntry(citation: Partial<Citation>, tags?: string[], notes?: string): BibliographyEntry`

Create a new citation entry.

**Parameters:**
- `citation`: Partial citation data
- `tags` (optional): Tags for categorization
- `notes` (optional): Additional notes

**Returns:** Created bibliography entry

**Example:**
```typescript
const entry = bibliographyService.createEntry({
  type: 'article',
  title: 'Machine Learning Fundamentals',
  author: [{ given: 'Jane', family: 'Doe' }],
  issued: { 'date-parts': [[2024]] }
}, ['ml', 'research'], 'Key reference for chapter 3');
```

##### `updateEntry(id: string, updates: Partial<BibliographyEntry>): BibliographyEntry | null`

Update an existing citation entry.

**Parameters:**
- `id`: Entry ID
- `updates`: Partial updates to apply

**Returns:** Updated entry or null if not found

##### `deleteEntry(id: string): boolean`

Delete a citation entry.

**Parameters:**
- `id`: Entry ID

**Returns:** True if deleted, false if not found

##### `getEntry(id: string): BibliographyEntry | null`

Get entry by ID.

##### `getAllEntries(): BibliographyEntry[]`

Get all bibliography entries.

##### `searchEntries(query: string): BibliographyEntry[]`

Search entries by query (searches title, authors, abstract, tags, notes).

**Parameters:**
- `query`: Search query string

**Returns:** Matching entries

**Example:**
```typescript
const results = bibliographyService.searchEntries('machine learning');
```

##### `filterByTags(tags: string[]): BibliographyEntry[]`

Filter entries by tags.

**Parameters:**
- `tags`: Array of tags to filter by

**Returns:** Entries matching any of the tags

##### `generateInTextCitation(citation: Citation, style: CitationStyle, options?: {page?: string, year?: number}): string`

Generate in-text citation.

**Parameters:**
- `citation`: Citation object
- `style`: Citation style
- `options` (optional): Page numbers, year override

**Returns:** In-text citation string

**Example:**
```typescript
const inText = bibliographyService.generateInTextCitation(
  citation,
  'apa',
  { page: '42' }
);
// Output: "(Smith, 2023, p. 42)"
```

##### `setDefaultStyle(style: CitationStyle): void`

Set default citation style.

##### `clear(): void`

Clear all entries.

##### `getStatistics(): object`

Get bibliography statistics including total entries, type breakdown, and date ranges.

#### Types

```typescript
type CitationFormat = 'bibtex' | 'biblatex' | 'ris' | 'json' | 'csl-json';
type CitationStyle = 'apa' | 'mla' | 'chicago' | 'harvard' | 'vancouver';

interface Citation {
  id: string;
  type: string;
  title: string;
  author?: Array<{ given?: string; family: string }>;
  issued?: { 'date-parts': number[][] };
  publisher?: string;
  page?: string;
  volume?: string;
  issue?: string;
  DOI?: string;
  URL?: string;
  ISBN?: string;
  ISSN?: string;
  abstract?: string;
  [key: string]: any;
}

interface BibliographyEntry {
  id: string;
  citation: Citation;
  formatted: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  notes?: string;
}
```

---

### DocumentParserService

Parse various document formats into structured text for analysis.

#### Import

```typescript
import { DocumentParserService, documentParserService } from '@/services';
```

#### Constructor

```typescript
const service = new DocumentParserService();
```

#### Methods

##### `parseDocument(file: File, options?: Partial<ParserOptions>): Promise<ParsedDocument>`

Parse a document file.

**Parameters:**
- `file`: File object to parse
- `options` (optional): Parser configuration options

**Returns:** Promise<ParsedDocument>

**Throws:** Error if parsing fails or format unsupported

**Supported Formats:** PDF, DOCX, TXT, Markdown, HTML

**Example:**
```typescript
const file = new File([blob], 'document.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

const parsed = await documentParserService.parseDocument(file, {
  minParagraphLength: 20,
  minSentenceLength: 10,
  extractMetadata: true
});

console.log(`Parsed ${parsed.paragraphs.length} paragraphs`);
console.log(`Extracted ${parsed.sentences.length} sentences`);
console.log(`Word count: ${parsed.metadata.wordCount}`);
```

##### `parseText(text: string, options?: Partial<ParserOptions>): ParsedDocument`

Parse plain text string into document structure.

**Parameters:**
- `text`: Raw text content
- `options` (optional): Parser configuration

**Returns:** ParsedDocument

**Example:**
```typescript
const text = "Paragraph one.\n\nParagraph two. With sentences.";
const parsed = documentParserService.parseText(text);
```

##### `validateDocument(document: ParsedDocument): {valid: boolean, errors: string[]}`

Validate a parsed document structure.

**Parameters:**
- `document`: Parsed document to validate

**Returns:** Validation result with errors array

**Example:**
```typescript
const validation = documentParserService.validateDocument(parsed);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

#### Parser Options

```typescript
interface ParserOptions {
  minParagraphLength?: number;      // Default: 10
  minSentenceLength?: number;       // Default: 5
  preserveWhitespace?: boolean;     // Default: false
  extractMetadata?: boolean;        // Default: true
  sanitizeHTML?: boolean;           // Default: true
}
```

#### Types

```typescript
type DocumentFormat = 'pdf' | 'docx' | 'txt' | 'md' | 'html';

interface ParsedDocument {
  metadata: DocumentMetadata;
  paragraphs: ParsedParagraph[];
  sentences: ParsedSentence[];
  rawText: string;
}

interface DocumentMetadata {
  title?: string;
  author?: string;
  createdDate?: Date;
  modifiedDate?: Date;
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  language?: string;
  format: DocumentFormat;
}

interface ParsedParagraph {
  id: string;                // Format: "p-0000"
  text: string;
  order: number;
  sentences: ParsedSentence[];
  metadata?: {
    startOffset: number;
    endOffset: number;
    heading?: string;
    style?: string;
  };
}

interface ParsedSentence {
  id: string;                // Format: "s-000000"
  text: string;
  paragraphId: string;
  order: number;
  startOffset: number;
  endOffset: number;
}
```

---

### AnnotationService

Comprehensive annotation and highlighting system for research documents.

#### Import

```typescript
import { AnnotationService, annotationService } from '@/services';
```

#### Constructor

```typescript
const service = new AnnotationService();
```

#### Methods

##### `createAnnotation(data: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Annotation`

Create a new annotation.

**Parameters:**
- `data`: Annotation data without system fields

**Returns:** Created annotation with generated ID and timestamps

**Example:**
```typescript
const annotation = annotationService.createAnnotation({
  documentId: 'doc-123',
  userId: 'user-456',
  target: {
    type: 'paragraph',
    id: 'p-0001'
  },
  type: 'highlight',
  color: 'yellow',
  tags: ['important', 'methodology'],
  isPrivate: false
});
```

**With Range Selection:**
```typescript
const annotation = annotationService.createAnnotation({
  documentId: 'doc-123',
  userId: 'user-456',
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
  content: 'Key concept for my research',
  color: 'blue',
  tags: ['research-question'],
  isPrivate: true
});
```

##### `updateAnnotation(id: string, updates: Partial<Annotation>): Annotation | null`

Update an existing annotation.

**Parameters:**
- `id`: Annotation ID
- `updates`: Partial updates to apply

**Returns:** Updated annotation or null if not found

##### `deleteAnnotation(id: string): boolean`

Delete an annotation.

##### `getAnnotation(id: string): Annotation | null`

Get annotation by ID.

##### `getDocumentAnnotations(documentId: string, filter?: AnnotationFilter): Annotation[]`

Get all annotations for a document with optional filtering.

**Parameters:**
- `documentId`: Document ID
- `filter` (optional): Filter criteria

**Returns:** Array of annotations

**Example:**
```typescript
// Get all annotations
const all = annotationService.getDocumentAnnotations('doc-123');

// Get only highlights
const highlights = annotationService.getDocumentAnnotations('doc-123', {
  types: ['highlight']
});

// Get annotations by color and tags
const filtered = annotationService.getDocumentAnnotations('doc-123', {
  colors: ['yellow', 'green'],
  tags: ['important']
});
```

##### `getParagraphAnnotations(paragraphId: string): Annotation[]`

Get annotations for a specific paragraph.

##### `searchAnnotations(query: string, documentId?: string): Annotation[]`

Search annotations by content, selected text, or tags.

**Parameters:**
- `query`: Search query
- `documentId` (optional): Limit search to document

**Returns:** Matching annotations

##### `applyFilter(annotations: Annotation[], filter: AnnotationFilter): Annotation[]`

Filter annotations by criteria.

**Filter Options:**
- `types`: Array of annotation types
- `colors`: Array of colors
- `tags`: Array of tags
- `userId`: User ID
- `dateRange`: {start: Date, end: Date}
- `importance`: Array of importance ratings (1-5)
- `reviewed`: Boolean

##### `getStatistics(documentId?: string): AnnotationStatistics`

Get annotation statistics.

**Returns:**
```typescript
{
  total: number;
  byType: Record<AnnotationType, number>;
  byColor: Record<HighlightColor, number>;
  byTag: Record<string, number>;
  averagePerParagraph: number;
  mostAnnotatedParagraphs: Array<{paragraphId: string, count: number}>;
}
```

##### `createGroup(name: string, annotationIds: string[], options?: object): AnnotationGroup`

Create annotation group for related annotations.

**Parameters:**
- `name`: Group name
- `annotationIds`: Annotations to include
- `options`: {description?: string, color?: HighlightColor}

##### `getAllGroups(): AnnotationGroup[]`

Get all annotation groups.

##### `addTags(id: string, tags: string[]): Annotation | null`

Add tags to annotation.

##### `removeTags(id: string, tags: string[]): Annotation | null`

Remove tags from annotation.

##### `exportToJSON(documentId?: string): string`

Export annotations to JSON string.

##### `importFromJSON(json: string): number`

Import annotations from JSON string. Returns count of imported annotations.

##### `clear(): void`

Clear all annotations.

#### Types

```typescript
type AnnotationType =
  | 'highlight'
  | 'note'
  | 'main_idea'
  | 'citation'
  | 'question'
  | 'critical'
  | 'definition'
  | 'example'
  | 'summary';

type HighlightColor =
  | 'yellow'
  | 'green'
  | 'blue'
  | 'pink'
  | 'orange'
  | 'purple'
  | 'red'
  | 'gray';

interface Annotation {
  id: string;
  documentId: string;
  userId: string;
  target: AnnotationTarget;
  type: AnnotationType;
  content?: string;
  color: HighlightColor;
  tags: string[];
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    citationId?: string;
    importance?: 1 | 2 | 3 | 4 | 5;
    reviewed?: boolean;
    [key: string]: any;
  };
}

interface AnnotationTarget {
  type: 'paragraph' | 'sentence' | 'range';
  id: string;
  range?: SelectionRange;
}

interface SelectionRange {
  startOffset: number;
  endOffset: number;
  selectedText: string;
}
```

---

## ML Services

### EmbeddingService

Generate sentence embeddings for semantic similarity using TensorFlow.js Universal Sentence Encoder.

#### Import

```typescript
import { getEmbeddingService } from '@/services/ml';
```

#### Usage

```typescript
const embeddingService = getEmbeddingService();

// Initialize (automatic on first use)
await embeddingService.initialize();

// Generate single embedding
const embedding = await embeddingService.embed('This is a sample sentence.');
console.log(`Vector dimensions: ${embedding.vector.length}`);

// Batch processing (more efficient)
const texts = ['Sentence one.', 'Sentence two.', 'Sentence three.'];
const result = await embeddingService.embedBatch(texts);
console.log(`Cached: ${result.cached}, Computed: ${result.computed}`);
console.log(`Duration: ${result.duration}ms`);
```

#### Methods

##### `initialize(): Promise<void>`

Initialize the embedding model. Called automatically on first use.

##### `embed(text: string): Promise<EmbeddingVector>`

Generate embedding for a single text. Results are automatically cached.

##### `embedBatch(texts: string[]): Promise<BatchEmbeddingResult>`

Generate embeddings for multiple texts efficiently. Uses caching.

##### `clearCache(): Promise<void>`

Clear all cached embeddings.

##### `getCacheStats(): Promise<object>`

Get cache statistics.

##### `isReady(): boolean`

Check if model is initialized and ready.

##### `dispose(): void`

Dispose of the model and free resources.

#### Types

```typescript
interface EmbeddingVector {
  text: string;
  vector: number[];
  modelVersion: string;
  timestamp: number;
}

interface BatchEmbeddingResult {
  embeddings: EmbeddingVector[];
  cached: number;
  computed: number;
  duration: number;
}
```

---

### SimilarityService

Calculate similarity between text embeddings using cosine similarity.

#### Import

```typescript
import { calculateCosineSimilarity, findMostSimilar } from '@/services/ml/similarity';
```

#### Functions

##### `calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number`

Calculate cosine similarity between two vectors.

**Parameters:**
- `vectorA`: First embedding vector
- `vectorB`: Second embedding vector

**Returns:** Similarity score (0-1, higher is more similar)

**Example:**
```typescript
const similarity = calculateCosineSimilarity(
  embedding1.vector,
  embedding2.vector
);
console.log(`Similarity: ${(similarity * 100).toFixed(1)}%`);
```

##### `findMostSimilar(query: number[], candidates: number[][], topK?: number): Array<{index: number, similarity: number}>`

Find most similar vectors to a query vector.

**Parameters:**
- `query`: Query vector
- `candidates`: Array of candidate vectors
- `topK` (optional): Number of results to return (default: 5)

**Returns:** Array of {index, similarity} sorted by similarity (descending)

**Example:**
```typescript
const results = findMostSimilar(
  queryEmbedding.vector,
  paragraphEmbeddings.map(e => e.vector),
  10
);

results.forEach(({index, similarity}) => {
  console.log(`Paragraph ${index}: ${(similarity * 100).toFixed(1)}% similar`);
});
```

---

### LinkSuggestionService

Suggest paragraph links based on semantic similarity.

#### Import

```typescript
import { LinkSuggestionService } from '@/services/ml';
```

#### Usage

```typescript
const suggestionService = new LinkSuggestionService();

// Generate suggestions for a paragraph
const suggestions = await suggestionService.suggestLinks(
  'p-0001',
  paragraphs,
  { threshold: 0.7, maxSuggestions: 5 }
);

suggestions.forEach(suggestion => {
  console.log(`Suggest linking to ${suggestion.targetId}`);
  console.log(`Similarity: ${(suggestion.score * 100).toFixed(1)}%`);
  console.log(`Reason: ${suggestion.reason}`);
});
```

#### Methods

##### `suggestLinks(paragraphId: string, paragraphs: ParsedParagraph[], options?: object): Promise<LinkSuggestion[]>`

Generate link suggestions for a paragraph.

**Parameters:**
- `paragraphId`: Source paragraph ID
- `paragraphs`: All document paragraphs
- `options`:
  - `threshold`: Minimum similarity score (0-1, default: 0.6)
  - `maxSuggestions`: Maximum suggestions to return (default: 5)
  - `excludeIds`: Paragraph IDs to exclude

**Returns:** Array of link suggestions sorted by score

#### Types

```typescript
interface LinkSuggestion {
  sourceId: string;
  targetId: string;
  score: number;
  reason: string;
  relationshipType?: 'related' | 'contrasts' | 'supports' | 'elaborates';
}
```

---

## Citation Services

### Citation Export

Export citations in multiple formats.

#### Import

```typescript
import {
  exportToBibTeX,
  exportToRIS,
  exportToJSON,
  exportToPlainText,
  formatAPA,
  formatMLA,
  formatChicago
} from '@/services/citation';
```

#### Functions

##### `exportToBibTeX(entries: BibliographyEntry[]): string`

Export to BibTeX format.

##### `exportToRIS(entries: BibliographyEntry[]): string`

Export to RIS format.

##### `exportToJSON(entries: BibliographyEntry[]): string`

Export to JSON format.

##### `exportToPlainText(entries: BibliographyEntry[], style: CitationStyle): string`

Export to plain text with specified citation style.

##### `formatAPA(citation: Citation): string`

Format single citation in APA style.

##### `formatMLA(citation: Citation): string`

Format single citation in MLA style.

##### `formatChicago(citation: Citation): string`

Format single citation in Chicago style.

---

## Utility Services

### Logger

Structured logging service using Pino.

#### Import

```typescript
import { logger } from '@/lib/logger';
```

#### Usage

```typescript
// Log levels
logger.info('Application started');
logger.warn('Connection timeout', { retry: 3 });
logger.error('Failed to parse document', { documentId, error });
logger.debug('Cache hit', { key, value });

// With context
const childLogger = logger.child({ module: 'DocumentParser' });
childLogger.info('Parsing document', { format: 'pdf' });
```

---

## Type Definitions

### Core Database Types

```typescript
interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

interface Project {
  id: string;
  name: string;
  title: string;
  description: string | null;
  user_id: string;
  color: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  is_public?: boolean;
}

interface Document {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  author?: string;
  content: string;
  file_type: 'txt' | 'md' | 'docx' | 'pdf';
  file_url: string;
  paragraphs?: Paragraph[];
  sentences?: Sentence[];
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

interface Paragraph {
  id: string;
  document_id: string;
  content: string;
  position: number;
  order?: number;
  annotations?: Annotation[];
  linkedParagraphs?: string[];
  created_at: string;
}

interface Sentence {
  id: string;
  paragraph_id: string;
  content: string;
  position: number;
  order: number;
  annotations?: Annotation[];
  created_at: string;
}

type RelationshipType = 'related' | 'contrasts' | 'supports' | 'elaborates' | 'quotes';

interface ParagraphLink {
  id: string;
  source_paragraph_id: string;
  target_paragraph_id: string;
  relationship_type: RelationshipType;
  note?: string;
  created_at: string;
  updated_at?: string;
}

type ViewMode = 'original' | 'sentence';
```

---

## Error Handling

All services follow consistent error handling patterns:

### Error Types

```typescript
interface AppError {
  code: string;
  message: string;
  details?: string | Record<string, unknown>;
}
```

### Common Error Codes

- `PARSE_ERROR`: Document parsing failed
- `INVALID_FORMAT`: Unsupported or invalid format
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Data validation failed
- `IMPORT_ERROR`: Import operation failed
- `EXPORT_ERROR`: Export operation failed
- `ML_ERROR`: Machine learning operation failed
- `CACHE_ERROR`: Cache operation failed

### Error Handling Pattern

```typescript
try {
  const result = await service.operation();
} catch (error) {
  if (error instanceof Error) {
    logger.error('Operation failed', {
      message: error.message,
      stack: error.stack
    });
  }
  // Handle error appropriately
}
```

### Validation

Most services include validation methods:

```typescript
// Document validation
const validation = documentParserService.validateDocument(parsed);
if (!validation.valid) {
  console.error('Validation failed:', validation.errors);
}

// Custom validation
function validateAnnotation(annotation: Annotation): boolean {
  return annotation.documentId &&
         annotation.userId &&
         annotation.target.id;
}
```

---

## Performance Considerations

### Caching

- **Embeddings**: Automatically cached in IndexedDB
- **Annotations**: In-memory indexing by document and paragraph
- **Bibliography**: In-memory storage with fast lookups

### Batch Operations

Use batch methods when processing multiple items:

```typescript
// Good: Batch embedding generation
const result = await embeddingService.embedBatch(texts);

// Avoid: Individual calls in loop
for (const text of texts) {
  await embeddingService.embed(text); // Slower
}
```

### Memory Management

```typescript
// Dispose of ML resources when done
embeddingService.dispose();

// Clear caches periodically
await embeddingService.clearCache();
annotationService.clear();
bibliographyService.clear();
```

---

## Best Practices

### Service Instantiation

Use singleton instances for services:

```typescript
// Good: Use provided singleton
import { bibliographyService } from '@/services';

// Avoid: Creating new instances
const service = new BibliographyService(); // Creates separate state
```

### Type Safety

Always use TypeScript types:

```typescript
// Good: Typed parameters
const annotation: Annotation = annotationService.createAnnotation(data);

// Avoid: Any types
const annotation: any = annotationService.createAnnotation(data);
```

### Error Handling

Always handle errors:

```typescript
// Good: Try-catch with logging
try {
  const parsed = await documentParserService.parseDocument(file);
} catch (error) {
  logger.error('Parse failed', { error, filename: file.name });
  throw error;
}

// Avoid: Unhandled errors
const parsed = await documentParserService.parseDocument(file); // May throw
```

### Async/Await

Use async/await for cleaner code:

```typescript
// Good: Async/await
async function processDocument(file: File) {
  const parsed = await documentParserService.parseDocument(file);
  return parsed;
}

// Avoid: Promise chains
function processDocument(file: File) {
  return documentParserService.parseDocument(file)
    .then(parsed => parsed);
}
```

---

## Version History

- **0.1.0** (2025-11-11): Initial API reference
  - Core services (Bibliography, Parser, Annotation)
  - ML services (Embeddings, Similarity, Link Suggestions)
  - Citation services
  - Type definitions

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/close_reading/issues)
- **Documentation**: [docs/](../docs/)
- **Examples**: [examples/](../examples/)

---

**Last Updated:** November 11, 2025
**Version:** 0.1.0
