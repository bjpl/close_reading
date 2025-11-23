# Architecture Diagrams
# AI Research Platform - Visual System Design

**Version:** 1.0
**Date:** November 11, 2025
**Architect:** System Architect Agent

---

## 1. System Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                          EXTERNAL ACTORS                                │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │   Graduate   │  │ Independent  │  │   Educator   │                │
│  │   Student    │  │   Scholar    │  │              │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│         │                  │                  │                         │
└─────────┼──────────────────┼──────────────────┼─────────────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    AI RESEARCH PLATFORM                                 │
│                    (Close Reading System)                               │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │                    Web Application                           │     │
│  │              (React + TypeScript + Chakra UI)                │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
          │                  │                  │
          ↓                  ↓                  ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase   │  │  Claude API  │  │    Ollama    │
│  (Backend)   │  │   (Cloud)    │  │   (Local)    │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 2. Layered Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LAYER 0: PRESENTATION                           │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  React Components │ Zustand State │ TanStack Router/Query   │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER 1: CORE RESEARCH LIBRARY                       │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐    │
│  │  Document    │  Citation    │ Annotation   │   Project        │    │
│  │  Manager     │  Handler     │  System      │   Manager        │    │
│  └──────────────┴──────────────┴──────────────┴──────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                     LAYER 2: SEMANTIC SEARCH                            │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐    │
│  │ ONNX Runtime │  Embedding   │   Vector     │   Similarity     │    │
│  │              │  Service     │   Store      │   Engine         │    │
│  └──────────────┴──────────────┴──────────────┴──────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      LAYER 3: AI INTEGRATION                            │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐    │
│  │ Claude API   │   Prompt     │   Response   │   AI Service     │    │
│  │   Client     │  Templates   │    Cache     │                  │    │
│  └──────────────┴──────────────┴──────────────┴──────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         LAYER 4: PRIVACY                                │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐    │
│  │   Ollama     │  LLM Router  │   Privacy    │   Data           │    │
│  │   Client     │              │  Settings    │   Sanitizer      │    │
│  └──────────────┴──────────────┴──────────────┴──────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER 5: DATA PERSISTENCE                            │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐    │
│  │  PostgreSQL  │   Storage    │  IndexedDB   │   ML Cache       │    │
│  │  (Supabase)  │    (S3)      │   (Client)   │   (Hybrid)       │    │
│  └──────────────┴──────────────┴──────────────┴──────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER UPLOADS DOCUMENT                            │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
                        [DocumentUpload Component]
                                ↓
                        [Document Manager]
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
           [Storage Service]        [Document Repository]
                    ↓                       ↓
              Upload to S3           Create DB Record
                    ↓                       ↓
                    └───────────┬───────────┘
                                ↓
                        [Document Parser]
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
           Extract Text              Parse Structure
         (PDF/DOCX/TXT)           (Paragraphs/Sentences)
                    ↓                       ↓
                    └───────────┬───────────┘
                                ↓
                     Update Document Record
                                ↓
                        [Event Bus Publish]
                   ("document.parsed" event)
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
         [Embedding Service]        [UI Update Subscription]
                    ↓                       ↓
         Generate Embeddings          Refresh Document View
                    ↓
              Cache Results
         (Memory → IndexedDB → PostgreSQL)
```

---

## 4. Data Flow: Semantic Search

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    USER SEARCHES FOR SIMILAR TEXT                       │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
                    [Similarity Search Component]
                                ↓
                        [Embedding Service]
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
           [Embedding Cache]         [ONNX Service]
                    ↓                       ↓
        Check Memory Cache          Load WASM Model
                    ↓                       ↓
        Check IndexedDB             Tokenize Query
                    ↓                       ↓
        Check PostgreSQL          Generate Embedding
                    ↓                       ↓
            Cache Hit?                  Cache Miss
                    ↓                       ↓
                    └───────────┬───────────┘
                                ↓
                      Return Query Embedding
                                ↓
                        [Vector Store]
                                ↓
                    Calculate Cosine Similarity
                    for all paragraph embeddings
                                ↓
                        Sort by Similarity
                                ↓
                        Return Top K Results
                                ↓
                    [UI Displays Suggestions]
```

---

