# Semantic Search Quick Start Guide

## 5-Minute Setup

### 1. Download the Model

```bash
cd /path/to/close_reading
mkdir -p public/models
wget https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model.onnx \
  -O public/models/all-MiniLM-L6-v2.onnx
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Basic Usage

```typescript
import { getSemanticSearchService } from '@/services/ml';

// Initialize
const searchService = getSemanticSearchService();
await searchService.initialize();

// Index a document
await searchService.indexDocument('doc-1', [
  { id: 'p1', text: 'Your paragraph text here', position: 1 },
  { id: 'p2', text: 'Another paragraph', position: 2 },
]);

// Search
const results = await searchService.search('your search query', {
  threshold: 0.5,  // 0.0-1.0 similarity threshold
  topK: 10,        // number of results
});
```

## Common Use Cases

### Find Similar Content

```typescript
const passages = await searchService.findSimilarPassages(
  'Text you want to find similar content for',
  { threshold: 0.6, topK: 5 }
);
```

### Cross-Document Links

```typescript
const links = await searchService.findCrossDocumentLinks(
  ['doc-1', 'doc-2'],
  0.7  // similarity threshold
);
```

### Enhanced Link Suggestions

```typescript
import { getLinkSuggestions } from '@/services/linkSuggestions';

const suggestions = await getLinkSuggestions(documentId, userId);
// Now uses ONNX semantic embeddings automatically!
```

## UI Components

```tsx
import {
  SemanticSearchPanel,
  SimilarPassagesPanel,
  EmbeddingProgressIndicator
} from '@/components/semantic-search';

// Search panel
<SemanticSearchPanel
  documentId="doc-1"
  onResultClick={(result) => console.log(result)}
/>

// Similar passages
<SimilarPassagesPanel
  sourceText="Selected text"
  documentId="doc-1"
  onLinkCreate={(passage) => console.log(passage)}
/>

// Progress indicator
<EmbeddingProgressIndicator progress={indexingProgress} />
```

## Performance Tips

1. **Use caching**: Cache hit rate >90% after warmup
2. **Batch operations**: Use `embedBatch()` for multiple texts
3. **Adjust threshold**: Lower = more results, higher = better quality
4. **Index once**: Store vectors, search many times

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Model not loading | Check path: `public/models/all-MiniLM-L6-v2.onnx` |
| Slow first search | Normal - WASM initialization takes 2-5s |
| Low similarity scores | Try threshold 0.3-0.5 for initial testing |
| Memory errors | Use quantized model (23MB vs 80MB) |

## API Reference

See full documentation in:
- `docs/WEEK2_IMPLEMENTATION_SUMMARY.md` - Complete overview
- `docs/ONNX_MODEL_SETUP.md` - Model setup details
- Source files have comprehensive TSDoc comments

## Performance Expectations

- **Embedding**: 30-50ms per text
- **Search (1000 vectors)**: 20-40ms
- **Cache hits**: <1ms
- **First load**: 2-5s (WASM init)

## Next Steps

1. Read `ONNX_MODEL_SETUP.md` for detailed setup
2. Review `WEEK2_IMPLEMENTATION_SUMMARY.md` for architecture
3. Check unit tests for usage examples
4. Experiment with similarity thresholds for your use case
