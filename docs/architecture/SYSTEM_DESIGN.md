# Close-Reading Platform - System Design

## 1. Executive Summary

The Close-Reading Platform is a web-based application that enables scholars, students, and educators to deeply analyze textual documents through advanced annotation, linking, and AI-powered insights. The system leverages a modern, scalable architecture combining React frontend, Supabase backend, and local WASM-based ML processing.

### Key Architectural Decisions

- **Client-Heavy Architecture**: Processing happens in the browser where possible
- **Local-First ML**: WASM-based neural networks minimize API dependencies
- **Real-Time Sync**: Supabase Realtime enables collaborative features
- **Progressive Enhancement**: Core features work offline via Service Workers
- **Scalable Backend**: Serverless architecture via Supabase and Railway

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │   Document   │  Annotation  │   Linking    │    Export    │ │
│  │    Viewer    │    System    │    Engine    │    System    │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend Layer (React)                      │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │   Zustand    │  React Query │   Service    │   IndexedDB  │ │
│  │    Store     │    Cache     │   Workers    │    Cache     │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       ML Layer (WASM)                           │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │  ruv-FANN    │ claude-flow  │ ONNX Runtime │ TensorFlow.js│ │
│  │  Embeddings  │     NLP      │  Inference   │  Fine-tuning │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Layer (Supabase)                    │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │  PostgreSQL  │  Auth (JWT)  │   Storage    │   Realtime   │ │
│  │   Database   │   + OAuth    │    (S3)      │  WebSockets  │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Worker Layer (Railway)                      │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │     OCR      │  Claude API  │    Export    │     Sync     │ │
│  │   Service    │   Fallback   │  Generator   │   Service    │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Hierarchy

### 3.1 Frontend Component Tree

```
App
├── AuthProvider
│   ├── LoginPage
│   └── RegisterPage
├── AppLayout
│   ├── Header
│   │   ├── Logo
│   │   ├── Navigation
│   │   └── UserMenu
│   ├── Sidebar
│   │   ├── ProjectList
│   │   └── DocumentTree
│   └── MainContent
│       ├── DocumentViewer
│       │   ├── DocumentHeader
│       │   ├── ViewToggle (Original/Sentence)
│       │   ├── TextRenderer
│       │   │   ├── ParagraphBlock
│       │   │   │   ├── SentenceSpan
│       │   │   │   └── AnnotationMarker
│       │   │   └── LinkConnector
│       │   └── ScrollManager
│       ├── AnnotationPanel
│       │   ├── AnnotationForm
│       │   ├── AnnotationList
│       │   │   └── AnnotationItem
│       │   └── AnnotationFilter
│       ├── LinkingPanel
│       │   ├── LinkForm
│       │   ├── LinkSuggestions
│       │   └── LinkGraph
│       └── ExportModal
│           ├── FormatSelector
│           └── ExportPreview
└── SettingsProvider
    └── SettingsPage
```

### 3.2 State Management Architecture

```typescript
// Zustand Store Structure
interface AppState {
  // Authentication
  auth: {
    user: User | null;
    session: Session | null;
    loading: boolean;
  };

  // Projects & Documents
  projects: {
    items: Project[];
    active: string | null;
    loading: boolean;
  };

  documents: {
    items: Document[];
    active: string | null;
    content: ParsedDocument | null;
    viewMode: 'original' | 'sentence';
  };

  // Annotations
  annotations: {
    items: Annotation[];
    selected: string | null;
    filter: AnnotationFilter;
  };

  // Links
  links: {
    items: Link[];
    suggestions: LinkSuggestion[];
    selected: string | null;
  };

  // UI State
  ui: {
    sidebarCollapsed: boolean;
    theme: 'light' | 'dark';
    panelView: 'annotations' | 'links' | 'outline';
  };

  // ML State
  ml: {
    embeddings: Map<string, number[]>;
    processing: boolean;
    cache: MLCache;
  };
}
```

---

## 4. Data Flow Architecture

### 4.1 Document Upload & Processing Flow