## 5. AI Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 USER REQUESTS TEXT SUMMARIZATION                        │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
                        [AI Service]
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
         [Response Cache]            [Privacy Check]
                    ↓                       ↓
        Check for cached           Contains sensitive data?
            response                       ↓
                    ↓                  ┌───┴───┐
            Cache Hit?                 │       │
                    ↓              Yes  ↓       ↓  No
                    └──────────────[Sanitize]  │
                                        ↓       │
                                [LLM Router]────┘
                                        ↓
                            ┌───────────┴───────────┐
                            ↓                       ↓
                     [Ollama Available?]      [Use Claude]
                            ↓                       ↓
                    ┌───────┴───────┐               │
                Yes ↓               ↓ No            │
            [Ollama Client]    [Claude Client]←─────┘
                    ↓               ↓
            Local Inference   Cloud API Call
                    ↓               ↓
                    └───────┬───────┘
                            ↓
                    [Prompt Template]
                            ↓
                    Generate Prompt
                            ↓
                    Call LLM (with retry)
                            ↓
                    Parse Response
                            ↓
                    Cache Response
                            ↓
                    Return to User
```

---

## 6. Privacy Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INPUT TEXT                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
                        [Privacy Settings]
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
         Check "Prefer Local"     Check "Require Local
                                    for Sensitive Data"
                    ↓                       ↓
                    └───────────┬───────────┘
                                ↓
                        [Data Sanitizer]
                                ↓
                    Scan for PII patterns:
                    - SSN (###-##-####)
                    - Credit Card (####-####-####-####)
                    - Email (user@domain.com)
                    - Phone (###-###-####)
                    - IP Address (###.###.###.###)
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
         Sensitive Data Found?              No
                    ↓                       ↓
                Yes │                   Route based on
                    ↓                   availability & preference
            [Apply Redaction]               ↓
                    ↓                       │
            Replace PII with                │
            placeholder text                │
                    ↓                       │
         [Force Local Processing]           │
                    ↓                       │
                    └───────────┬───────────┘
                                ↓
                        [LLM Router]
                                ↓
                    ┌───────────┴───────────┐
                    ↓                       ↓
         [Ollama Client]            [Claude Client]
         (Local, Private)          (Cloud, Powerful)
```

---

