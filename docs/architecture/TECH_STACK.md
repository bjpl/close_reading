# Close-Reading Platform - Technology Stack

## 1. Overview

This document provides detailed information about every technology used in the Close-Reading Platform, including rationale, alternatives considered, and integration notes.

---

## 2. Frontend Technologies

### 2.1 Core Framework

#### React 18.3+
- **Purpose**: UI framework for building the web application
- **Why Chosen**:
  - Industry standard with massive ecosystem
  - Excellent TypeScript support
  - Concurrent features (Suspense, Transitions) for smooth UX
  - Server Components roadmap aligns with future needs
- **Alternatives Considered**:
  - Vue 3: Good but smaller ecosystem
  - Svelte: Great performance but less mature ecosystem
  - Angular: Too heavyweight for this project
- **Key Features Used**:
  - Concurrent rendering for smooth annotation interactions
  - Suspense for lazy loading document viewers
  - Custom hooks for annotation logic
  - Context for theme and settings
- **Resources**:
  - [React Docs](https://react.dev)
  - [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

#### Vite 5+
- **Purpose**: Build tool and development server
- **Why Chosen**:
  - Lightning-fast HMR (Hot Module Replacement)
  - Native ES modules support
  - Excellent TypeScript integration
  - Smaller bundle sizes than webpack
  - Built-in support for WASM
- **Alternatives Considered**:
  - Create React App: Deprecated, slow builds
  - Webpack: Slower, more configuration
  - Parcel: Less control over build process
- **Configuration Highlights**:
  ```typescript
  // vite.config.ts
  export default defineConfig({
    plugins: [react()],
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['@chakra-ui/react'],
            'ml-vendor': ['@ruv/fann-wasm', '@ruv/claude-flow']
          }
        }
      }
    },
    optimizeDeps: {
      exclude: ['@ruv/fann-wasm'] // WASM modules
    }
  });
  ```
- **Resources**:
  - [Vite Guide](https://vitejs.dev/guide/)

#### TypeScript 5.3+
- **Purpose**: Type-safe JavaScript superset
- **Why Chosen**:
  - Catches errors at compile time
  - Excellent IDE support (autocomplete, refactoring)
  - Self-documenting code
  - Required for Chakra UI v3
- **Configuration**:
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "lib": ["ES2020", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "jsx": "react-jsx",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "moduleResolution": "bundler",
      "resolveJsonModule": true,
      "allowImportingTsExtensions": true,
      "noEmit": true
    }
  }
  ```
- **Resources**:
  - [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

### 2.2 UI Framework

#### Chakra UI v3
- **Purpose**: Component library and design system
- **Why Chosen**:
  - Excellent accessibility (ARIA compliant)
  - Great TypeScript support
  - Themeable with tokens
  - Composable components
  - Built-in dark mode
- **Alternatives Considered**:
  - Material-UI: Heavier, opinions about design
  - Ant Design: Too corporate aesthetic
  - Tailwind + Headless UI: More manual work
  - Radix UI: More primitive, requires custom styling
- **Key Components Used**:
  - `Box`, `Flex`, `Stack` for layout
  - `Button`, `IconButton` for actions
  - `Modal`, `Drawer` for overlays
  - `Menu`, `Popover` for dropdowns
  - `useToast` for notifications
  - `useColorMode` for dark mode
- **Theme Configuration**:
  ```typescript
  const theme = extendTheme({
    config: {
      initialColorMode: 'light',
      useSystemColorMode: false
    },
    colors: {
      brand: {
        50: '#f0f9ff',
        500: '#3b82f6',
        900: '#1e3a8a'
      }
    },
    fonts: {
      heading: 'Inter, sans-serif',
      body: 'Inter, sans-serif'
    }
  });
  ```
- **Resources**:
  - [Chakra UI Docs](https://chakra-ui.com/)

### 2.3 State Management

#### Zustand 4+
- **Purpose**: Lightweight state management library
- **Why Chosen**:
  - Minimal boilerplate (no actions/reducers)
  - Excellent TypeScript inference
  - No context provider boilerplate
  - Built-in devtools
  - Middleware for persistence, immer, etc.
- **Alternatives Considered**:
  - Redux Toolkit: Too much boilerplate
  - Jotai/Recoil: Atomic state not needed here
  - Context API: Re-render issues, no devtools
- **Store Structure**:
  ```typescript
  interface AppStore {
    // State
    user: User | null;
    projects: Project[];
    activeDocument: Document | null;

    // Actions
    setUser: (user: User | null) => void;
    loadProjects: () => Promise<void>;
    createAnnotation: (data: AnnotationInput) => Promise<void>;

    // Computed
    projectCount: number;
    hasUnsavedChanges: boolean;
  }

  const useStore = create<AppStore>((set, get) => ({
    user: null,
    projects: [],
    activeDocument: null,

    setUser: (user) => set({ user }),

    loadProjects: async () => {
      const projects = await api.getProjects();
      set({ projects });
    },

    createAnnotation: async (data) => {
      const annotation = await api.createAnnotation(data);
      set((state) => ({
        activeDocument: {
          ...state.activeDocument,
          annotations: [...state.activeDocument.annotations, annotation]
        }
      }));
    },

    get projectCount() {
      return get().projects.length;
    },

    get hasUnsavedChanges() {
      return get().activeDocument?.isDirty ?? false;
    }
  }));
  ```
- **Middleware Used**:
  - `persist`: Save auth state to localStorage
  - `devtools`: Redux DevTools integration
  - `immer`: Immutable state updates
- **Resources**:
  - [Zustand Docs](https://docs.pmnd.rs/zustand/getting-started/introduction)

#### TanStack Query (React Query) v5
- **Purpose**: Server state management and caching
- **Why Chosen**:
  - Automatic caching and invalidation
  - Background refetching
  - Optimistic updates
  - Request deduplication
  - Offline support
- **Use Cases**:
  - Fetching projects/documents
  - Caching ML inference results
  - Polling for processing status
  - Infinite scroll for document list
- **Configuration**:
  ```typescript
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        retry: 1
      }
    }
  });

  // Usage
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.getProjects()
  });

  const { mutate: createAnnotation } = useMutation({
    mutationFn: (data: AnnotationInput) => api.createAnnotation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });
  ```
- **Resources**:
  - [TanStack Query Docs](https://tanstack.com/query/latest)

### 2.4 Routing

#### TanStack Router v1
- **Purpose**: Type-safe routing library
- **Why Chosen**:
  - 100% TypeScript-native
  - Type-safe params and search
  - Built-in data loading
  - Nested routes and layouts
  - Code splitting support
- **Alternatives Considered**:
  - React Router v6: Less type-safe
  - Next.js: Too opinionated for this project
- **Route Configuration**:
  ```typescript
  const rootRoute = createRootRoute({
    component: AppLayout
  });

  const projectsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/projects',
    component: ProjectsPage
  });

  const documentRoute = createRoute({
    getParentRoute: () => projectsRoute,
    path: '$projectId/documents/$documentId',
    parseParams: (params) => ({
      projectId: params.projectId as string,
      documentId: params.documentId as string
    }),
    loader: async ({ params }) => {
      const document = await api.getDocument(params.documentId);
      return { document };
    },
    component: DocumentPage
  });

  const routeTree = rootRoute.addChildren([
    projectsRoute.addChildren([documentRoute])
  ]);
  ```
- **Resources**:
  - [TanStack Router Docs](https://tanstack.com/router/latest)

### 2.5 Utilities

#### Lodash-ES 4.17+
- **Purpose**: Utility library for common operations
- **Why**: Tested, performant implementations
- **Key Functions Used**:
  - `debounce`, `throttle` for performance
  - `groupBy`, `sortBy` for data manipulation
  - `cloneDeep` for state updates
- **Resources**: [Lodash Docs](https://lodash.com/)

#### date-fns 3+
- **Purpose**: Date manipulation and formatting
- **Why Chosen**: Lightweight (tree-shakeable), immutable, i18n support
- **Alternatives**: Moment.js (deprecated), Day.js (less features)
- **Resources**: [date-fns Docs](https://date-fns.org/)

#### react-window 1.8+
- **Purpose**: Virtual scrolling for large lists
- **Why**: Handles documents with 1000+ paragraphs efficiently
- **Resources**: [react-window Docs](https://react-window.vercel.app/)

#### DOMPurify 3+
- **Purpose**: XSS protection for user-generated content
- **Why**: Sanitizes HTML in annotations and notes
- **Resources**: [DOMPurify GitHub](https://github.com/cure53/DOMPurify)

---

## 3. Backend Technologies

### 3.1 Backend-as-a-Service

#### Supabase
- **Purpose**: Complete backend platform (PostgreSQL + APIs + Auth + Storage + Realtime)
- **Why Chosen**:
  - Open-source (can self-host if needed)
  - Built on PostgreSQL (standard SQL)
  - Automatic REST and GraphQL APIs
  - Real-time subscriptions via WebSockets
  - Row Level Security (RLS) for data protection
  - Generous free tier
- **Alternatives Considered**:
  - Firebase: NoSQL limitations, vendor lock-in
  - AWS Amplify: More complex, expensive
  - Hasura: Requires separate database, more setup
  - Custom backend: More development time
- **Components Used**:

#### PostgreSQL 15+
- **Purpose**: Primary database
- **Features Used**:
  - JSONB columns for flexible data (paragraphs, sentences)
  - Full-text search with tsvector
  - Row Level Security (RLS) policies
  - Triggers for automation
  - Foreign keys and constraints
  - Materialized views for analytics
- **Extensions**:
  - `uuid-ossp`: UUID generation
  - `pg_trgm`: Fuzzy text search
  - `btree_gin`: Multicolumn indexes
- **Resources**: [PostgreSQL Docs](https://www.postgresql.org/docs/)

#### Supabase Auth
- **Purpose**: Authentication and authorization
- **Features**:
  - JWT-based sessions
  - Email/password authentication
  - OAuth providers (Google, GitHub)
  - Magic link authentication
  - Role-based access control
  - Multi-factor authentication (MFA)
- **Flow**:
  ```typescript
  // Sign up
  const { data, error } = await supabase.auth.signUp({
    email: 'user@example.com',
    password: 'password123',
    options: {
      data: {
        display_name: 'John Doe'
      }
    }
  });

  // Sign in
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'user@example.com',
    password: 'password123'
  });

  // OAuth
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://app.example.com/auth/callback'
    }
  });

  // Get session
  const { data: { session } } = await supabase.auth.getSession();

  // Listen to auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      // User signed in
    } else if (event === 'SIGNED_OUT') {
      // User signed out
    }
  });
  ```
- **Resources**: [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

#### Supabase Storage
- **Purpose**: File storage for uploaded documents
- **Features**:
  - S3-compatible API
  - Public and private buckets
  - RLS policies for access control
  - Automatic image optimization
  - CDN integration
- **Configuration**:
  ```typescript
  // Create bucket
  await supabase.storage.createBucket('documents', {
    public: false,
    fileSizeLimit: 52428800 // 50MB
  });

  // Upload file
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(`${userId}/${documentId}/original.pdf`, file, {
      cacheControl: '3600',
      upsert: false
    });

  // Download file
  const { data, error } = await supabase.storage
    .from('documents')
    .download(`${userId}/${documentId}/original.pdf`);

  // Get public URL (for public buckets)
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl('user1.png');
  ```
- **Resources**: [Supabase Storage Docs](https://supabase.com/docs/guides/storage)

#### Supabase Realtime
- **Purpose**: Real-time data synchronization for collaboration
- **Features**:
  - PostgreSQL Change Data Capture (CDC)
  - WebSocket connections
  - Presence tracking
  - Broadcast messaging
- **Usage**:
  ```typescript
  // Subscribe to database changes
  const channel = supabase
    .channel('document-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'annotations',
      filter: `document_id=eq.${documentId}`
    }, (payload) => {
      console.log('Change received!', payload);
      // Update UI
    })
    .subscribe();

  // Presence (who's online)
  const presenceChannel = supabase.channel('document-presence')
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      console.log('Online users:', state);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: userId,
          online_at: new Date().toISOString()
        });
      }
    });
  ```
- **Resources**: [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)

### 3.2 Worker Services

#### Railway
- **Purpose**: Platform for deploying worker services
- **Why Chosen**:
  - Simple deployment from GitHub
  - Automatic scaling
  - Built-in metrics and logs
  - Affordable pricing
  - PostgreSQL and Redis add-ons
- **Alternatives Considered**:
  - Heroku: More expensive, less features
  - Render: Similar but less mature
  - AWS Lambda: More complex setup
  - Fly.io: Good but less polished
- **Services Deployed**:
  - Document processing service (Node.js)
  - ML inference service (Python + ONNX)
  - Export generation service (Node.js)
  - OCR service (Tesseract.js)
- **Configuration**:
  ```json
  // railway.json
  {
    "build": {
      "builder": "NIXPACKS",
      "buildCommand": "npm install && npm run build"
    },
    "deploy": {
      "startCommand": "npm start",
      "healthcheckPath": "/health",
      "healthcheckTimeout": 300,
      "restartPolicyType": "ON_FAILURE",
      "restartPolicyMaxRetries": 3
    }
  }
  ```
- **Resources**: [Railway Docs](https://docs.railway.app/)

#### Node.js 20+
- **Purpose**: Runtime for worker services
- **Why**: JavaScript ecosystem, async/await, large community
- **Resources**: [Node.js Docs](https://nodejs.org/docs/latest/api/)

#### Express.js 4+
- **Purpose**: HTTP server framework for workers
- **Why**: Minimal, flexible, well-tested
- **Resources**: [Express Docs](https://expressjs.com/)

---

## 4. Machine Learning Stack

### 4.1 Browser-Based ML

#### ruvnet/ruv-FANN (WebAssembly)
- **Purpose**: Fast neural network library for generating sentence embeddings
- **Why Chosen**:
  - Compiles to WASM for browser execution
  - Memory-safe (written in Rust)
  - Optimized for inference
  - No external API calls needed
- **Features**:
  - Sentence embeddings (384-dimension vectors)
  - Cosine similarity calculations
  - Batch processing
  - Caching support
- **Integration**:
  ```typescript
  import init, { FannModel } from '@ruv/fann-wasm';

  class EmbeddingService {
    private model: FannModel | null = null;

    async initialize() {
      await init(); // Load WASM module
      this.model = await FannModel.load('/models/sentence-embeddings.fann');
    }

    async embed(text: string): Promise<number[]> {
      if (!this.model) throw new Error('Model not initialized');
      return this.model.embed(text);
    }

    async batchEmbed(texts: string[]): Promise<number[][]> {
      return this.model.batchEmbed(texts);
    }
  }
  ```
- **Model Details**:
  - Architecture: Sentence-BERT style transformer
  - Input: Text strings (max 512 tokens)
  - Output: 384-dimension embeddings
  - Size: ~3MB compressed
- **Resources**: [ruv-FANN GitHub](https://github.com/ruvnet/ruv-FANN)

#### ruvnet/claude-flow (WebAssembly)
- **Purpose**: NLP processing and cognitive models
- **Why Chosen**:
  - 27+ cognitive models
  - Part-of-speech tagging
  - Named entity recognition
  - Pattern recognition
  - WASM SIMD acceleration
- **Features Used**:
  - Tokenization and POS tagging
  - Key term extraction
  - Sentence classification
  - Dependency parsing
- **Integration**:
  ```typescript
  import { ClaudeFlow } from '@ruv/claude-flow';

  class NLPService {
    private cf: ClaudeFlow;

    async initialize() {
      this.cf = await ClaudeFlow.init({
        wasmPath: '/wasm/claude-flow.wasm',
        enableSIMD: true
      });
    }

    async extractTerms(text: string): Promise<Term[]> {
      const tokens = this.cf.nlp.tokenize(text);
      const pos = this.cf.nlp.posTag(tokens);

      return pos
        .filter(t => ['NN', 'NNP', 'VB'].includes(t.tag))
        .map(t => ({
          term: t.word,
          pos: t.tag,
          lemma: this.cf.nlp.lemmatize(t.word)
        }));
    }

    async classifySentence(sentence: string): Promise<string> {
      return this.cf.classify(sentence, {
        model: 'sentence-type',
        labels: ['declarative', 'interrogative', 'imperative']
      });
    }
  }
  ```
- **Resources**: [claude-flow GitHub](https://github.com/ruvnet/claude-flow)

#### ONNX Runtime Web 1.17+
- **Purpose**: Run ONNX models in the browser
- **Why Chosen**:
  - Cross-platform model format
  - WebAssembly + WebGL backends
  - Optimized for inference
  - Wide model support
- **Use Cases**:
  - Local summarization model
  - Custom fine-tuned models
- **Integration**:
  ```typescript
  import * as ort from 'onnxruntime-web';

  class ONNXInferenceService {
    private session: ort.InferenceSession | null = null;

    async loadModel(modelPath: string) {
      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['wasm', 'webgl']
      });
    }

    async infer(input: number[][]): Promise<number[][]> {
      const tensor = new ort.Tensor('float32', input.flat(), [input.length, input[0].length]);
      const feeds = { input: tensor };
      const results = await this.session.run(feeds);
      return results.output.data as number[][];
    }
  }
  ```
- **Resources**: [ONNX Runtime Web Docs](https://onnxruntime.ai/docs/tutorials/web/)

#### TensorFlow.js 4+
- **Purpose**: Optional fine-tuning and custom models
- **Why Chosen**:
  - Browser-based training
  - Pre-trained models
  - Transfer learning
- **Use Cases**:
  - Fine-tune sentence classification
  - Custom annotation type detection
- **Resources**: [TensorFlow.js Docs](https://www.tensorflow.org/js)

### 4.2 NLP Utilities

#### Compromise.js 14+
- **Purpose**: Lightweight NLP for quick term extraction
- **Why**: Fast, no dependencies, works offline
- **Features**: POS tagging, stemming, normalization
- **Resources**: [Compromise Docs](https://compromise.cool/)

#### WinkNLP 2+
- **Purpose**: Comprehensive NLP toolkit
- **Why**: Tokenization, entities, sentiment
- **Resources**: [WinkNLP Docs](https://winkjs.org/wink-nlp/)

### 4.3 Document Processing

#### pdf-parse 1.1+
- **Purpose**: Extract text from PDF files
- **Why**: Pure JavaScript, no external dependencies
- **Limitations**: Works best with text-based PDFs
- **Resources**: [pdf-parse npm](https://www.npmjs.com/package/pdf-parse)

#### mammoth.js 1.6+
- **Purpose**: Extract text from .docx files
- **Why**: Native OOXML parsing, preserves formatting
- **Resources**: [mammoth.js npm](https://www.npmjs.com/package/mammoth)

#### tesseract.js 5+
- **Purpose**: OCR for scanned PDFs and images
- **Why**: Pure JavaScript, WebAssembly-accelerated
- **Limitations**: Slower than cloud OCR, lower accuracy
- **Resources**: [tesseract.js Docs](https://tesseract.projectnaptha.com/)

---

## 5. Visualization Libraries

### 5.1 Graph Visualization

#### Cytoscape.js 3.28+
- **Purpose**: Interactive network visualization for paragraph links
- **Why Chosen**:
  - Highly performant (handles 1000+ nodes)
  - Flexible layout algorithms
  - Rich interaction API
  - Exportable to PNG/SVG
- **Alternatives Considered**:
  - D3.js: Lower-level, more work
  - Sigma.js: Limited layouts
  - vis.js: Less maintained
- **Features Used**:
  - Force-directed layout for link graphs
  - Node clustering
  - Interactive pan/zoom
  - Node/edge styling
- **Integration**:
  ```typescript
  import cytoscape from 'cytoscape';

  const cy = cytoscape({
    container: document.getElementById('graph'),
    elements: [
      { data: { id: 'p1', label: 'Paragraph 1' } },
      { data: { id: 'p2', label: 'Paragraph 2' } },
      { data: { source: 'p1', target: 'p2', strength: 0.85 } }
    ],
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'background-color': '#3b82f6',
          'width': 30,
          'height': 30
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 'data(strength)',
          'line-color': '#cbd5e1',
          'curve-style': 'bezier'
        }
      }
    ],
    layout: {
      name: 'cose', // Force-directed
      animate: true,
      idealEdgeLength: 100,
      nodeOverlap: 20
    }
  });
  ```
- **Resources**: [Cytoscape.js Docs](https://js.cytoscape.org/)

#### D3.js 7+
- **Purpose**: Custom visualizations and analytics
- **Why**: Flexible, powerful, standard
- **Use Cases**:
  - Annotation density heatmap
  - Citation network
  - Timeline view
- **Resources**: [D3 Docs](https://d3js.org/)

---

## 6. Development Tools

### 6.1 Testing

#### Vitest 1+
- **Purpose**: Unit and integration testing framework
- **Why Chosen**:
  - Vite-native (fast)
  - Jest-compatible API
  - Built-in coverage
  - TypeScript support
- **Configuration**:
  ```typescript
  // vitest.config.ts
  export default defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        exclude: ['node_modules/', 'src/test/']
      }
    }
  });
  ```
- **Resources**: [Vitest Docs](https://vitest.dev/)

#### React Testing Library 14+
- **Purpose**: Component testing utilities
- **Why**: Encourages accessibility, user-centric tests
- **Example**:
  ```typescript
  import { render, screen, userEvent } from '@testing-library/react';
  import { AnnotationForm } from './AnnotationForm';

  test('creates annotation', async () => {
    const onSubmit = vi.fn();
    render(<AnnotationForm onSubmit={onSubmit} />);

    await userEvent.type(
      screen.getByLabelText('Note'),
      'Important passage'
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Save' })
    );

    expect(onSubmit).toHaveBeenCalledWith({
      content: 'Important passage'
    });
  });
  ```
- **Resources**: [Testing Library Docs](https://testing-library.com/react)

#### Playwright 1.41+
- **Purpose**: End-to-end testing
- **Why**: Cross-browser, auto-wait, trace viewer
- **Resources**: [Playwright Docs](https://playwright.dev/)

### 6.2 Code Quality

#### ESLint 8+
- **Purpose**: JavaScript/TypeScript linting
- **Configuration**:
  ```json
  {
    "extends": [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:react/recommended",
      "plugin:react-hooks/recommended"
    ],
    "rules": {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "react/react-in-jsx-scope": "off"
    }
  }
  ```
- **Resources**: [ESLint Docs](https://eslint.org/)

#### Prettier 3+
- **Purpose**: Code formatting
- **Configuration**:
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "trailingComma": "es5",
    "printWidth": 100,
    "tabWidth": 2
  }
  ```