```
User Upload → Frontend Validation → File Upload to Supabase Storage
                                            ↓
                                    Worker Service (Railway)
                                            ↓
                        ┌───────────────────┴───────────────────┐
                        ↓                                       ↓
                Text Extraction                          OCR (if PDF)
                (pdf-parse/mammoth)                    (tesseract.js)
                        ↓                                       ↓
                        └───────────────────┬───────────────────┘
                                            ↓
                                  Parse into Paragraphs
                                            ↓
                                  Parse into Sentences
                                            ↓
                          Store in PostgreSQL (documents table)
                                            ↓
                          Trigger ML Processing (WASM)
                                            ↓
                        ┌───────────────────┴───────────────────┐
                        ↓                                       ↓
              Generate Embeddings                    Extract Key Terms
              (ruv-FANN WASM)                     (claude-flow NLP)
                        ↓                                       ↓
                        └───────────────────┬───────────────────┘
                                            ↓
                              Cache Results (ml_cache + IndexedDB)
                                            ↓
                                    Notify Frontend
                                            ↓
                                  Render Document View
```

### 4.2 Annotation Creation Flow

```
User Highlights Text → Frontend Captures Selection
                                ↓
                    Open Annotation Form (Modal/Sidebar)
                                ↓
                    User Enters Annotation Data
                                ↓
                    Frontend Validation
                                ↓
                    Store in Zustand (Optimistic Update)
                                ↓
                    POST to Supabase API
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
            Success Response          Realtime Broadcast
                    ↓                       ↓
            Confirm UI Update       Other Clients Sync
                    ↓
            Trigger ML Analysis
                    ↓
        Update Suggested Links
```

### 4.3 Link Suggestion Flow

```
User Views Document → Frontend Requests Embeddings
                                ↓
                    Check IndexedDB Cache
                                ↓
                        ┌───────┴───────┐
                        ↓               ↓
                    Cache Hit       Cache Miss
                        ↓               ↓
                Return Cached       Load WASM
                        ↓               ↓
                        └───────┬───────┘
                                ↓
                    Calculate Similarities
                    (Cosine Similarity)
                                ↓
                    Filter by Threshold (0.7+)
                                ↓
                    Rank by Relevance
                                ↓
                    Display Top 5 Suggestions
                                ↓
                User Accepts/Rejects
                                ↓
                Update Training Data
```

### 4.4 Export Flow

```
User Initiates Export → Select Format (BibTeX/RIS/JSON)
                                ↓
                    Select Scope (All/Filtered)
                                ↓
                    Frontend Gathers Data
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
            Simple Export              Complex Export
            (Client-Side)              (Worker Service)
                    ↓                       ↓
            Generate File           POST to Railway Worker
                    ↓                       ↓
                    └───────────┬───────────┘
                                ↓
                    Download File (Blob)
```

---

## 5. Database Schema

### 5.1 Core Tables