## 7. Multi-Tier Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     REQUEST EMBEDDING FOR TEXT                          │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
                        [Embedding Cache]
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           LEVEL 1: MEMORY                               │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  Map<textId, embedding[]>                                    │      │
│  │  - Fastest (nanoseconds)                                     │      │
│  │  - Limited size (1000 entries, LRU eviction)                 │      │
│  │  - Volatile (cleared on page reload)                         │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓ (if not in L1)
┌─────────────────────────────────────────────────────────────────────────┐
│                         LEVEL 2: INDEXEDDB                              │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  ObjectStore("embeddings")                                   │      │
│  │  - Fast (milliseconds)                                       │      │
│  │  - Large size (50MB+ quota)                                  │      │
│  │  - Persistent (survives page reload)                         │      │
│  │  - Offline available                                         │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓ (if not in L2)
┌─────────────────────────────────────────────────────────────────────────┐
│                        LEVEL 3: POSTGRESQL                              │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  ml_cache table                                              │      │
│  │  - Slower (100-500ms)                                        │      │
│  │  - Unlimited size                                            │      │
│  │  - Shared across devices                                     │      │
│  │  - Backed up automatically                                   │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓ (if not in L3)
┌─────────────────────────────────────────────────────────────────────────┐
│                    GENERATE NEW EMBEDDING                               │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  ONNX Runtime Web                                            │      │
│  │  - Load WASM model                                           │      │
│  │  - Tokenize text                                             │      │
│  │  - Run inference (~200ms)                                    │      │
│  │  - Return 384-dim vector                                     │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      CACHE IN ALL LEVELS                                │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  Write to L1 (Memory)                                        │      │
│  │  Write to L2 (IndexedDB)                                     │      │
│  │  Write to L3 (PostgreSQL)                                    │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Week-by-Week Implementation Roadmap

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              WEEK 1                                     │
│                    Core Research Library Layer                          │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  • Document Manager (upload, parse, storage)                 │      │
│  │  • Citation Handler (BibTeX, RIS, JSON export)               │      │
│  │  • Annotation System (create, update, delete)                │      │
│  │  • Project Manager (organize, share)                         │      │
│  │                                                              │      │
│  │  Deliverables:                                               │      │
│  │  ✓ Document upload and parsing                               │      │
│  │  ✓ Annotation CRUD operations                                │      │
│  │  ✓ Citation export in 3 formats                              │      │
│  │  ✓ 90%+ test coverage                                        │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              WEEK 2                                     │
│                      Semantic Search Layer                              │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  • ONNX Runtime Integration (WASM model loading)             │      │
│  │  • Embedding Service (generate & cache embeddings)           │      │
│  │  • Vector Store (in-memory similarity search)                │      │
│  │  • Multi-tier Cache (Memory → IndexedDB → PostgreSQL)        │      │
│  │                                                              │      │
│  │  Deliverables:                                               │      │
│  │  ✓ Browser-based ML inference                                │      │
│  │  ✓ Fast similarity search (<100ms)                           │      │
│  │  ✓ 3-tier caching system                                     │      │
│  │  ✓ 85%+ test coverage                                        │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              WEEK 3                                     │
│                       AI Integration Layer                              │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  • Claude API Client (with retry & rate limiting)            │      │
│  │  • Prompt Templates (reusable, versioned)                    │      │
│  │  • Response Cache (7-day TTL)                                │      │
│  │  • AI Service (summarize, extract terms, Q&A)                │      │
│  │                                                              │      │
│  │  Deliverables:                                               │      │
│  │  ✓ Claude API integration                                    │      │
│  │  ✓ Streaming responses                                       │      │
│  │  ✓ Response caching                                          │      │
│  │  ✓ 90%+ test coverage                                        │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              WEEK 4                                     │
│                          Privacy Layer                                  │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  • Ollama Integration (local LLM support)                    │      │
│  │  • LLM Router (intelligent local/cloud routing)              │      │
│  │  • Privacy Settings (user-configurable controls)             │      │
│  │  • Data Sanitizer (PII detection & redaction)                │      │
│  │                                                              │      │
│  │  Deliverables:                                               │      │
│  │  ✓ Local LLM processing                                      │      │
│  │  ✓ Privacy-aware routing                                     │      │
│  │  ✓ PII detection & sanitization                              │      │
│  │  ✓ 85%+ test coverage                                        │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              WEEK 5                                     │
│                        Production Layer                                 │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  • API Design (RESTful endpoints)                            │      │
│  │  • Performance Monitoring (Sentry integration)               │      │
│  │  • Deployment Config (Docker, Vercel, CI/CD)                 │      │
│  │  • Load Testing & Optimization                               │      │
│  │                                                              │      │
│  │  Deliverables:                                               │      │
│  │  ✓ Production API                                            │      │
│  │  ✓ CI/CD pipeline                                            │      │
│  │  ✓ Performance monitoring                                    │      │
│  │  ✓ 90%+ test coverage                                        │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            INTERNET                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         VERCEL EDGE NETWORK                             │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  • Global CDN (150+ locations)                               │      │
│  │  • Static asset serving                                      │      │
│  │  • WASM module caching                                       │      │
│  │  • Edge functions                                            │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                       REACT APPLICATION                                 │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  • Client-side routing (TanStack Router)                     │      │
│  │  • State management (Zustand)                                │      │
│  │  • UI components (Chakra UI)                                 │      │
│  │  • Service workers (offline support)                         │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
          │                   │                   │
          ↓                   ↓                   ↓
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   SUPABASE       │  │   CLAUDE API     │  │   OLLAMA         │
│                  │  │                  │  │                  │
│  • PostgreSQL    │  │  • Text          │  │  • Local LLM     │
│  • Auth (JWT)    │  │    generation    │  │    (Qwen 32B)    │
│  • Storage (S3)  │  │  • Streaming     │  │  • Privacy-first │
│  • Realtime      │  │  • Function      │  │  • Offline       │
│    (WebSockets)  │  │    calling       │  │    capable       │
│                  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 10. Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER 1: AUTHENTICATION                              │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  Supabase Auth                                               │      │
│  │  • JWT tokens (httpOnly cookies)                             │      │
│  │  • Email/password authentication                             │      │
│  │  • OAuth2 (Google, GitHub)                                   │      │
│  │  • Session management                                        │      │
│  │  • MFA support                                               │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER 2: AUTHORIZATION                               │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  Row Level Security (RLS)                                    │      │
│  │  • User owns their projects                                  │      │
│  │  • Shared projects (read-only or editor)                     │      │
│  │  • Public projects (anyone can view)                         │      │
│  │  • Role-based access control (RBAC)                          │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                   LAYER 3: DATA PROTECTION                              │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  Encryption                                                  │      │
│  │  • At rest: AES-256 (database, storage)                      │      │
│  │  • In transit: TLS 1.3 (all connections)                     │      │
│  │  • Client-side: Web Crypto API (sensitive data)              │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                  LAYER 4: INPUT VALIDATION                              │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  Sanitization                                                │      │
│  │  • XSS prevention (DOMPurify)                                │      │
│  │  • SQL injection prevention (parameterized queries)          │      │
│  │  • File type validation                                      │      │
│  │  • Size limits                                               │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                   LAYER 5: RATE LIMITING                                │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  Request Throttling                                          │      │
│  │  • 100 requests/minute per user                              │      │
│  │  • 1000 requests/hour per IP                                 │      │
│  │  • Exponential backoff for API calls                         │      │
│  │  • Token bucket algorithm                                    │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                 LAYER 6: PRIVACY CONTROLS                               │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  PII Protection                                              │      │
│  │  • Automatic PII detection                                   │      │
│  │  • Data sanitization before cloud processing                 │      │
│  │  • Local processing for sensitive data                       │      │
│  │  • User-configurable privacy settings                        │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       APPLICATION INSTRUMENTATION                       │
└─────────────────────────────────────────────────────────────────────────┘
          │                   │                   │
          ↓                   ↓                   ↓
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   ERROR          │  │   PERFORMANCE    │  │   BUSINESS       │
│   TRACKING       │  │   MONITORING     │  │   METRICS        │
│                  │  │                  │  │                  │
│  • Sentry        │  │  • Sentry APM    │  │  • Custom events │
│  • Stack traces  │  │  • Response time │  │  • User actions  │
│  • User context  │  │  • Throughput    │  │  • Feature usage │
│  • Breadcrumbs   │  │  • Database      │  │  • Conversion    │
│  • Session       │  │    query time    │  │    funnel        │
│    replay        │  │  • API latency   │  │                  │
│                  │  │  • Cache hit     │  │                  │
│                  │  │    rate          │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
          │                   │                   │
          └───────────────────┴───────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                       CENTRALIZED DASHBOARD                             │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  Real-time Metrics                                           │      │