- **Resources**: [Prettier Docs](https://prettier.io/)

#### Husky 9+
- **Purpose**: Git hooks for pre-commit checks
- **Configuration**:
  ```bash
  # .husky/pre-commit
  npm run lint
  npm run typecheck
  npm test -- --run
  ```
- **Resources**: [Husky Docs](https://typicode.github.io/husky/)

### 6.3 Documentation

#### Storybook 8+
- **Purpose**: Component documentation and visual testing
- **Why**: Interactive component explorer, design system
- **Resources**: [Storybook Docs](https://storybook.js.org/)

---

## 7. Deployment & Infrastructure

### 7.1 Hosting

#### Vercel
- **Purpose**: Frontend hosting and edge functions
- **Why Chosen**:
  - Automatic deployments from Git
  - Global edge network
  - Instant rollbacks
  - Preview deployments for PRs
  - Serverless functions
- **Configuration**:
  ```json
  // vercel.json
  {
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "framework": "vite",
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "/wasm/(.*)",
        "headers": [
          { "key": "Content-Type", "value": "application/wasm" },
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      }
    ]
  }
  ```
- **Resources**: [Vercel Docs](https://vercel.com/docs)

### 7.2 CI/CD

#### GitHub Actions
- **Purpose**: Automated testing and deployment
- **Workflows**:
  - PR checks (lint, test, typecheck)
  - Deploy to staging on merge to `develop`
  - Deploy to production on merge to `main`
  - WASM builds
- **Resources**: [GitHub Actions Docs](https://docs.github.com/en/actions)

### 7.3 Monitoring

#### Sentry
- **Purpose**: Error tracking and performance monitoring
- **Features**:
  - JavaScript error tracking
  - Performance monitoring
  - Session replay
  - User feedback
- **Resources**: [Sentry Docs](https://docs.sentry.io/)

#### Vercel Analytics
- **Purpose**: Web vitals and traffic analytics
- **Metrics**: Core Web Vitals, page views, user journeys
- **Resources**: [Vercel Analytics](https://vercel.com/analytics)

---

## 8. Optional/Future Technologies

### 8.1 Caching

#### Redis (Optional)
- **Purpose**: Distributed caching for ML results
- **When**: When PostgreSQL cache becomes a bottleneck
- **Provider**: Railway Redis add-on

### 8.2 Advanced OCR

#### Google Cloud Vision API
- **Purpose**: High-accuracy OCR for complex PDFs
- **When**: Phase 2, when tesseract.js is insufficient
- **Cost**: $1.50 per 1000 images

### 8.3 Search

#### Meilisearch (Future)
- **Purpose**: Fast, typo-tolerant full-text search
- **When**: Phase 2, for advanced document search
- **Why**: Better than PostgreSQL full-text search
- **Resources**: [Meilisearch Docs](https://www.meilisearch.com/docs)

### 8.4 Graph Database

#### Neo4j (Future)
- **Purpose**: Advanced link analysis and citation networks
- **When**: Phase 2, for complex graph queries
- **Resources**: [Neo4j Docs](https://neo4j.com/docs/)

---

## 9. Technology Selection Criteria

When evaluating technologies for this project, we prioritize:

1. **Developer Experience**: Good docs, TypeScript support, active community
2. **Performance**: Bundle size, runtime speed, scalability
3. **Maintenance**: Long-term support, frequent updates, security
4. **Cost**: Free tier, affordable scaling
5. **Privacy**: Local processing where possible
6. **Flexibility**: Can swap out components if needed (no hard vendor lock-in)

---

## 10. Version Matrix

### Current Versions (as of MVP)

| Technology | Version | Release Date | Support Until |
|-----------|---------|--------------|---------------|
| React | 18.3.1 | April 2024 | Active |
| TypeScript | 5.3.3 | January 2024 | Active |
| Vite | 5.0.11 | January 2024 | Active |
| Chakra UI | 3.0.0-beta | December 2024 | Beta |
| Zustand | 4.5.0 | January 2024 | Active |
| TanStack Query | 5.17.9 | January 2024 | Active |
| TanStack Router | 1.14.0 | January 2024 | Active |
| Supabase JS | 2.39.3 | January 2024 | Active |
| ONNX Runtime Web | 1.17.0 | December 2023 | Active |
| Cytoscape.js | 3.28.1 | January 2024 | Active |
| Vitest | 1.2.0 | January 2024 | Active |
| Node.js | 20.11.0 | January 2024 | April 2026 |

---

## 11. Migration Paths

### If We Need to Migrate

#### From Supabase
- **To**: Custom PostgreSQL + Auth service + S3
- **Difficulty**: Medium (database schema is standard SQL)
- **Time**: 2-3 weeks

#### From Vercel
- **To**: Netlify, Railway, or Cloudflare Pages
- **Difficulty**: Low (static build)
- **Time**: 1-2 days

#### From Railway Workers
- **To**: AWS Lambda, Google Cloud Functions, or Fly.io
- **Difficulty**: Low (containerized services)
- **Time**: 3-5 days

---

## 12. Conclusion

This tech stack balances:
- **Modern**: Latest stable versions, future-proof
- **Performant**: WASM, caching, virtual scrolling
- **Private**: Local ML processing
- **Scalable**: Serverless, auto-scaling
- **Maintainable**: Strong typing, good docs, active communities
- **Cost-effective**: Generous free tiers, pay-as-you-grow

All technologies are either open-source or have open-source alternatives, ensuring we're never locked into proprietary systems.
