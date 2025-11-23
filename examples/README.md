# Code Examples

This directory contains working code examples demonstrating how to use the Close Reading Platform services.

## Available Examples

### [basic-usage.ts](./basic-usage.ts)

Comprehensive examples covering:
- Bibliography management (import, export, formatting)
- Document parsing (multiple formats)
- Annotation creation and management
- ML embeddings and similarity
- Complete research workflow

**Run with:**
```bash
npm install -g tsx
tsx examples/basic-usage.ts
```

### [custom-integration/](./custom-integration/)

Examples for extending the platform:
- Custom AI provider integration
- New annotation type
- Custom export format
- Plugin skeleton

## Quick Start

### 1. Bibliography Management

```typescript
import { bibliographyService } from '@/services';

// Import from BibTeX
const entries = await bibliographyService.importBibliography(bibtexString, 'bibtex');

// Format citation
const formatted = bibliographyService.formatCitation(entries[0].citation, 'apa');

// Generate in-text citation
const inText = bibliographyService.generateInTextCitation(
  entries[0].citation,
  'apa',
  { page: '42' }
);
```

### 2. Document Parsing

```typescript
import { documentParserService } from '@/services';

// Parse file
const file = new File([content], 'document.pdf');
const parsed = await documentParserService.parseDocument(file);

// Or parse text directly
const parsed = documentParserService.parseText(textContent);

// Access structure
console.log(`${parsed.paragraphs.length} paragraphs`);
console.log(`${parsed.sentences.length} sentences`);
```

### 3. Annotations

```typescript
import { annotationService } from '@/services';

// Create highlight
const annotation = annotationService.createAnnotation({
  documentId: 'doc-123',
  userId: 'user-456',
  target: { type: 'paragraph', id: 'p-0001' },
  type: 'highlight',
  color: 'yellow',
  tags: ['important'],
  isPrivate: false
});

// Create note with range
const note = annotationService.createAnnotation({
  documentId: 'doc-123',
  userId: 'user-456',
  target: {
    type: 'range',
    id: 'p-0001',
    range: {
      startOffset: 10,
      endOffset: 50,
      selectedText: 'Selected text'
    }
  },
  type: 'note',
  content: 'My note content',
  color: 'blue',
  tags: ['research-question'],
  isPrivate: true
});

// Query annotations
const annotations = annotationService.getDocumentAnnotations('doc-123');
const highlights = annotationService.getDocumentAnnotations('doc-123', {
  types: ['highlight']
});

// Search
const results = annotationService.searchAnnotations('important concept', 'doc-123');
```

### 4. ML Embeddings

```typescript
import { getEmbeddingService } from '@/services/ml';

const embeddingService = getEmbeddingService();
await embeddingService.initialize();

// Single embedding
const embedding = await embeddingService.embed('Text to embed');

// Batch (more efficient)
const result = await embeddingService.embedBatch([
  'First text',
  'Second text',
  'Third text'
]);

console.log(`Generated ${result.embeddings.length} embeddings`);
console.log(`Cached: ${result.cached}, Computed: ${result.computed}`);
```

### 5. Similarity Search

```typescript
import { calculateCosineSimilarity, findMostSimilar } from '@/services/ml/similarity';

// Calculate similarity between two embeddings
const similarity = calculateCosineSimilarity(
  embedding1.vector,
  embedding2.vector
);

// Find most similar paragraphs
const results = findMostSimilar(
  queryEmbedding.vector,
  paragraphEmbeddings.map(e => e.vector),
  10  // top 10 results
);

results.forEach(({ index, similarity }) => {
  console.log(`Paragraph ${index}: ${(similarity * 100).toFixed(1)}% similar`);
});
```

## Running Examples

### Prerequisites

```bash
npm install
```

### Run Individual Examples

```bash
# Using tsx (recommended)
npm install -g tsx
tsx examples/basic-usage.ts

# Or compile and run
npx tsc examples/basic-usage.ts
node examples/basic-usage.js
```

### Run in Development Server

Import examples in your app:

```typescript
import { bibliographyExample, annotationExample } from './examples/basic-usage';

// Run in component
useEffect(() => {
  bibliographyExample();
}, []);
```

## Example Structure

Each example demonstrates:
1. **Setup**: Initializing services
2. **Usage**: Common operations
3. **Error Handling**: Proper error handling patterns
4. **Cleanup**: Resource cleanup when needed

## More Examples

See full documentation:
- [API Reference](../docs/API_REFERENCE.md)
- [Developer Guide](../docs/DEVELOPER_GUIDE.md)
- [Integration Guide](../docs/INTEGRATION_GUIDE.md)

## Contributing Examples

To add an example:

1. Create new file in `examples/`
2. Follow existing patterns
3. Include comments explaining each step
4. Add error handling
5. Update this README
6. Test thoroughly

## Support

- GitHub Issues: Report problems with examples
- Discussions: Ask questions about usage
- Documentation: Full API reference available

---

**Last Updated:** November 11, 2025
