# 5-Week Modular Architecture Design
# AI Research Platform - Close Reading System

**Version:** 1.0
**Date:** November 11, 2025
**Architect:** System Architect Agent
**Status:** Design Complete

---

## Executive Summary

This document defines a modular, scalable architecture for implementing the AI Research Platform over a 5-week development cycle. The design prioritizes:

- **Modularity**: Clear separation of concerns with well-defined interfaces
- **Scalability**: Horizontal scaling capabilities for future growth
- **Privacy**: Local-first processing with intelligent cloud fallback
- **Performance**: Optimized data flow and caching strategies
- **Maintainability**: Clean architecture patterns and comprehensive documentation

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Week 1: Core Research Library Layer](#2-week-1-core-research-library-layer)
3. [Week 2: Semantic Search Layer](#3-week-2-semantic-search-layer)
4. [Week 3: AI Integration Layer](#4-week-3-ai-integration-layer)
5. [Week 4: Privacy Layer](#5-week-4-privacy-layer)
6. [Week 5: Production Layer](#6-week-5-production-layer)
7. [Cross-Cutting Concerns](#7-cross-cutting-concerns)
8. [Integration Patterns](#8-integration-patterns)
9. [Deployment Strategy](#9-deployment-strategy)
10. [Performance Optimization](#10-performance-optimization)
11. [Security Architecture](#11-security-architecture)
12. [Testing Strategy](#12-testing-strategy)

---

## 1. Architecture Overview

### 1.1 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                          │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐ │
│  │   React UI   │   Zustand    │    React     │   TanStack      │ │
│  │  Components  │    Store     │    Query     │    Router       │ │
│  └──────────────┴──────────────┴──────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      CORE RESEARCH LIBRARY LAYER                    │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐ │
│  │   Document   │   Citation   │  Annotation  │   Project       │ │
│  │   Manager    │   Handler    │   System     │   Manager       │ │
│  └──────────────┴──────────────┴──────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      SEMANTIC SEARCH LAYER                          │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐ │
│  │ ONNX Runtime │  Embedding   │   Vector     │   Similarity    │ │
│  │ Integration  │  Generator   │   Store      │   Engine        │ │
│  └──────────────┴──────────────┴──────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       AI INTEGRATION LAYER                          │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐ │
│  │ Claude API   │   Prompt     │   Response   │   Streaming     │ │
│  │   Client     │  Templates   │    Cache     │   Handler       │ │
│  └──────────────┴──────────────┴──────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          PRIVACY LAYER                              │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐ │
│  │   Ollama     │  Local vs    │   Privacy    │   Data          │ │
│  │ Integration  │Cloud Router  │   Controls   │   Sanitizer     │ │
│  └──────────────┴──────────────┴──────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      DATA PERSISTENCE LAYER                         │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐ │
│  │  Supabase    │   Storage    │  IndexedDB   │   ML Cache      │ │
│  │  PostgreSQL  │    (S3)      │   (Client)   │   (Hybrid)      │ │
│  └──────────────┴──────────────┴──────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Modular Design Principles

**Separation of Concerns**
- Each layer has a single, well-defined responsibility
- Layers communicate through standardized interfaces
- Dependencies flow downward only (no circular dependencies)

**Interface-Based Design**
- All modules expose TypeScript interfaces
- Implementation details hidden behind abstractions
- Easy to swap implementations (e.g., Supabase → Custom Backend)

**Progressive Enhancement**
- Core features work without ML/AI
- Advanced features gracefully degrade
- Offline-first where possible

---

## 2. Week 1: Core Research Library Layer

### 2.1 Document Management Module

**Purpose:** Handle document upload, parsing, storage, and retrieval

**Components:**

```typescript
// Core Interface
interface IDocumentManager {
  uploadDocument(file: File, projectId: string): Promise<Document>;
  parseDocument(document: Document): Promise<ParsedContent>;
  getDocument(documentId: string): Promise<Document>;
  updateDocument(documentId: string, updates: Partial<Document>): Promise<Document>;
  deleteDocument(documentId: string): Promise<void>;
}

// Implementation
class DocumentManager implements IDocumentManager {
  constructor(
    private storage: IStorageService,
    private parser: IDocumentParser,
    private db: IDocumentRepository
  ) {}

  async uploadDocument(file: File, projectId: string): Promise<Document> {
    // 1. Validate file type and size
    this.validateFile(file);

    // 2. Upload to storage
    const storagePath = await this.storage.upload(file, `documents/${projectId}`);

    // 3. Create document record
    const document = await this.db.create({
      projectId,
      title: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath,
      processingStatus: 'pending'
    });

    // 4. Queue for parsing (async)
    this.queueParsing(document.id);

    return document;
  }

  async parseDocument(document: Document): Promise<ParsedContent> {
    try {
      // 1. Download from storage
      const blob = await this.storage.download(document.storagePath);

      // 2. Extract text based on file type
      const text = await this.parser.extractText(blob, document.fileType);

      // 3. Parse into paragraphs and sentences
      const paragraphs = this.parser.parseParagraphs(text);
      const sentences = this.parser.parseSentences(text);

      // 4. Store parsed content
      await this.db.update(document.id, {
        contentText: text,
        paragraphs: JSON.stringify(paragraphs),
        sentences: JSON.stringify(sentences),
        processingStatus: 'completed'
      });

      return { text, paragraphs, sentences };
    } catch (error) {
      await this.db.update(document.id, {
        processingStatus: 'failed',
        processingError: error.message
      });
      throw error;
    }
  }
}
```

**Document Parser Strategy Pattern:**

```typescript
interface IDocumentParser {
  extractText(blob: Blob, fileType: string): Promise<string>;
  parseParagraphs(text: string): Paragraph[];
  parseSentences(text: string): Sentence[];
}

class DocumentParserFactory {
  static createParser(fileType: string): ITextExtractor {
    switch (fileType) {
      case 'application/pdf':
        return new PDFTextExtractor();
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return new DOCXTextExtractor();
      case 'text/plain':
      case 'text/markdown':
        return new PlainTextExtractor();
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }
}

class PDFTextExtractor implements ITextExtractor {
  async extract(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const pdf = await pdfParse(arrayBuffer);
    return pdf.text;
  }
}

class DOCXTextExtractor implements ITextExtractor {
  async extract(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }
}
```

**Paragraph and Sentence Parsing:**

```typescript
class TextParser {
  parseParagraphs(text: string): Paragraph[] {
    // Split on double newlines or paragraph markers
    const paragraphTexts = text.split(/\n\s*\n/);

    return paragraphTexts
      .filter(p => p.trim().length > 0)
      .map((paragraphText, index) => ({
        id: `p${index + 1}`,
        text: paragraphText.trim(),
        order: index,
        sentences: [] // Will be populated by parseSentences
      }));
  }

  parseSentences(text: string): Sentence[] {
    const sentences: Sentence[] = [];
    let sentenceId = 0;
    let globalOffset = 0;

    const paragraphs = this.parseParagraphs(text);

    paragraphs.forEach((paragraph, pIndex) => {
      // Use natural language sentence boundary detection
      const sentenceTexts = this.splitIntoSentences(paragraph.text);

      sentenceTexts.forEach((sentenceText, sIndex) => {
        const sentence: Sentence = {
          id: `s${++sentenceId}`,
          text: sentenceText,
          paragraphId: paragraph.id,
          order: sIndex,
          startOffset: globalOffset,
          endOffset: globalOffset + sentenceText.length
        };

        sentences.push(sentence);
        paragraph.sentences.push(sentence.id);
        globalOffset += sentenceText.length + 1; // +1 for space
      });
    });

    return sentences;
  }

  private splitIntoSentences(text: string): string[] {
    // Use compromise.js for natural sentence boundary detection
    const nlp = require('compromise');
    const doc = nlp(text);
    return doc.sentences().out('array');
  }
}
```

### 2.2 Citation Handling Module

**Purpose:** Manage citation data and export in multiple formats

```typescript
interface ICitationHandler {
  addCitation(citation: CitationInput): Promise<Citation>;
  getCitations(documentId: string): Promise<Citation[]>;
  exportCitations(citations: Citation[], format: ExportFormat): string;
}

class CitationHandler implements ICitationHandler {
  private formatters: Map<ExportFormat, ICitationFormatter>;

  constructor(private db: ICitationRepository) {
    this.formatters = new Map([
      ['bibtex', new BibTeXFormatter()],
      ['ris', new RISFormatter()],
      ['json', new JSONFormatter()]
    ]);
  }

  async addCitation(citation: CitationInput): Promise<Citation> {
    // Validate required fields
    this.validateCitation(citation);

    // Store citation
    return await this.db.create(citation);
  }

  async getCitations(documentId: string): Promise<Citation[]> {
    return await this.db.findByDocument(documentId);
  }

  exportCitations(citations: Citation[], format: ExportFormat): string {
    const formatter = this.formatters.get(format);
    if (!formatter) {
      throw new Error(`Unsupported export format: ${format}`);
    }
    return formatter.format(citations);
  }
}

// Citation Formatters
interface ICitationFormatter {
  format(citations: Citation[]): string;
}

class BibTeXFormatter implements ICitationFormatter {
  format(citations: Citation[]): string {
    return citations.map(citation => {
      const { author, year, title, journal, pages } = citation.data;
      return `@article{${citation.id},
  author = {${author}},
  title = {${title}},
  journal = {${journal}},
  year = {${year}},
  pages = {${pages}}
}`;
    }).join('\n\n');
  }
}

class RISFormatter implements ICitationFormatter {
  format(citations: Citation[]): string {
    return citations.map(citation => {
      const { author, year, title, journal } = citation.data;
      return `TY  - JOUR
AU  - ${author}
TI  - ${title}
JO  - ${journal}
PY  - ${year}
ER  -`;
    }).join('\n\n');
  }
}
```

### 2.3 Annotation System Module

**Purpose:** Create, read, update, delete annotations with type safety

```typescript
interface IAnnotationSystem {
  createAnnotation(data: AnnotationInput): Promise<Annotation>;
  getAnnotations(documentId: string, filters?: AnnotationFilters): Promise<Annotation[]>;
  updateAnnotation(id: string, updates: Partial<Annotation>): Promise<Annotation>;
  deleteAnnotation(id: string): Promise<void>;
  linkAnnotations(sourceId: string, targetId: string): Promise<AnnotationLink>;
}

class AnnotationSystem implements IAnnotationSystem {
  constructor(
    private db: IAnnotationRepository,
    private validator: IAnnotationValidator
  ) {}

  async createAnnotation(data: AnnotationInput): Promise<Annotation> {
    // 1. Validate annotation data
    await this.validator.validate(data);

    // 2. Generate unique ID
    const annotation: Annotation = {
      id: uuid(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 3. Store in database
    await this.db.create(annotation);

    // 4. Emit event for real-time sync
    this.emitAnnotationCreated(annotation);

    return annotation;
  }

  async getAnnotations(
    documentId: string,
    filters?: AnnotationFilters
  ): Promise<Annotation[]> {
    let annotations = await this.db.findByDocument(documentId);

    if (filters) {
      annotations = this.applyFilters(annotations, filters);
    }

    return annotations;
  }

  private applyFilters(
    annotations: Annotation[],
    filters: AnnotationFilters
  ): Annotation[] {
    return annotations.filter(annotation => {
      if (filters.types && !filters.types.includes(annotation.type)) {
        return false;
      }
      if (filters.colors && !filters.colors.includes(annotation.color)) {
        return false;
      }
      if (filters.dateRange) {
        const createdAt = new Date(annotation.createdAt);
        if (createdAt < filters.dateRange.start || createdAt > filters.dateRange.end) {
          return false;
        }
      }
      return true;
    });
  }
}

// Annotation Validator
class AnnotationValidator implements IAnnotationValidator {
  async validate(data: AnnotationInput): Promise<void> {
    // Required fields
    if (!data.documentId) {
      throw new ValidationError('documentId is required');
    }
    if (!data.targetId) {
      throw new ValidationError('targetId is required');
    }
    if (!data.selectedText) {
      throw new ValidationError('selectedText is required');
    }

    // Type validation
    const validTypes = ['highlight', 'note', 'main_idea', 'citation'];
    if (!validTypes.includes(data.type)) {
      throw new ValidationError(`Invalid annotation type: ${data.type}`);
    }

    // Sanitize content (XSS prevention)
    if (data.content) {
      data.content = DOMPurify.sanitize(data.content);
    }
  }
}
```

### 2.4 Project Manager Module

**Purpose:** Organize documents into projects with sharing capabilities

```typescript
interface IProjectManager {
  createProject(data: ProjectInput): Promise<Project>;
  getProjects(userId: string): Promise<Project[]>;
  getProject(projectId: string): Promise<Project>;
  updateProject(projectId: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(projectId: string): Promise<void>;
  shareProject(projectId: string, config: ShareConfig): Promise<ShareLink>;
}

class ProjectManager implements IProjectManager {
  constructor(
    private db: IProjectRepository,
    private shareService: IShareService
  ) {}

  async createProject(data: ProjectInput): Promise<Project> {
    const project: Project = {
      id: uuid(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documentCount: 0
    };

    return await this.db.create(project);
  }

  async shareProject(projectId: string, config: ShareConfig): Promise<ShareLink> {
    // Generate secure share token
    const shareToken = this.shareService.generateToken();

    // Create share link
    const shareLink: ShareLink = {
      id: uuid(),
      projectId,
      token: shareToken,
      expiresAt: config.expiresIn
        ? new Date(Date.now() + config.expiresIn).toISOString()
        : null,
      accessLevel: 'read-only',
      createdAt: new Date().toISOString()
    };

    await this.db.createShareLink(shareLink);

    return shareLink;
  }
}
```

### 2.5 Week 1 Deliverables

**Files Created:**
```
src/
├── modules/
│   ├── documents/
│   │   ├── DocumentManager.ts
│   │   ├── DocumentParser.ts
│   │   ├── TextExtractor.ts
│   │   └── types.ts
│   ├── citations/
│   │   ├── CitationHandler.ts
│   │   ├── CitationFormatters.ts
│   │   └── types.ts
│   ├── annotations/
│   │   ├── AnnotationSystem.ts
│   │   ├── AnnotationValidator.ts
│   │   └── types.ts
│   └── projects/
│       ├── ProjectManager.ts
│       ├── ShareService.ts
│       └── types.ts
└── repositories/
    ├── DocumentRepository.ts
    ├── CitationRepository.ts
    ├── AnnotationRepository.ts
    └── ProjectRepository.ts
```

**Tests:**
```
tests/
├── modules/
│   ├── documents/
│   │   ├── DocumentManager.test.ts
│   │   └── DocumentParser.test.ts
│   ├── citations/
│   │   └── CitationHandler.test.ts
│   ├── annotations/
│   │   └── AnnotationSystem.test.ts
│   └── projects/
│       └── ProjectManager.test.ts
```

**Success Criteria:**
- ✅ Upload PDF, DOCX, TXT files
- ✅ Parse documents into paragraphs and sentences
- ✅ Create and manage annotations
- ✅ Export citations in BibTeX, RIS, JSON
- ✅ Create and share projects
- ✅ 90%+ test coverage

---

## 3. Week 2: Semantic Search Layer

### 3.1 ONNX Runtime Integration

**Purpose:** Run ML models in the browser for embedding generation

```typescript
interface IONNXService {
  loadModel(modelPath: string): Promise<void>;
  generateEmbedding(text: string): Promise<number[]>;
  batchGenerateEmbeddings(texts: string[]): Promise<number[][]>;
  unloadModel(): Promise<void>;
}

class ONNXService implements IONNXService {
  private session: ort.InferenceSession | null = null;
  private tokenizer: Tokenizer;

  constructor() {
    this.tokenizer = new BertTokenizer();
  }

  async loadModel(modelPath: string): Promise<void> {
    // Load ONNX model with WebAssembly backend
    this.session = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm', 'webgl'],
      graphOptimizationLevel: 'all'
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.session) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    // 1. Tokenize text
    const tokens = this.tokenizer.encode(text, {
      maxLength: 512,
      padding: 'max_length',
      truncation: true
    });

    // 2. Create input tensor
    const inputIds = new ort.Tensor('int64', tokens.input_ids, [1, 512]);
    const attentionMask = new ort.Tensor('int64', tokens.attention_mask, [1, 512]);

    // 3. Run inference
    const feeds = {
      input_ids: inputIds,
      attention_mask: attentionMask
    };

    const results = await this.session.run(feeds);

    // 4. Extract embedding (mean pooling of last hidden state)
    const embedding = this.meanPooling(
      results.last_hidden_state.data as Float32Array,
      tokens.attention_mask
    );

    return Array.from(embedding);
  }

  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    // Process in batches of 10 for performance
    const batchSize = 10;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await Promise.all(
        batch.map(text => this.generateEmbedding(text))
      );
      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  private meanPooling(
    hiddenState: Float32Array,
    attentionMask: number[]
  ): Float32Array {
    const embeddingDim = 384; // Sentence-BERT dimension
    const result = new Float32Array(embeddingDim);

    let sumMask = 0;
    for (let i = 0; i < attentionMask.length; i++) {
      if (attentionMask[i] === 1) {
        for (let j = 0; j < embeddingDim; j++) {
          result[j] += hiddenState[i * embeddingDim + j];
        }
        sumMask++;
      }
    }

    // Divide by number of tokens
    for (let j = 0; j < embeddingDim; j++) {
      result[j] /= sumMask;
    }

    return result;
  }
}
```

### 3.2 Embedding Generation and Storage

**Purpose:** Generate and cache embeddings for fast similarity search

```typescript
interface IEmbeddingService {
  generateEmbeddings(documentId: string): Promise<void>;
  getEmbedding(textId: string): Promise<number[] | null>;
  similaritySearch(query: string, documentId: string, topK?: number): Promise<SimilarityResult[]>;
}

class EmbeddingService implements IEmbeddingService {
  constructor(
    private onnxService: IONNXService,
    private cache: IEmbeddingCache,
    private documentRepo: IDocumentRepository
  ) {}

  async generateEmbeddings(documentId: string): Promise<void> {
    // 1. Get document paragraphs
    const document = await this.documentRepo.findById(documentId);
    const paragraphs = JSON.parse(document.paragraphs) as Paragraph[];

    // 2. Check cache for existing embeddings
    const uncachedParagraphs = await this.filterUncached(paragraphs);

    if (uncachedParagraphs.length === 0) {
      return; // All embeddings already cached
    }

    // 3. Generate embeddings in batch
    const texts = uncachedParagraphs.map(p => p.text);
    const embeddings = await this.onnxService.batchGenerateEmbeddings(texts);

    // 4. Store embeddings in cache
    await Promise.all(
      uncachedParagraphs.map((paragraph, index) =>
        this.cache.set(paragraph.id, embeddings[index], documentId)
      )
    );
  }

  async getEmbedding(textId: string): Promise<number[] | null> {
    return await this.cache.get(textId);
  }

  async similaritySearch(
    query: string,
    documentId: string,
    topK: number = 5
  ): Promise<SimilarityResult[]> {
    // 1. Generate query embedding
    const queryEmbedding = await this.onnxService.generateEmbedding(query);

    // 2. Get all paragraph embeddings for document
    const document = await this.documentRepo.findById(documentId);
    const paragraphs = JSON.parse(document.paragraphs) as Paragraph[];

    // 3. Calculate similarities
    const similarities = await Promise.all(
      paragraphs.map(async paragraph => {
        const embedding = await this.cache.get(paragraph.id);
        if (!embedding) {
          throw new Error(`Embedding not found for paragraph ${paragraph.id}`);
        }

        const similarity = this.cosineSimilarity(queryEmbedding, embedding);

        return {
          paragraphId: paragraph.id,
          text: paragraph.text,
          similarity
        };
      })
    );

    // 4. Sort and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
  }

  private async filterUncached(paragraphs: Paragraph[]): Promise<Paragraph[]> {
    const results = await Promise.all(
      paragraphs.map(async p => ({
        paragraph: p,
        cached: await this.cache.has(p.id)
      }))
    );
    return results.filter(r => !r.cached).map(r => r.paragraph);
  }
}
```

### 3.3 Vector Similarity Search Engine

**Purpose:** Efficient in-memory vector search with caching

```typescript
interface IVectorStore {
  addVector(id: string, vector: number[], metadata?: any): void;
  search(queryVector: number[], topK: number, filter?: (meta: any) => boolean): SearchResult[];
  deleteVector(id: string): void;
  clear(): void;
}

class VectorStore implements IVectorStore {
  private vectors: Map<string, VectorEntry> = new Map();
  private index: FlatIndex | null = null;

  addVector(id: string, vector: number[], metadata?: any): void {
    this.vectors.set(id, { id, vector, metadata });
    this.invalidateIndex();
  }

  search(
    queryVector: number[],
    topK: number,
    filter?: (meta: any) => boolean
  ): SearchResult[] {
    // Build index if not exists
    if (!this.index) {
      this.buildIndex();
    }

    // Get all vectors
    let entries = Array.from(this.vectors.values());

    // Apply filter if provided
    if (filter) {
      entries = entries.filter(e => filter(e.metadata));
    }

    // Calculate similarities
    const results = entries.map(entry => ({
      id: entry.id,
      score: this.cosineSimilarity(queryVector, entry.vector),
      metadata: entry.metadata
    }));

    // Sort and return top K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  deleteVector(id: string): void {
    this.vectors.delete(id);
    this.invalidateIndex();
  }

  clear(): void {
    this.vectors.clear();
    this.index = null;
  }

  private buildIndex(): void {
    // For now, use simple flat index
    // Could upgrade to HNSW or IVF for larger datasets
    this.index = new FlatIndex(Array.from(this.vectors.values()));
  }

  private invalidateIndex(): void {
    this.index = null;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (magA * magB);
  }
}

interface VectorEntry {
  id: string;
  vector: number[];
  metadata?: any;
}

interface SearchResult {
  id: string;
  score: number;
  metadata?: any;
}

class FlatIndex {
  constructor(private entries: VectorEntry[]) {}
}
```

### 3.4 Multi-Tier Caching Strategy

**Purpose:** Fast embedding retrieval with IndexedDB and PostgreSQL fallback

```typescript
interface IEmbeddingCache {
  get(textId: string): Promise<number[] | null>;
  set(textId: string, embedding: number[], documentId: string): Promise<void>;
  has(textId: string): Promise<boolean>;
  clear(documentId?: string): Promise<void>;
}

class EmbeddingCache implements IEmbeddingCache {
  private memoryCache: Map<string, number[]> = new Map();
  private idb: IDBPDatabase;

  constructor(
    private supabase: SupabaseClient,
    private maxMemoryCacheSize: number = 1000
  ) {}

  async get(textId: string): Promise<number[] | null> {
    // L1: Memory cache (fastest)
    if (this.memoryCache.has(textId)) {
      return this.memoryCache.get(textId)!;
    }

    // L2: IndexedDB cache (fast)
    const idbResult = await this.getFromIndexedDB(textId);
    if (idbResult) {
      // Promote to L1
      this.setInMemory(textId, idbResult);
      return idbResult;
    }

    // L3: PostgreSQL cache (persistent)
    const dbResult = await this.getFromPostgreSQL(textId);
    if (dbResult) {
      // Promote to L2 and L1
      await this.setInIndexedDB(textId, dbResult);
      this.setInMemory(textId, dbResult);
      return dbResult;
    }

    return null;
  }

  async set(textId: string, embedding: number[], documentId: string): Promise<void> {
    // Write to all cache levels
    await Promise.all([
      this.setInMemory(textId, embedding),
      this.setInIndexedDB(textId, embedding),
      this.setInPostgreSQL(textId, embedding, documentId)
    ]);
  }

  async has(textId: string): Promise<boolean> {
    return (await this.get(textId)) !== null;
  }

  async clear(documentId?: string): Promise<void> {
    this.memoryCache.clear();

    if (documentId) {
      await this.clearIndexedDBByDocument(documentId);
      await this.clearPostgreSQLByDocument(documentId);
    } else {
      await this.clearIndexedDB();
      await this.clearPostgreSQL();
    }
  }

  // L1: Memory Cache
  private setInMemory(textId: string, embedding: number[]): void {
    // Implement LRU eviction
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(textId, embedding);
  }

  // L2: IndexedDB Cache
  private async getFromIndexedDB(textId: string): Promise<number[] | null> {
    const db = await this.getIDB();
    const tx = db.transaction('embeddings', 'readonly');
    const store = tx.objectStore('embeddings');
    const result = await store.get(textId);
    return result?.embedding || null;
  }

  private async setInIndexedDB(textId: string, embedding: number[]): Promise<void> {
    const db = await this.getIDB();
    const tx = db.transaction('embeddings', 'readwrite');
    const store = tx.objectStore('embeddings');
    await store.put({ id: textId, embedding, timestamp: Date.now() });
  }

  private async clearIndexedDB(): Promise<void> {
    const db = await this.getIDB();
    const tx = db.transaction('embeddings', 'readwrite');
    const store = tx.objectStore('embeddings');
    await store.clear();
  }

  // L3: PostgreSQL Cache
  private async getFromPostgreSQL(textId: string): Promise<number[] | null> {
    const { data, error } = await this.supabase
      .from('ml_cache')
      .select('output')
      .eq('input_hash', this.hashTextId(textId))
      .eq('model_type', 'embedding')
      .single();

    if (error || !data) return null;
    return data.output.embedding;
  }

  private async setInPostgreSQL(
    textId: string,
    embedding: number[],
    documentId: string
  ): Promise<void> {
    await this.supabase
      .from('ml_cache')
      .upsert({
        model_type: 'embedding',
        input_hash: this.hashTextId(textId),
        output: { embedding },
        metadata: { documentId, textId }
      });
  }

  private hashTextId(textId: string): string {
    // Simple hash for demo - use crypto.subtle.digest in production
    return btoa(textId);
  }

  private async getIDB(): Promise<IDBPDatabase> {
    if (!this.idb) {
      this.idb = await openDB('ml-cache', 1, {
        upgrade(db) {
          db.createObjectStore('embeddings', { keyPath: 'id' });
        }
      });
    }
    return this.idb;
  }

  private async clearIndexedDBByDocument(documentId: string): Promise<void> {
    // Implementation omitted for brevity
  }

  private async clearPostgreSQLByDocument(documentId: string): Promise<void> {
    await this.supabase
      .from('ml_cache')
      .delete()
      .eq('metadata->>documentId', documentId);
  }

  private async clearPostgreSQL(): Promise<void> {
    await this.supabase
      .from('ml_cache')
      .delete()
      .eq('model_type', 'embedding');
  }
}
```

### 3.5 Week 2 Deliverables

**Files Created:**
```
src/
├── modules/
│   └── semantic-search/
│       ├── ONNXService.ts
│       ├── EmbeddingService.ts
│       ├── VectorStore.ts
│       ├── EmbeddingCache.ts
│       └── types.ts
├── utils/
│   └── tokenizer/
│       ├── BertTokenizer.ts
│       └── types.ts
└── workers/
    └── embedding-worker.ts
```

**Tests:**
```
tests/
├── modules/
│   └── semantic-search/
│       ├── ONNXService.test.ts
│       ├── EmbeddingService.test.ts
│       ├── VectorStore.test.ts
│       └── EmbeddingCache.test.ts
└── integration/
    └── semantic-search.test.ts
```

**Success Criteria:**
- ✅ Load ONNX models in browser
- ✅ Generate embeddings for text
- ✅ Fast similarity search (<100ms for 1000 paragraphs)
- ✅ Multi-tier caching (memory, IndexedDB, PostgreSQL)
- ✅ 85%+ test coverage

---

## 4. Week 3: AI Integration Layer

### 4.1 Claude API Client

**Purpose:** Robust Claude API client with retry logic and rate limiting

```typescript
interface IClaudeClient {
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  stream(messages: Message[], onChunk: (chunk: string) => void): Promise<void>;
  cancelStream(): void;
}

class ClaudeClient implements IClaudeClient {
  private controller: AbortController | null = null;

  constructor(
    private apiKey: string,
    private rateLimiter: IRateLimiter,
    private retryPolicy: IRetryPolicy
  ) {}

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    return await this.retryPolicy.execute(async () => {
      await this.rateLimiter.acquire();

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options?.model || 'claude-3-sonnet-20240229',
          max_tokens: options?.maxTokens || 1024,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new APIError(error.error.message, response.status);
      }

      const data = await response.json();
      return {
        id: data.id,
        model: data.model,
        content: data.content[0].text,
        stopReason: data.stop_reason,
        usage: {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens
        }
      };
    });
  }

  async stream(
    messages: Message[],
    onChunk: (chunk: string) => void
  ): Promise<void> {
    this.controller = new AbortController();

    await this.rateLimiter.acquire();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages,
        stream: true
      }),
      signal: this.controller.signal
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const data = JSON.parse(line.slice(6));
          if (data.type === 'content_block_delta') {
            onChunk(data.delta.text);
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream cancelled');
      } else {
        throw error;
      }
    } finally {
      reader.releaseLock();
    }
  }

  cancelStream(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}

// Rate Limiter
class TokenBucketRateLimiter implements IRateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillRate: number // tokens per second
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait until tokens available
    const waitTime = (1 - this.tokens) / this.refillRate * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    this.tokens = 0;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// Retry Policy
class ExponentialBackoffRetryPolicy implements IRetryPolicy {
  constructor(
    private maxRetries: number = 3,
    private baseDelay: number = 1000,
    private maxDelay: number = 10000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.maxRetries) {
          break;
        }

        // Only retry on transient errors
        if (!this.isRetriable(error)) {
          throw error;
        }

        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt),
          this.maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  private isRetriable(error: any): boolean {
    if (error instanceof APIError) {
      // Retry on rate limit, server errors, timeouts
      return error.status === 429 || error.status >= 500;
    }
    return false;
  }
}
```

### 4.2 Prompt Engineering System

**Purpose:** Reusable, versioned prompt templates

```typescript
interface IPromptTemplate {
  render(variables: Record<string, any>): string;
}

class PromptTemplate implements IPromptTemplate {
  constructor(
    private template: string,
    private schema?: Record<string, string>
  ) {}

  render(variables: Record<string, any>): string {
    // Validate variables against schema
    if (this.schema) {
      this.validate(variables);
    }

    // Replace placeholders
    let result = this.template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    return result;
  }

  private validate(variables: Record<string, any>): void {
    for (const [key, type] of Object.entries(this.schema!)) {
      if (!(key in variables)) {
        throw new Error(`Missing required variable: ${key}`);
      }
      if (typeof variables[key] !== type) {
        throw new Error(`Variable ${key} must be of type ${type}`);
      }
    }
  }
}

// Prompt Library
class PromptLibrary {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // Summarization prompt
    this.register(
      'summarize',
      new PromptTemplate(
        `Summarize the following text in {{maxSentences}} sentences or less:

{{text}}

Summary:`,
        { text: 'string', maxSentences: 'number' }
      )
    );

    // Key terms extraction
    this.register(
      'extract-terms',
      new PromptTemplate(
        `Extract the {{count}} most important key terms from the following text. Return as a JSON array of objects with "term" and "definition" fields.

Text:
{{text}}

Key terms (JSON):`,
        { text: 'string', count: 'number' }
      )
    );

    // Link suggestion
    this.register(
      'suggest-links',
      new PromptTemplate(
        `Given the following paragraph, suggest which of the other paragraphs it is most related to and explain why.

Target paragraph:
{{targetParagraph}}

Candidate paragraphs:
{{candidateParagraphs}}

Analysis:`,
        { targetParagraph: 'string', candidateParagraphs: 'string' }
      )
    );

    // Question answering
    this.register(
      'answer-question',
      new PromptTemplate(
        `Answer the following question based on the provided context.

Context:
{{context}}

Question: {{question}}

Answer:`,
        { context: 'string', question: 'string' }
      )
    );
  }

  register(name: string, template: PromptTemplate): void {
    this.templates.set(name, template);
  }

  get(name: string): PromptTemplate {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Prompt template not found: ${name}`);
    }
    return template;
  }

  render(name: string, variables: Record<string, any>): string {
    return this.get(name).render(variables);
  }
}
```

### 4.3 Response Caching and Optimization

**Purpose:** Cache AI responses to reduce API calls and costs

```typescript
interface IResponseCache {
  get(key: string): Promise<CachedResponse | null>;
  set(key: string, response: CachedResponse, ttl?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  clear(): Promise<void>;
}

class ResponseCache implements IResponseCache {
  constructor(
    private supabase: SupabaseClient,
    private defaultTTL: number = 7 * 24 * 60 * 60 * 1000 // 7 days
  ) {}

  async get(key: string): Promise<CachedResponse | null> {
    const hash = await this.hashKey(key);

    const { data, error } = await this.supabase
      .from('ml_cache')
      .select('*')
      .eq('input_hash', hash)
      .eq('model_type', 'chat')
      .single();

    if (error || !data) return null;

    // Check expiration
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await this.invalidate(key);
      return null;
    }

    return {
      response: data.output.response,
      usage: data.output.usage,
      cachedAt: data.created_at
    };
  }

  async set(
    key: string,
    response: CachedResponse,
    ttl?: number
  ): Promise<void> {
    const hash = await this.hashKey(key);
    const expiresAt = ttl
      ? new Date(Date.now() + ttl)
      : new Date(Date.now() + this.defaultTTL);

    await this.supabase
      .from('ml_cache')
      .upsert({
        model_type: 'chat',
        input_hash: hash,
        output: {
          response: response.response,
          usage: response.usage
        },
        expires_at: expiresAt.toISOString()
      });
  }

  async invalidate(key: string): Promise<void> {
    const hash = await this.hashKey(key);

    await this.supabase
      .from('ml_cache')
      .delete()
      .eq('input_hash', hash)
      .eq('model_type', 'chat');
  }

  async clear(): Promise<void> {
    await this.supabase
      .from('ml_cache')
      .delete()
      .eq('model_type', 'chat');
  }

  private async hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// AI Service with Caching
class AIService {
  constructor(
    private claude: IClaudeClient,
    private prompts: PromptLibrary,
    private cache: IResponseCache
  ) {}

  async summarize(text: string, maxSentences: number = 3): Promise<string> {
    const cacheKey = `summarize:${text}:${maxSentences}`;

    // Check cache
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached.response;
    }

    // Generate prompt
    const prompt = this.prompts.render('summarize', { text, maxSentences });

    // Call Claude
    const response = await this.claude.chat([
      { role: 'user', content: prompt }
    ]);

    // Cache result
    await this.cache.set(cacheKey, {
      response: response.content,
      usage: response.usage,
      cachedAt: new Date().toISOString()
    });

    return response.content;
  }

  async extractKeyTerms(text: string, count: number = 10): Promise<KeyTerm[]> {
    const cacheKey = `extract-terms:${text}:${count}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached.response);
    }

    const prompt = this.prompts.render('extract-terms', { text, count });

    const response = await this.claude.chat([
      { role: 'user', content: prompt }
    ]);

    const terms = JSON.parse(response.content);

    await this.cache.set(cacheKey, {
      response: response.content,
      usage: response.usage,
      cachedAt: new Date().toISOString()
    });

    return terms;
  }

  async answerQuestion(context: string, question: string): Promise<string> {
    const cacheKey = `answer:${context}:${question}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached.response;
    }

    const prompt = this.prompts.render('answer-question', { context, question });

    const response = await this.claude.chat([
      { role: 'user', content: prompt }
    ]);

    await this.cache.set(cacheKey, {
      response: response.content,
      usage: response.usage,
      cachedAt: new Date().toISOString()
    });

    return response.content;
  }
}
```

### 4.4 Week 3 Deliverables

**Files Created:**
```
src/
├── modules/
│   └── ai/
│       ├── ClaudeClient.ts
│       ├── PromptLibrary.ts
│       ├── PromptTemplate.ts
│       ├── ResponseCache.ts
│       ├── AIService.ts
│       ├── RateLimiter.ts
│       ├── RetryPolicy.ts
│       └── types.ts
└── config/
    └── prompts/
        ├── summarize.txt
        ├── extract-terms.txt
        ├── suggest-links.txt
        └── answer-question.txt
```

**Tests:**
```
tests/
├── modules/
│   └── ai/
│       ├── ClaudeClient.test.ts
│       ├── PromptTemplate.test.ts
│       ├── ResponseCache.test.ts
│       ├── AIService.test.ts
│       └── RateLimiter.test.ts
└── integration/
    └── ai-integration.test.ts
```

**Success Criteria:**
- ✅ Claude API integration with streaming
- ✅ Rate limiting (20 requests/minute)
- ✅ Exponential backoff retry
- ✅ Response caching (7-day TTL)
- ✅ Reusable prompt templates
- ✅ 90%+ test coverage

---

## 5. Week 4: Privacy Layer

### 5.1 Ollama Integration

**Purpose:** Local LLM inference for privacy-sensitive data

```typescript
interface IOllamaClient {
  chat(messages: Message[], model?: string): Promise<ChatResponse>;
  stream(messages: Message[], onChunk: (chunk: string) => void, model?: string): Promise<void>;
  listModels(): Promise<ModelInfo[]>;
  isAvailable(): Promise<boolean>;
}

class OllamaClient implements IOllamaClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`);
    const data = await response.json();
    return data.models.map((model: any) => ({
      name: model.name,
      size: model.size,
      modifiedAt: model.modified_at
    }));
  }

  async chat(
    messages: Message[],
    model: string = 'qwen2.5-coder:32b'
  ): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: crypto.randomUUID(),
      model,
      content: data.message.content,
      stopReason: 'stop',
      usage: {
        inputTokens: 0, // Ollama doesn't provide token counts
        outputTokens: 0
      }
    };
  }

  async stream(
    messages: Message[],
    onChunk: (chunk: string) => void,
    model: string = 'qwen2.5-coder:32b'
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true
      })
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const data = JSON.parse(line);
        if (data.message?.content) {
          onChunk(data.message.content);
        }
      }
    }
  }
}
```

### 5.2 Local vs Cloud Routing

**Purpose:** Intelligent routing based on privacy requirements and availability

```typescript
interface ILLMRouter {
  route(request: LLMRequest): Promise<LLMProvider>;
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
}

class LLMRouter implements ILLMRouter {
  constructor(
    private ollama: IOllamaClient,
    private claude: IClaudeClient,
    private privacySettings: IPrivacySettings
  ) {}

  async route(request: LLMRequest): Promise<LLMProvider> {
    // 1. Check if Ollama is available
    const ollamaAvailable = await this.ollama.isAvailable();

    // 2. Check privacy requirements
    const requiresLocal = this.privacySettings.requiresLocalProcessing(request);

    // 3. Make routing decision
    if (requiresLocal) {
      if (!ollamaAvailable) {
        throw new Error('Local LLM required but Ollama is not available');
      }
      return 'ollama';
    }

    // 4. Use Ollama if available and user prefers local
    if (ollamaAvailable && this.privacySettings.preferLocal) {
      return 'ollama';
    }

    // 5. Fall back to Claude for complex tasks
    if (this.isComplexTask(request)) {
      return 'claude';
    }

    // 6. Default to Ollama if available, otherwise Claude
    return ollamaAvailable ? 'ollama' : 'claude';
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const request: LLMRequest = { messages, options };
    const provider = await this.route(request);

    switch (provider) {
      case 'ollama':
        return await this.ollama.chat(messages, options?.model);
      case 'claude':
        return await this.claude.chat(messages, options);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private isComplexTask(request: LLMRequest): boolean {
    // Complex tasks that benefit from Claude's capabilities
    const complexPatterns = [
      /analyze.*relationship/i,
      /explain.*why/i,
      /compare.*contrast/i,
      /summarize.*detail/i
    ];

    const userMessage = request.messages.find(m => m.role === 'user')?.content || '';
    return complexPatterns.some(pattern => pattern.test(userMessage));
  }
}

type LLMProvider = 'ollama' | 'claude';

interface LLMRequest {
  messages: Message[];
  options?: ChatOptions;
}
```

### 5.3 Privacy Controls

**Purpose:** User-configurable privacy settings

```typescript
interface IPrivacySettings {
  preferLocal: boolean;
  requireLocalForSensitiveData: boolean;
  sensitiveDataPatterns: RegExp[];

  requiresLocalProcessing(request: LLMRequest): boolean;
  containsSensitiveData(text: string): boolean;
  sanitize(text: string): string;
}

class PrivacySettings implements IPrivacySettings {
  preferLocal: boolean = false;
  requireLocalForSensitiveData: boolean = true;

  sensitiveDataPatterns: RegExp[] = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{16}\b/g, // Credit card
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, // Email
    /\b\d{3}-\d{3}-\d{4}\b/g, // Phone
    /\b(?:patient|confidential|private)\b/gi // Keywords
  ];

  requiresLocalProcessing(request: LLMRequest): boolean {
    if (!this.requireLocalForSensitiveData) {
      return false;
    }

    const userMessage = request.messages.find(m => m.role === 'user')?.content || '';
    return this.containsSensitiveData(userMessage);
  }

  containsSensitiveData(text: string): boolean {
    return this.sensitiveDataPatterns.some(pattern => pattern.test(text));
  }

  sanitize(text: string): string {
    let sanitized = text;

    // Redact SSN
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****');

    // Redact credit cards
    sanitized = sanitized.replace(/\b\d{16}\b/g, '****************');

    // Redact emails
    sanitized = sanitized.replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      '[EMAIL REDACTED]'
    );

    // Redact phone numbers
    sanitized = sanitized.replace(/\b\d{3}-\d{3}-\d{4}\b/g, '***-***-****');

    return sanitized;
  }
}

// Privacy-Aware AI Service
class PrivacyAwareAIService {
  constructor(
    private router: ILLMRouter,
    private privacy: IPrivacySettings,
    private prompts: PromptLibrary
  ) {}

  async summarize(text: string, maxSentences: number = 3): Promise<string> {
    // Check if text contains sensitive data
    if (this.privacy.containsSensitiveData(text)) {
      console.warn('Sensitive data detected - routing to local LLM');
    }

    const prompt = this.prompts.render('summarize', { text, maxSentences });

    const response = await this.router.chat([
      { role: 'user', content: prompt }
    ]);

    return response.content;
  }

  async extractKeyTerms(text: string, count: number = 10): Promise<KeyTerm[]> {
    // Sanitize text before sending to cloud
    const sanitized = this.privacy.sanitize(text);

    const prompt = this.prompts.render('extract-terms', {
      text: sanitized,
      count
    });

    const response = await this.router.chat([
      { role: 'user', content: prompt }
    ]);

    return JSON.parse(response.content);
  }
}
```

### 5.4 Data Sanitization

**Purpose:** Automatic PII removal before cloud processing

```typescript
interface IDataSanitizer {
  sanitize(text: string, options?: SanitizeOptions): SanitizedResult;
  addPattern(name: string, pattern: RegExp, replacement: string): void;
  removePattern(name: string): void;
}

class DataSanitizer implements IDataSanitizer {
  private patterns: Map<string, SanitizePattern> = new Map();

  constructor() {
    this.registerDefaultPatterns();
  }

  private registerDefaultPatterns(): void {
    this.addPattern('ssn', /\b\d{3}-\d{2}-\d{4}\b/g, '***-**-****');
    this.addPattern('credit-card', /\b\d{16}\b/g, '****************');
    this.addPattern('email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]');
    this.addPattern('phone', /\b\d{3}-\d{3}-\d{4}\b/g, '***-***-****');
    this.addPattern('ip-address', /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');
    this.addPattern('url', /https?:\/\/[^\s]+/g, '[URL]');
  }

  sanitize(text: string, options?: SanitizeOptions): SanitizedResult {
    let sanitized = text;
    const redactions: Redaction[] = [];

    for (const [name, pattern] of this.patterns) {
      if (options?.exclude?.includes(name)) {
        continue;
      }

      const matches = Array.from(sanitized.matchAll(pattern.regex));

      for (const match of matches) {
        redactions.push({
          type: name,
          original: match[0],
          replacement: pattern.replacement,
          position: match.index!
        });
      }

      sanitized = sanitized.replace(pattern.regex, pattern.replacement);
    }

    return {
      sanitized,
      redactions,
      hasRedactions: redactions.length > 0
    };
  }

  addPattern(name: string, pattern: RegExp, replacement: string): void {
    this.patterns.set(name, { regex: pattern, replacement });
  }

  removePattern(name: string): void {
    this.patterns.delete(name);
  }
}

interface SanitizePattern {
  regex: RegExp;
  replacement: string;
}

interface SanitizeOptions {
  exclude?: string[];
}

interface SanitizedResult {
  sanitized: string;
  redactions: Redaction[];
  hasRedactions: boolean;
}

interface Redaction {
  type: string;
  original: string;
  replacement: string;
  position: number;
}
```

### 5.5 Week 4 Deliverables

**Files Created:**
```
src/
├── modules/
│   └── privacy/
│       ├── OllamaClient.ts
│       ├── LLMRouter.ts
│       ├── PrivacySettings.ts
│       ├── DataSanitizer.ts
│       ├── PrivacyAwareAIService.ts
│       └── types.ts
└── config/
    └── privacy/
        ├── sensitive-patterns.json
        └── sanitize-rules.json
```

**Tests:**
```
tests/
├── modules/
│   └── privacy/
│       ├── OllamaClient.test.ts
│       ├── LLMRouter.test.ts
│       ├── PrivacySettings.test.ts
│       ├── DataSanitizer.test.ts
│       └── PrivacyAwareAIService.test.ts
└── integration/
    └── privacy-integration.test.ts
```

**Success Criteria:**
- ✅ Ollama integration with fallback to Claude
- ✅ Automatic routing based on privacy settings
- ✅ PII detection and sanitization
- ✅ User-configurable privacy controls
- ✅ 85%+ test coverage

---

## 6. Week 5: Production Layer

### 6.1 API Design

**Purpose:** RESTful API for all platform features

```typescript
// API Routes
const apiRoutes = {
  // Documents
  'POST /api/documents': uploadDocument,
  'GET /api/documents/:id': getDocument,
  'PUT /api/documents/:id': updateDocument,
  'DELETE /api/documents/:id': deleteDocument,
  'GET /api/documents/:id/parse': parseDocument,

  // Annotations
  'POST /api/annotations': createAnnotation,
  'GET /api/documents/:id/annotations': getAnnotations,
  'PUT /api/annotations/:id': updateAnnotation,
  'DELETE /api/annotations/:id': deleteAnnotation,

  // Citations
  'POST /api/citations': createCitation,
  'GET /api/documents/:id/citations': getCitations,
  'GET /api/citations/export': exportCitations,

  // ML Services
  'POST /api/ml/embeddings': generateEmbeddings,
  'POST /api/ml/similarity': findSimilar,
  'POST /api/ml/summarize': summarizeText,
  'POST /api/ml/extract-terms': extractKeyTerms,

  // Projects
  'POST /api/projects': createProject,
  'GET /api/projects': getProjects,
  'GET /api/projects/:id': getProject,
  'PUT /api/projects/:id': updateProject,
  'DELETE /api/projects/:id': deleteProject,
  'POST /api/projects/:id/share': shareProject,

  // Health
  'GET /api/health': healthCheck
};

// Middleware
const middleware = [
  corsMiddleware,
  authMiddleware,
  rateLimitMiddleware,
  validationMiddleware,
  errorHandlerMiddleware
];

// Example: Upload Document Endpoint
async function uploadDocument(req: Request, res: Response) {
  try {
    const { file, projectId } = req.body;
    const userId = req.user.id;

    // Validate
    if (!file || !projectId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Upload
    const documentManager = new DocumentManager(/* dependencies */);
    const document = await documentManager.uploadDocument(file, projectId);

    // Return
    res.status(201).json({ document });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### 6.2 Performance Monitoring

**Purpose:** Track performance metrics and identify bottlenecks

```typescript
interface IPerformanceMonitor {
  startTransaction(name: string): Transaction;
  recordMetric(name: string, value: number, tags?: Record<string, string>): void;
  recordError(error: Error, context?: Record<string, any>): void;
}

class PerformanceMonitor implements IPerformanceMonitor {
  constructor(private sentry: typeof Sentry) {}

  startTransaction(name: string): Transaction {
    return this.sentry.startTransaction({
      op: name,
      name
    });
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.sentry.metrics.distribution(name, value, {
      tags,
      unit: 'millisecond'
    });
  }

  recordError(error: Error, context?: Record<string, any>): void {
    this.sentry.captureException(error, {
      contexts: context
    });
  }
}

// Performance Tracking Decorator
function track(metricName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      const transaction = performanceMonitor.startTransaction(metricName);

      try {
        const result = await originalMethod.apply(this, args);
        transaction.setStatus('ok');
        return result;
      } catch (error) {
        transaction.setStatus('internal_error');
        performanceMonitor.recordError(error as Error, {
          method: propertyKey,
          args
        });
        throw error;
      } finally {
        const duration = performance.now() - start;
        performanceMonitor.recordMetric(metricName, duration);
        transaction.finish();
      }
    };

    return descriptor;
  };
}

// Usage
class DocumentService {
  @track('document.upload')
  async uploadDocument(file: File, projectId: string): Promise<Document> {
    // Implementation
  }

  @track('document.parse')
  async parseDocument(documentId: string): Promise<ParsedContent> {
    // Implementation
  }
}
```

### 6.3 Deployment Configuration

**Purpose:** Production-ready deployment settings

```typescript
// Environment Configuration
interface EnvironmentConfig {
  nodeEnv: 'development' | 'staging' | 'production';
  port: number;
  databaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  claudeApiKey: string;
  sentryDsn: string;
  redisUrl?: string;
  ollamaUrl?: string;
}

const config: EnvironmentConfig = {
  nodeEnv: process.env.NODE_ENV as any || 'development',
  port: parseInt(process.env.PORT || '3000'),
  databaseUrl: process.env.DATABASE_URL!,
  supabaseUrl: process.env.VITE_SUPABASE_URL!,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
  claudeApiKey: process.env.CLAUDE_API_KEY!,
  sentryDsn: process.env.SENTRY_DSN!,
  redisUrl: process.env.REDIS_URL,
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434'
};

// Docker Compose Configuration
const dockerCompose = `
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=\${DATABASE_URL}
      - SUPABASE_URL=\${SUPABASE_URL}
      - SUPABASE_ANON_KEY=\${SUPABASE_ANON_KEY}
      - CLAUDE_API_KEY=\${CLAUDE_API_KEY}
      - SENTRY_DSN=\${SENTRY_DSN}
    depends_on:
      - redis
      - ollama

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama

volumes:
  redis-data:
  ollama-data:
`;

// Vercel Configuration
const vercelConfig = {
  version: 2,
  builds: [
    {
      src: 'package.json',
      use: '@vercel/node'
    }
  ],
  routes: [
    {
      src: '/api/(.*)',
      dest: '/api/$1'
    },
    {
      src: '/(.*)',
      dest: '/index.html'
    }
  ],
  env: {
    NODE_ENV: 'production',
    VITE_SUPABASE_URL: '@supabase-url',
    VITE_SUPABASE_ANON_KEY: '@supabase-anon-key',
    CLAUDE_API_KEY: '@claude-api-key',
    SENTRY_DSN: '@sentry-dsn'
  }
};
```

### 6.4 CI/CD Pipeline

**Purpose:** Automated testing and deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run typecheck

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Run integration tests
        run: npm run test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    needs: test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v3

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/

      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v3

      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: dist
          path: dist/

      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

      - name: Create Sentry release
        uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
          SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
        with:
          environment: production
```

### 6.5 Week 5 Deliverables

**Files Created:**
```
├── api/
│   ├── routes/
│   │   ├── documents.ts
│   │   ├── annotations.ts
│   │   ├── citations.ts
│   │   ├── ml.ts
│   │   └── projects.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── cors.ts
│   │   ├── rateLimit.ts
│   │   └── errorHandler.ts
│   └── server.ts
├── config/
│   ├── environment.ts
│   ├── database.ts
│   └── monitoring.ts
├── docker-compose.yml
├── Dockerfile
├── vercel.json
└── .github/
    └── workflows/
        ├── deploy.yml
        └── test.yml
```

**Tests:**
```
tests/
├── api/
│   ├── documents.test.ts
│   ├── annotations.test.ts
│   └── ml.test.ts
├── integration/
│   └── end-to-end.test.ts
└── load/
    └── performance.test.ts
```

**Success Criteria:**
- ✅ RESTful API with all endpoints
- ✅ Rate limiting (100 req/min per user)
- ✅ Performance monitoring with Sentry
- ✅ CI/CD pipeline with automated tests
- ✅ Docker deployment configuration
- ✅ 90%+ test coverage

---

## 7. Cross-Cutting Concerns

### 7.1 Error Handling

```typescript
class ApplicationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'AUTHORIZATION_ERROR', 401);
  }
}

class NotFoundError extends ApplicationError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

class RateLimitError extends ApplicationError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
  }
}

// Global Error Handler
function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  if (error instanceof ApplicationError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    });
  }

  // Log unexpected errors
  console.error('Unexpected error:', error);
  Sentry.captureException(error);

  // Generic error response
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
}
```

### 7.2 Logging

```typescript
interface ILogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
}

class Logger implements ILogger {
  constructor(
    private service: string,
    private environment: string
  ) {}

  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error, meta?: any): void {
    this.log('error', message, {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  private log(level: string, message: string, meta?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      environment: this.environment,
      message,
      ...meta
    };

    console.log(JSON.stringify(logEntry));

    // Send to external logging service if needed
    if (this.environment === 'production') {
      // Example: Send to Sentry, Datadog, etc.
    }
  }
}

// Usage
const logger = new Logger('document-service', process.env.NODE_ENV);
logger.info('Document uploaded', { documentId: '123', userId: 'user-1' });
```

### 7.3 Security

```typescript
// Content Security Policy
const cspMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.anthropic.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
});

// CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://close-reading.vercel.app'
    : 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

// Rate Limiting
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false
});

// Input Sanitization
function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}
```

---

## 8. Integration Patterns

### 8.1 Module Dependencies

```typescript
// Dependency Injection Container
class Container {
  private services: Map<string, any> = new Map();

  register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory);
  }

  resolve<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) {
      throw new Error(`Service not found: ${name}`);
    }
    return factory();
  }
}

// Service Registration
const container = new Container();

// Storage
container.register('storageService', () =>
  new SupabaseStorageService(supabase)
);

// Repositories
container.register('documentRepository', () =>
  new DocumentRepository(supabase)
);

container.register('annotationRepository', () =>
  new AnnotationRepository(supabase)
);

// Services
container.register('documentManager', () =>
  new DocumentManager(
    container.resolve('storageService'),
    container.resolve('documentParser'),
    container.resolve('documentRepository')
  )
);

container.register('embeddingService', () =>
  new EmbeddingService(
    container.resolve('onnxService'),
    container.resolve('embeddingCache'),
    container.resolve('documentRepository')
  )
);

// AI Services
container.register('claudeClient', () =>
  new ClaudeClient(
    process.env.CLAUDE_API_KEY!,
    container.resolve('rateLimiter'),
    container.resolve('retryPolicy')
  )
);

container.register('ollamaClient', () =>
  new OllamaClient(process.env.OLLAMA_URL)
);

container.register('llmRouter', () =>
  new LLMRouter(
    container.resolve('ollamaClient'),
    container.resolve('claudeClient'),
    container.resolve('privacySettings')
  )
);

// Usage
const documentManager = container.resolve<IDocumentManager>('documentManager');
```

### 8.2 Event-Driven Communication

```typescript
interface IEventBus {
  publish(event: string, data: any): void;
  subscribe(event: string, handler: (data: any) => void): () => void;
}

class EventBus implements IEventBus {
  private handlers: Map<string, Set<(data: any) => void>> = new Map();

  publish(event: string, data: any): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  subscribe(event: string, handler: (data: any) => void): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }
}

// Events
const events = {
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_PARSED: 'document.parsed',
  ANNOTATION_CREATED: 'annotation.created',
  EMBEDDINGS_GENERATED: 'embeddings.generated'
};

// Usage
const eventBus = new EventBus();

// Subscribe to events
eventBus.subscribe(events.DOCUMENT_UPLOADED, async (data) => {
  const { documentId } = data;
  await documentManager.parseDocument(documentId);
});

eventBus.subscribe(events.DOCUMENT_PARSED, async (data) => {
  const { documentId } = data;
  await embeddingService.generateEmbeddings(documentId);
});

// Publish events
eventBus.publish(events.DOCUMENT_UPLOADED, { documentId: 'doc-123' });
```

---

## 9. Deployment Strategy

### 9.1 Environment Setup

**Development:**
- Local Supabase instance (Docker)
- Local Ollama instance
- Hot reload with Vite
- Mock ML models for fast iteration

**Staging:**
- Supabase staging project
- Vercel preview deployments
- Full ML model testing
- Integration tests

**Production:**
- Supabase production project
- Vercel production deployment
- CDN for static assets
- Redis caching layer

### 9.2 Monitoring & Observability

**Metrics:**
- Request latency (p50, p95, p99)
- Error rate by endpoint
- ML inference time
- Cache hit rate
- Database query time

**Logging:**
- Structured JSON logs
- Log levels (debug, info, warn, error)
- Request tracing
- Error stack traces

**Alerting:**
- Error rate > 5%
- Response time > 2s
- Database connection errors
- ML service failures

---

## 10. Performance Optimization

### 10.1 Frontend Optimization

- Code splitting by route
- Lazy loading for ML models
- Virtual scrolling for long documents
- Debounced annotation updates
- Service worker caching

### 10.2 Backend Optimization

- Connection pooling
- Query optimization with indexes
- Batch operations
- Caching at multiple levels
- Async job processing

### 10.3 ML Optimization

- WASM SIMD for faster inference
- Batch embedding generation
- Multi-tier caching
- Model quantization
- Web Workers for parallel processing

---

## 11. Security Architecture

### 11.1 Authentication & Authorization

- JWT-based authentication
- Row-level security (RLS)
- Role-based access control (RBAC)
- OAuth2 for third-party login

### 11.2 Data Protection

- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- PII detection and sanitization
- Automatic data redaction

### 11.3 API Security

- Rate limiting per user/IP
- Input validation and sanitization
- CSRF protection
- Content Security Policy (CSP)

---

## 12. Testing Strategy

### 12.1 Unit Tests

- All modules ≥ 85% coverage
- Pure functions tested in isolation
- Mocked dependencies

### 12.2 Integration Tests

- End-to-end workflows
- Database interactions
- API endpoint testing
- ML service integration

### 12.3 Performance Tests

- Load testing (100+ concurrent users)
- Stress testing (peak load × 2)
- Endurance testing (24 hours)
- Spike testing (sudden traffic surge)

---

## Conclusion

This 5-week modular architecture provides a solid foundation for the AI Research Platform. Each week builds upon the previous, with clear deliverables and success criteria.

**Key Strengths:**
- Modular design with clear interfaces
- Privacy-first approach with local processing
- Scalable infrastructure
- Comprehensive testing strategy
- Production-ready deployment

**Next Steps:**
1. Review architecture with stakeholders
2. Set up development environment
3. Begin Week 1 implementation
4. Establish CI/CD pipeline
5. Plan sprint ceremonies

**Success Metrics:**
- 90%+ test coverage across all modules
- <100ms response time for most operations
- 99.9% uptime SLA
- ≤ 5% error rate
- User satisfaction ≥ 4.5/5

---

**Document Control:**
- Version: 1.0
- Last Updated: November 11, 2025
- Next Review: Start of Week 1
- Owner: System Architect