```sql
-- Users (managed by Supabase Auth)
-- Profiles extend auth.users
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT false,
  share_token text UNIQUE, -- for public sharing
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Metadata
  color text, -- UI accent color
  icon text,  -- emoji or icon name

  CONSTRAINT projects_user_id_name_key UNIQUE (user_id, name)
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_share_token ON projects(share_token) WHERE share_token IS NOT NULL;

-- Documents
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File metadata
  title text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL, -- .txt, .md, .docx, .pdf
  file_size bigint NOT NULL,
  storage_path text NOT NULL, -- Supabase Storage path

  -- Parsed content
  content_text text, -- full extracted text
  paragraphs jsonb NOT NULL DEFAULT '[]'::jsonb, -- array of paragraph objects
  sentences jsonb NOT NULL DEFAULT '[]'::jsonb,  -- array of sentence objects

  -- Processing status
  processing_status text DEFAULT 'pending', -- pending, processing, completed, failed
  processing_error text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT documents_project_id_title_key UNIQUE (project_id, title)
);

CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(processing_status);

-- Paragraphs structure (stored in documents.paragraphs JSONB)
-- {
--   "id": "p1",
--   "text": "Paragraph content...",
--   "order": 0,
--   "sentences": ["s1", "s2", "s3"]
-- }

-- Sentences structure (stored in documents.sentences JSONB)
-- {
--   "id": "s1",
--   "text": "Sentence content.",
--   "paragraphId": "p1",
--   "order": 0,
--   "startOffset": 0,
--   "endOffset": 20
-- }

-- Annotations
CREATE TABLE annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Target
  target_type text NOT NULL, -- 'paragraph', 'sentence', 'range'
  target_id text NOT NULL, -- paragraph/sentence ID
  start_offset int, -- for range selections
  end_offset int,
  selected_text text NOT NULL,

  -- Annotation data
  annotation_type text NOT NULL, -- 'highlight', 'note', 'main_idea', 'citation'
  content text, -- user's note/comment
  color text DEFAULT '#FFD700', -- highlight color

  -- Citation data (if type = 'citation')
  citation_data jsonb, -- { author, year, page, etc. }

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_annotations_document_id ON annotations(document_id);
CREATE INDEX idx_annotations_user_id ON annotations(user_id);
CREATE INDEX idx_annotations_type ON annotations(annotation_type);
CREATE INDEX idx_annotations_target ON annotations(target_type, target_id);

-- Links (paragraph-to-paragraph connections)
CREATE TABLE links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Connection
  source_paragraph_id text NOT NULL,
  target_paragraph_id text NOT NULL,

  -- Link data
  link_type text DEFAULT 'manual', -- 'manual', 'suggested', 'auto'
  relationship text, -- 'related', 'contrasts', 'supports', 'refutes', etc.
  note text,
  strength real DEFAULT 1.0, -- 0.0 to 1.0 for suggested links

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT links_unique_connection UNIQUE (document_id, source_paragraph_id, target_paragraph_id)
);

CREATE INDEX idx_links_document_id ON links(document_id);
CREATE INDEX idx_links_user_id ON links(user_id);
CREATE INDEX idx_links_source ON links(source_paragraph_id);
CREATE INDEX idx_links_target ON links(target_paragraph_id);

-- ML Cache
CREATE TABLE ml_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type text NOT NULL, -- 'embedding', 'summary', 'terms', 'pos'
  input_hash text NOT NULL, -- SHA-256 hash of input
  output jsonb NOT NULL, -- model output
  metadata jsonb, -- model version, params, etc.

  -- TTL
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz, -- optional expiration

  CONSTRAINT ml_cache_model_hash_key UNIQUE (model_type, input_hash)
);

CREATE INDEX idx_ml_cache_model_hash ON ml_cache(model_type, input_hash);
CREATE INDEX idx_ml_cache_expires ON ml_cache(expires_at) WHERE expires_at IS NOT NULL;

-- Collaborators (for shared projects)
CREATE TABLE collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer', -- 'owner', 'editor', 'viewer'
  invited_by uuid REFERENCES auth.users(id),

  created_at timestamptz DEFAULT now(),

  CONSTRAINT collaborators_project_user_key UNIQUE (project_id, user_id)
);

CREATE INDEX idx_collaborators_project_id ON collaborators(project_id);
CREATE INDEX idx_collaborators_user_id ON collaborators(user_id);

-- Activity Log (for versioning and audit)
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,

  action text NOT NULL, -- 'create', 'update', 'delete', 'annotate', 'link', etc.
  entity_type text NOT NULL, -- 'project', 'document', 'annotation', 'link'
  entity_id uuid NOT NULL,

  -- Change data
  before_state jsonb,
  after_state jsonb,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_project_id ON activity_log(project_id);
CREATE INDEX idx_activity_document_id ON activity_log(document_id);
CREATE INDEX idx_activity_created_at ON activity_log(created_at DESC);
```