│  │  • Request volume (requests/min)                             │      │
│  │  • Error rate (errors/total requests)                        │      │
│  │  • Average response time (p50, p95, p99)                     │      │
│  │  • Active users (concurrent sessions)                        │      │
│  │  • ML inference time (ms/request)                            │      │
│  │  • Cache hit rate (hits/total requests)                      │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                           ALERTING RULES                                │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  Automated Alerts                                            │      │
│  │  • Error rate > 5% (critical)                                │      │
│  │  • Response time > 2s (warning)                              │      │
│  │  • Database connection errors (critical)                     │      │
│  │  • ML service failures (warning)                             │      │
│  │  • Cache hit rate < 70% (info)                               │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Disaster Recovery & Business Continuity

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKUP STRATEGY                                │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   DAILY BACKUPS  │     │  WEEKLY BACKUPS  │     │ MANUAL SNAPSHOTS │
│                  │     │                  │     │                  │
│  • Database      │     │  • Full database │     │  • Before major  │
│    incremental   │     │    dump          │     │    releases      │
│  • Retention:    │     │  • All storage   │     │  • Testing       │
│    7 days        │     │    buckets       │     │    environments  │
│  • Auto at 2 AM  │     │  • Retention:    │     │  • Manual        │
│    UTC           │     │    30 days       │     │    trigger       │
└──────────────────┘     └──────────────────┘     └──────────────────┘
          │                       │                       │
          └───────────────────────┴───────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                       BACKUP STORAGE                                    │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │  Multi-Region Replication                                    │      │
│  │  • Primary: US East (N. Virginia)                            │      │
│  │  • Secondary: EU West (Ireland)                              │      │
│  │  • Tertiary: Asia Pacific (Singapore)                        │      │
│  └──────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        FAILOVER STRATEGY                                │
└─────────────────────────────────────────────────────────────────────────┘

        PRIMARY REGION DOWN
                ↓
    Automatic Health Check
           Detects Failure
                ↓
┌───────────────────────────────┐
│    FAILOVER SEQUENCE          │
│                               │
│  1. DNS update (30 seconds)   │
│  2. Route traffic to          │
│     secondary region          │
│  3. Promote read replica      │
│     to primary database       │
│  4. Update application        │
│     configuration             │
│  5. Notify operations team    │
└───────────────────────────────┘
                ↓
    SECONDARY REGION ACTIVE
         (RTO: 5 minutes)
        (RPO: 1 minute)
```

---

**End of Architecture Diagrams**

These diagrams provide visual representations of the system architecture, data flows, and integration patterns. Use them in conjunction with the detailed 5-Week Modular Architecture document for comprehensive understanding.