### 5.2 Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- Projects: Users can see their own projects + shared projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view shared projects"
  ON projects FOR SELECT
  USING (
    is_public = true OR
    EXISTS (
      SELECT 1 FROM collaborators
      WHERE collaborators.project_id = projects.id
      AND collaborators.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (user_id = auth.uid());

-- Documents: Inherit from project permissions
CREATE POLICY "Users can view documents in accessible projects"
  ON documents FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = documents.project_id
      AND (
        projects.user_id = auth.uid() OR
        projects.is_public = true OR
        EXISTS (
          SELECT 1 FROM collaborators
          WHERE collaborators.project_id = projects.id
          AND collaborators.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can insert documents in own projects"
  ON documents FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = documents.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Annotations: Users can see all annotations on documents they can access
CREATE POLICY "Users can view annotations on accessible documents"
  ON annotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      JOIN projects ON projects.id = documents.project_id
      WHERE documents.id = annotations.document_id
      AND (
        projects.user_id = auth.uid() OR
        projects.is_public = true OR
        EXISTS (
          SELECT 1 FROM collaborators
          WHERE collaborators.project_id = projects.id
          AND collaborators.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create annotations on accessible documents"
  ON annotations FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM documents
      JOIN projects ON projects.id = documents.project_id
      WHERE documents.id = annotations.document_id
      AND (
        projects.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM collaborators
          WHERE collaborators.project_id = projects.id
          AND collaborators.user_id = auth.uid()
          AND collaborators.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Similar policies for links, collaborators, etc.
```

---

## 6. API Contracts

### 6.1 Supabase API (Auto-generated)

Supabase automatically generates REST and GraphQL APIs from the database schema. We use the JavaScript client library for type-safe access.

### 6.2 Custom API Endpoints (Railway Workers)

#### Document Processing Service

```typescript
POST /api/documents/process
Headers: Authorization: Bearer <jwt>
Body: {
  documentId: string;
  storageUrl: string;
  fileType: string;
}

Response: {
  success: boolean;
  documentId: string;
  paragraphs: Paragraph[];
  sentences: Sentence[];
  error?: string;
}
```

#### ML Service Endpoints

```typescript
// Generate embeddings
POST /api/ml/embeddings
Headers: Authorization: Bearer <jwt>
Body: {
  texts: string[];
  model?: string; // default: 'ruv-fann'
}

Response: {
  embeddings: number[][];
  cached: boolean[];
}

// Summarize text
POST /api/ml/summarize
Headers: Authorization: Bearer <jwt>
Body: {
  text: string;
  maxLength?: number;
  method?: 'local' | 'claude'; // default: 'local'
}

Response: {
  summary: string;
  method: string;
  cached: boolean;
}

// Extract key terms
POST /api/ml/terms
Headers: Authorization: Bearer <jwt>
Body: {
  text: string;
  maxTerms?: number;
}

Response: {
  terms: Array<{
    term: string;
    pos: string; // part of speech
    frequency: number;
    context: string[];
  }>;
  cached: boolean;
}

// Calculate similarity
POST /api/ml/similarity
Headers: Authorization: Bearer <jwt>
Body: {
  paragraphIds: string[];
  threshold?: number; // default: 0.7
}

Response: {
  suggestions: Array<{
    source: string;
    target: string;
    similarity: number;
    reason: string;
  }>;
}
```

#### Export Service

```typescript
POST /api/export
Headers: Authorization: Bearer <jwt>
Body: {
  projectId: string;
  format: 'bibtex' | 'ris' | 'json' | 'markdown';
  scope: 'all' | 'filtered';
  filters?: {
    annotationTypes?: string[];
    dateRange?: { start: string; end: string };
  };
}

Response: {
  url: string; // download URL
  format: string;
  expiresAt: string;
}
```

### 6.3 Realtime Subscriptions

```typescript
// Subscribe to project changes
supabase
  .channel(`project:${projectId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'documents',
    filter: `project_id=eq.${projectId}`
  }, handleDocumentChange)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'annotations',
    // Join with documents to filter by project
  }, handleAnnotationChange)
  .subscribe();
```

---

## 7. ML Architecture

### 7.1 WASM Module Loading

```typescript
// ML Service Initialization
class MLService {
  private fannModule: any; // ruv-FANN WASM
  private claudeFlowModule: any; // claude-flow WASM
  private onnxSession: any; // ONNX Runtime

  async initialize() {
    // Load WASM modules in parallel
    [this.fannModule, this.claudeFlowModule] = await Promise.all([
      loadRuvFANN(),
      loadClaudeFlow()
    ]);

    // Initialize ONNX for local summarization model
    this.onnxSession = await ort.InferenceSession.create(
      '/models/summarization.onnx'
    );
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cached = await this.checkCache('embedding', text);
    if (cached) return cached;

    // Generate using ruv-FANN
    const embedding = this.fannModule.embed(text);

    // Cache result
    await this.cacheResult('embedding', text, embedding);

    return embedding;
  }

  async extractTerms(text: string): Promise<Term[]> {
    // Use claude-flow NLP model
    const tokens = this.claudeFlowModule.nlp.tokenize(text);
    const pos = this.claudeFlowModule.nlp.posTag(tokens);

    // Filter for nouns, proper nouns, verbs
    const terms = pos
      .filter(t => ['NN', 'NNP', 'VB'].includes(t.tag))
      .map(t => ({
        term: t.word,
        pos: t.tag,
        frequency: this.calculateFrequency(t.word, text),
        context: this.extractContext(t.word, text)
      }));

    return terms;
  }
}
```

### 7.2 Caching Strategy

```typescript
// Multi-layer cache: IndexedDB (local) + PostgreSQL (remote)
class MLCache {
  private db: IDBDatabase; // IndexedDB

  async get(modelType: string, input: string): Promise<any> {
    const hash = await this.hashInput(input);

    // 1. Check IndexedDB (fastest)
    const local = await this.getFromIndexedDB(modelType, hash);
    if (local) return local;

    // 2. Check PostgreSQL (via Supabase)
    const remote = await this.getFromSupabase(modelType, hash);
    if (remote) {
      // Backfill IndexedDB
      await this.setInIndexedDB(modelType, hash, remote);
      return remote;
    }

    return null;
  }

  async set(modelType: string, input: string, output: any): Promise<void> {
    const hash = await this.hashInput(input);

    // Write to both layers
    await Promise.all([
      this.setInIndexedDB(modelType, hash, output),
      this.setInSupabase(modelType, hash, output)
    ]);
  }
}
```

### 7.3 Link Suggestion Algorithm

```typescript
async function suggestLinks(
  documentId: string,
  paragraphId: string,
  threshold = 0.7
): Promise<LinkSuggestion[]> {
  // 1. Get all paragraphs in document
  const paragraphs = await getParagraphs(documentId);

  // 2. Get embedding for target paragraph
  const targetEmbedding = await mlService.generateEmbedding(
    paragraphs.find(p => p.id === paragraphId).text
  );

  // 3. Get/generate embeddings for all other paragraphs
  const embeddings = await Promise.all(
    paragraphs
      .filter(p => p.id !== paragraphId)
      .map(p => mlService.generateEmbedding(p.text))
  );

  // 4. Calculate cosine similarities
  const similarities = embeddings.map((emb, idx) => ({
    paragraphId: paragraphs[idx].id,
    similarity: cosineSimilarity(targetEmbedding, emb)
  }));

  // 5. Filter and rank
  const suggestions = similarities
    .filter(s => s.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5) // Top 5
    .map(s => ({
      ...s,
      paragraph: paragraphs.find(p => p.id === s.paragraphId),
      reason: generateReason(s.similarity)
    }));

  return suggestions;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}
```

---

## 8. Deployment Architecture

### 8.1 Infrastructure Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel (Frontend)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - React App (Static Build)                              │  │
│  │  - Service Workers (for offline)                         │  │
│  │  - WASM modules (/.wasm/)                                │  │
│  │  - Edge Functions (for API routes)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Supabase (Backend)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - PostgreSQL Database (with RLS)                        │  │
│  │  - Auth Service (JWT + OAuth)                            │  │
│  │  - Storage (S3-compatible)                               │  │
│  │  - Realtime (WebSocket subscriptions)                    │  │
│  │  - Edge Functions (for triggers/webhooks)                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Railway (Worker Services)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - Document Processing Service (Node.js)                 │  │
│  │  - ML Service (Python/Node with ONNX)                    │  │
│  │  - Export Service (Node.js)                              │  │
│  │  - OCR Service (Tesseract/Google Vision)                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    External Services (Optional)                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - Claude API (for fallback generation)                  │  │
│  │  - Google Cloud Vision (for advanced OCR)                │  │
│  │  - Redis (for caching, optional)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run typecheck

  build-wasm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - run: cargo build --release --target wasm32-unknown-unknown
      - uses: actions/upload-artifact@v3
        with:
          name: wasm-modules
          path: target/wasm32-unknown-unknown/release/*.wasm

  deploy-frontend:
    needs: [test, build-wasm]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
        with:
          name: wasm-modules
          path: public/wasm
      - uses: vercel/actions/deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-workers:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: railway/cli@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
          command: up
```

### 8.3 Environment Configuration

```bash
# Frontend (.env.production)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_WORKER_URL=https://workers.railway.app
VITE_CLAUDE_API_KEY=sk-ant-xxx # Optional, for fallback

# Worker Services (.env)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxx... # Service role key
CLAUDE_API_KEY=sk-ant-xxx
GOOGLE_VISION_KEY=xxx # Optional
REDIS_URL=redis://xxx # Optional

# Supabase (.env)
DATABASE_URL=postgresql://xxx
JWT_SECRET=xxx
STORAGE_BACKEND=s3
S3_BUCKET=close-reading-storage
```

---

## 9. Performance Optimization

### 9.1 Frontend Optimizations

```typescript
// Code splitting by route
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const DocumentPage = lazy(() => import('./pages/DocumentPage'));

// Virtual scrolling for large documents
import { VariableSizeList } from 'react-window';

function DocumentRenderer({ paragraphs }) {
  return (
    <VariableSizeList
      height={window.innerHeight}
      itemCount={paragraphs.length}
      itemSize={(index) => paragraphs[index].height}
    >
      {({ index, style }) => (
        <ParagraphBlock
          style={style}
          paragraph={paragraphs[index]}
        />
      )}
    </VariableSizeList>
  );
}

// Debounced annotation updates
const debouncedUpdateAnnotation = useMemo(
  () => debounce((id, data) => updateAnnotation(id, data), 500),
  []
);
```

### 9.2 WASM Performance

```typescript
// Initialize WASM modules on worker threads
const mlWorker = new Worker(new URL('./ml-worker.ts', import.meta.url), {
  type: 'module'
});

// Batch embedding generation
async function batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
  // Split into chunks of 10
  const chunks = chunkArray(texts, 10);

  // Process chunks in parallel on worker threads
  const results = await Promise.all(
    chunks.map(chunk =>
      mlWorker.postMessage({ action: 'embed', texts: chunk })
    )
  );

  return results.flat();
}
```

### 9.3 Database Optimizations

```sql
-- Materialized view for annotation counts
CREATE MATERIALIZED VIEW annotation_counts AS
SELECT
  document_id,
  annotation_type,
  COUNT(*) as count
FROM annotations
GROUP BY document_id, annotation_type;

CREATE INDEX idx_annotation_counts_doc ON annotation_counts(document_id);

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_annotation_counts()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY annotation_counts;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER annotation_change
AFTER INSERT OR UPDATE OR DELETE ON annotations
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_annotation_counts();

-- Partial indexes for common queries
CREATE INDEX idx_recent_annotations ON annotations(created_at DESC)
WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## 10. Security Architecture

### 10.1 Authentication Flow

```
User → Frontend → Supabase Auth
                      ↓
              Generate JWT Token
                      ↓
              Return to Frontend
                      ↓
            Store in HttpOnly Cookie
            (or localStorage for SPA)
                      ↓
        Include in Authorization Header
        for All API Requests
                      ↓
              Supabase validates JWT
              and checks RLS policies
```

### 10.2 Authorization Model

```typescript
// Role-based access control
enum ProjectRole {
  OWNER = 'owner',     // Full access
  EDITOR = 'editor',   // Can edit annotations, links
  VIEWER = 'viewer'    // Read-only
}

// Permission checks
async function canEditAnnotation(
  userId: string,
  annotationId: string
): Promise<boolean> {
  const annotation = await getAnnotation(annotationId);

  // Annotation owner can always edit
  if (annotation.user_id === userId) return true;

  // Check project role
  const role = await getProjectRole(userId, annotation.document.project_id);
  return role === ProjectRole.OWNER || role === ProjectRole.EDITOR;
}
```

### 10.3 Data Protection

```typescript
// Encrypt sensitive data before storage
async function encryptNote(note: string, userId: string): Promise<string> {
  const key = await getUserEncryptionKey(userId);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: generateIV() },
    key,
    new TextEncoder().encode(note)
  );
  return arrayBufferToBase64(encrypted);
}

// Sanitize user input
function sanitizeAnnotation(annotation: AnnotationInput): AnnotationInput {
  return {
    ...annotation,
    content: DOMPurify.sanitize(annotation.content),
    selected_text: sanitizeHTML(annotation.selected_text)
  };
}
```

---

## 11. Monitoring & Observability

### 11.1 Logging Strategy

```typescript
// Structured logging
import { Logger } from './utils/logger';

const logger = new Logger({
  service: 'close-reading-platform',
  environment: process.env.NODE_ENV
});

logger.info('Document processed', {
  documentId,
  userId,
  paragraphs: result.paragraphs.length,
  processingTime: endTime - startTime
});

logger.error('ML inference failed', {
  error: err.message,
  stack: err.stack,
  modelType,
  inputHash
});
```

### 11.2 Metrics Collection

```typescript
// Custom metrics
class Metrics {
  async trackDocumentUpload(documentId: string, metadata: any) {
    await supabase.from('metrics').insert({
      event_type: 'document_upload',
      entity_id: documentId,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  async trackMLInference(modelType: string, duration: number, cached: boolean) {
    await supabase.from('metrics').insert({
      event_type: 'ml_inference',
      metadata: { modelType, duration, cached },
      timestamp: new Date().toISOString()
    });
  }
}
```

### 11.3 Error Tracking

```typescript
// Sentry integration
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
});

// Wrap async operations
async function processDocument(documentId: string) {
  const transaction = Sentry.startTransaction({
    op: 'document.process',
    name: 'Process Document'
  });

  try {
    const result = await performProcessing(documentId);
    transaction.setStatus('ok');
    return result;
  } catch (err) {
    transaction.setStatus('internal_error');
    Sentry.captureException(err);
    throw err;
  } finally {
    transaction.finish();
  }
}
```

---

## 12. Scalability Considerations

### 12.1 Horizontal Scaling

- **Frontend**: Vercel's edge network provides automatic scaling
- **Backend**: Supabase scales PostgreSQL with read replicas
- **Workers**: Railway auto-scales based on load

### 12.2 Caching Strategy

```typescript
// Multi-tier caching
class CacheManager {
  // L1: Browser memory (fastest, smallest)
  private memoryCache = new Map<string, any>();

  // L2: IndexedDB (fast, larger)
  private idbCache: IDBDatabase;

  // L3: PostgreSQL (persistent, shared)
  private dbCache: SupabaseClient;

  async get(key: string): Promise<any> {
    // Try L1
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }

    // Try L2
    const idbResult = await this.getFromIDB(key);
    if (idbResult) {
      this.memoryCache.set(key, idbResult); // Promote to L1
      return idbResult;
    }

    // Try L3
    const dbResult = await this.getFromDB(key);
    if (dbResult) {
      await this.setInIDB(key, dbResult); // Promote to L2
      this.memoryCache.set(key, dbResult); // Promote to L1
      return dbResult;
    }

    return null;
  }
}
```

### 12.3 Database Partitioning

```sql
-- Partition activity_log by month
CREATE TABLE activity_log (
  id uuid DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  -- other columns
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE activity_log_2025_01 PARTITION OF activity_log
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE activity_log_2025_02 PARTITION OF activity_log
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Auto-create future partitions
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  partition_name text;
  start_date date;
  end_date date;
BEGIN
  start_date := date_trunc('month', CURRENT_DATE + interval '1 month');
  end_date := start_date + interval '1 month';
  partition_name := 'activity_log_' || to_char(start_date, 'YYYY_MM');

  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I PARTITION OF activity_log
    FOR VALUES FROM (%L) TO (%L)
  ', partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

---

## 13. Disaster Recovery

### 13.1 Backup Strategy

```yaml
# Automated backups
Supabase:
  - Daily full backups (retained 7 days)
  - Point-in-time recovery (7 days)
  - Manual snapshots before major releases

Railway:
  - Daily database dumps to S3
  - Worker service state is stateless (no backup needed)

Vercel:
  - Git-based deployments (version controlled)
  - Previous deployments retained for rollback
```

### 13.2 Failover Plan

```typescript
// Multi-region failover
const supabaseConfig = {
  primary: {
    url: process.env.VITE_SUPABASE_URL,
    key: process.env.VITE_SUPABASE_ANON_KEY
  },
  fallback: {
    url: process.env.VITE_SUPABASE_FALLBACK_URL,
    key: process.env.VITE_SUPABASE_FALLBACK_KEY
  }
};

class ResilientSupabaseClient {
  private primaryClient: SupabaseClient;
  private fallbackClient: SupabaseClient;

  async query(operation: () => Promise<any>): Promise<any> {
    try {
      return await operation();
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn('Primary region failed, trying fallback...');
        return await this.queryWithFallback(operation);
      }
      throw err;
    }
  }
}
```

---

## 14. Testing Strategy

### 14.1 Unit Tests

```typescript
// Component tests with React Testing Library
describe('AnnotationForm', () => {
  it('creates annotation with valid data', async () => {
    const onSubmit = vi.fn();
    render(<AnnotationForm onSubmit={onSubmit} />);

    await userEvent.type(
      screen.getByLabelText('Note'),
      'Important passage'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      content: 'Important passage',
      type: 'note'
    });
  });
});

// ML service tests
describe('MLService', () => {
  it('generates embeddings', async () => {
    const mlService = new MLService();
    await mlService.initialize();

    const embedding = await mlService.generateEmbedding('Test text');

    expect(embedding).toHaveLength(384); // Sentence-BERT dimension
    expect(embedding.every(n => typeof n === 'number')).toBe(true);
  });
});
```

### 14.2 Integration Tests

```typescript
// End-to-end workflow tests
describe('Document annotation workflow', () => {
  it('allows user to upload, annotate, and export document', async () => {
    // Upload document
    const file = new File(['Test content'], 'test.txt');
    await uploadDocument(file, 'Test Project');

    // Wait for processing
    await waitFor(() =>
      expect(screen.getByText('Processing complete')).toBeInTheDocument()
    );

    // Create annotation
    await selectText('Test content');
    await createAnnotation({ type: 'note', content: 'My note' });

    // Export
    const exportData = await exportProject('Test Project', 'json');
    expect(exportData.annotations).toHaveLength(1);
  });
});
```

### 14.3 Performance Tests

```typescript
// Load testing
describe('Performance benchmarks', () => {
  it('handles large documents efficiently', async () => {
    const largeText = 'Lorem ipsum '.repeat(10000); // ~100KB

    const startTime = performance.now();
    const { paragraphs } = await parseDocument(largeText);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(1000); // < 1 second
    expect(paragraphs.length).toBeGreaterThan(100);
  });

  it('generates embeddings in batch efficiently', async () => {
    const texts = Array(100).fill('Test paragraph');

    const startTime = performance.now();
    await mlService.batchGenerateEmbeddings(texts);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(5000); // < 5 seconds for 100
  });
});
```

---

## 15. Future Architecture Enhancements

### Phase 2 Features

1. **Real-time Collaboration**
   - Operational Transformation (OT) or CRDTs for conflict resolution
   - Presence indicators (who's viewing/editing)
   - Live cursor tracking

2. **Advanced ML Features**
   - Fine-tuned models for domain-specific analysis
   - Multi-language support
   - Sentiment analysis for annotations

3. **Mobile Native Apps**
   - React Native for iOS/Android
   - Shared business logic with web app
   - Offline-first architecture

4. **Graph Analytics**
   - Neo4j for complex link analysis
   - Community detection algorithms
   - Citation network visualization

### Scalability Roadmap

1. **Microservices Architecture**
   - Split workers into dedicated services
   - API gateway for routing
   - Service mesh for inter-service communication

2. **Event-Driven Architecture**
   - Apache Kafka for event streaming
   - Event sourcing for audit trail
   - CQRS for read/write separation

3. **Advanced Caching**
   - Redis for distributed caching
   - CDN for static assets
   - GraphQL query caching

---

## 16. Architecture Decision Records (ADRs)

### ADR-001: Frontend Framework Choice (React)

**Status**: Accepted

**Context**: Need modern, performant UI framework with strong ecosystem.

**Decision**: Use React with TypeScript for type safety.

**Consequences**:
- Large community and ecosystem
- Strong TypeScript support
- Excellent developer experience
- Familiar to most developers

### ADR-002: Backend Choice (Supabase)

**Status**: Accepted

**Context**: Need scalable backend with minimal maintenance overhead.

**Decision**: Use Supabase for auth, database, storage, and realtime.

**Consequences**:
- Reduces backend development time
- Automatic API generation
- Built-in auth and RLS
- Potential vendor lock-in (mitigated by PostgreSQL compatibility)

### ADR-003: Local ML Processing (WASM)

**Status**: Accepted

**Context**: Privacy concerns and API cost for ML features.

**Decision**: Use WASM-compiled neural networks for browser-based inference.

**Consequences**:
- Improved privacy (data stays local)
- Reduced API costs
- Works offline
- Increased bundle size (~5MB for WASM modules)
- Limited to models that run efficiently in browser

### ADR-004: State Management (Zustand)

**Status**: Accepted

**Context**: Need lightweight, performant state management.

**Decision**: Use Zustand instead of Redux or Context API.

**Consequences**:
- Minimal boilerplate
- Better performance than Context API
- TypeScript-friendly
- Smaller bundle size than Redux
- Less mature ecosystem than Redux

---

## 17. Conclusion

This system architecture provides a solid foundation for the Close-Reading Platform MVP while maintaining flexibility for future enhancements. Key strengths include:

- **Scalability**: Serverless architecture scales automatically
- **Performance**: WASM-based ML and multi-tier caching
- **Security**: RLS policies and JWT authentication
- **Privacy**: Local ML processing keeps data on device
- **Developer Experience**: Modern tech stack with strong typing

The architecture balances complexity and maintainability, focusing on delivering MVP features quickly while establishing patterns that will support Phase 2 and beyond.
