# Architectural Decisions and Patterns

**Document Version:** 1.0
**Last Updated:** 2025-11-10
**Status:** Active

## Table of Contents

1. [Overview](#overview)
2. [Core Architectural Principles](#core-architectural-principles)
3. [Pattern Catalog](#pattern-catalog)
4. [Decision Matrix](#decision-matrix)
5. [Code Organization](#code-organization)
6. [Migration Guide](#migration-guide)
7. [Code Review Checklist](#code-review-checklist)
8. [Examples](#examples)

---

## Overview

This document defines the architectural patterns and conventions used in the Close Reading Platform. It serves as a reference for maintaining consistency across the codebase and guides developers on when to use functional vs. class-based patterns.

### Architectural Goals

- **Predictability**: Developers should immediately understand the pattern based on the file's purpose
- **Testability**: All code should be easily testable with minimal mocking
- **Performance**: Choose patterns that optimize for the use case
- **Maintainability**: Prefer simple, clear patterns over clever abstractions

---

## Core Architectural Principles

### 1. Functional Programming by Default

**Principle**: Use functional programming (pure functions, immutability) as the default pattern for most code.

**Rationale**:
- Easier to test (no state to manage)
- Easier to reason about (inputs → outputs)
- Better for tree-shaking and code splitting
- Aligns with React's functional component model

### 2. Classes for Stateful Services

**Principle**: Use class-based architecture only when managing complex internal state or lifecycle.

**Rationale**:
- Encapsulates state and behavior together
- Provides clear initialization/disposal lifecycle
- Singleton pattern for shared services
- Better for services with multiple interdependent methods

### 3. React Hooks for UI State

**Principle**: Use React hooks for all UI-related state management and side effects.

**Rationale**:
- Idiomatic React pattern
- Composable and reusable
- Built-in optimization (useMemo, useCallback)
- Aligns with React's mental model

### 4. Zustand for Global State

**Principle**: Use Zustand stores for global application state that needs to be shared across components.

**Rationale**:
- Lightweight and performant
- Simple API with minimal boilerplate
- TypeScript-first design
- Easy to test and debug

---

## Pattern Catalog

### Pattern 1: Pure Function Services

**When to Use**:
- Data transformation and formatting
- Export/import operations
- Parsing and validation
- Utility functions
- Stateless operations

**Characteristics**:
- Export named functions
- Each function is pure (same input → same output)
- No internal state
- No side effects (except I/O in async functions)
- All functions accept parameters, return values

**File Structure**:
```typescript
/**
 * Service description
 */

// Type definitions
export interface InputType { ... }
export interface OutputType { ... }

// Pure functions
export function transformData(input: InputType): OutputType {
  // Implementation
}

export function validateData(input: InputType): boolean {
  // Implementation
}
```

**Examples in Codebase**:
- `/src/services/annotationExport.ts` - Export annotations in various formats
- `/src/services/textParsing.ts` - Parse documents into paragraphs/sentences
- `/src/services/citationExport.ts` - Export citations in multiple formats
- `/src/utils/dateUtils.ts` - Date parsing and formatting utilities

### Pattern 2: Class-Based Stateful Services

**When to Use**:
- ML/AI services with model initialization
- Services with complex initialization
- Caching layers with internal state
- Services requiring cleanup/disposal
- Singleton services shared across the app

**Characteristics**:
- Export a class definition
- Internal state managed via private properties
- Initialization/disposal lifecycle methods
- Often used with singleton pattern
- Factory function for instance creation

**File Structure**:
```typescript
/**
 * Service description
 */

// Type definitions
export interface ServiceConfig { ... }

// Main class
export class ServiceName {
  private state: InternalState;
  private isInitialized = false;

  constructor(config?: ServiceConfig) {
    // Setup
  }

  async initialize(): Promise<void> {
    // Async initialization
  }

  public async operation(): Promise<Result> {
    // Public methods
  }

  dispose(): void {
    // Cleanup
  }
}

// Singleton factory (optional)
let instance: ServiceName | null = null;

export function getServiceInstance(): ServiceName {
  if (!instance) {
    instance = new ServiceName();
  }
  return instance;
}
```

**Examples in Codebase**:
- `/src/services/ml/embeddings.ts` - EmbeddingService with TensorFlow.js model
- `/src/services/ml/cache.ts` - EmbeddingCache with multi-layer caching
- `/src/lib/mockSupabase.ts` - MockSupabaseClient with database simulation

### Pattern 3: Custom React Hooks

**When to Use**:
- Encapsulating component logic
- Sharing stateful logic between components
- API data fetching and mutations
- Form state management
- Authentication state

**Characteristics**:
- Named with `use` prefix
- Return object with state and operations
- Can use other hooks internally
- Export a single hook function
- Export TypeScript return type

**File Structure**:
```typescript
/**
 * Hook description
 */

export interface UseHookNameReturn {
  data: DataType | null;
  loading: boolean;
  error: Error | null;
  operation: (params: Params) => Promise<void>;
}

export const useHookName = (deps?: Dependencies): UseHookNameReturn => {
  const [state, setState] = useState<DataType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const operation = async (params: Params) => {
    // Implementation
  };

  useEffect(() => {
    // Side effects
  }, [deps]);

  return {
    data: state,
    loading,
    error,
    operation,
  };
};
```

**Examples in Codebase**:
- `/src/hooks/useAuth.ts` - Authentication state and operations
- `/src/hooks/useAnnotations.ts` - Annotation CRUD operations
- `/src/hooks/useDocuments.ts` - Document management
- `/src/hooks/useProjects.ts` - Project management

### Pattern 4: Functional React Components

**When to Use**:
- All UI components
- Layout components
- Presentational components
- Container components

**Characteristics**:
- Functional component with TypeScript props interface
- Use hooks for state and effects
- Export component as named export or default
- Props interface exported for testing

**File Structure**:
```typescript
/**
 * Component description
 */

interface ComponentNameProps {
  prop1: string;
  prop2?: number;
  onAction?: () => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  prop1,
  prop2,
  onAction,
}) => {
  const [localState, setLocalState] = useState<Type>(initialValue);

  const handleEvent = useCallback(() => {
    // Event handler
  }, [dependencies]);

  useEffect(() => {
    // Side effects
  }, [dependencies]);

  return (
    <Box>
      {/* JSX */}
    </Box>
  );
};
```

**Examples in Codebase**:
- `/src/components/DocumentViewer.tsx`
- `/src/components/AnnotationListItem.tsx`
- `/src/components/ProjectDashboard.tsx`

### Pattern 5: Zustand State Stores

**When to Use**:
- Global application state
- State shared across multiple components
- Complex state with multiple actions
- State that needs to persist across route changes

**Characteristics**:
- Single store per domain (documents, annotations, projects)
- Actions are methods on the store
- Minimal boilerplate
- TypeScript interface for state

**File Structure**:
```typescript
/**
 * Store description
 */

interface StoreState {
  // State properties
  data: DataType[];
  currentItem: DataType | null;

  // Actions
  setData: (data: DataType[]) => void;
  addItem: (item: DataType) => void;
  updateItem: (id: string, updates: Partial<DataType>) => void;
  deleteItem: (id: string) => void;
}

export const useStoreName = create<StoreState>((set) => ({
  // Initial state
  data: [],
  currentItem: null,

  // Action implementations
  setData: (data) => set({ data }),

  addItem: (item) =>
    set((state) => ({
      data: [...state.data, item],
    })),

  updateItem: (id, updates) =>
    set((state) => ({
      data: state.data.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),

  deleteItem: (id) =>
    set((state) => ({
      data: state.data.filter((item) => item.id !== id),
    })),
}));
```

**Examples in Codebase**:
- `/src/stores/documentStore.ts` - Document state
- `/src/stores/annotationStore.ts` - Annotation state
- `/src/stores/projectStore.ts` - Project state

---

## Decision Matrix

Use this matrix to decide which pattern to use:

| Criteria | Pure Functions | Class-Based | React Hook | Zustand Store |
|----------|---------------|-------------|------------|---------------|
| **No State** | ✅ Perfect | ❌ Overkill | ❌ Wrong | ❌ Wrong |
| **UI State** | ❌ Wrong | ❌ Wrong | ✅ Perfect | ⚠️ If global |
| **Complex Initialization** | ❌ Difficult | ✅ Perfect | ⚠️ Possible | ❌ Wrong |
| **Needs Cleanup** | ❌ Difficult | ✅ Perfect | ⚠️ Possible | ❌ Wrong |
| **Singleton Service** | ⚠️ Module scope | ✅ Perfect | ❌ Wrong | ❌ Wrong |
| **Data Transformation** | ✅ Perfect | ❌ Overkill | ❌ Wrong | ❌ Wrong |
| **API Calls** | ⚠️ Possible | ⚠️ Possible | ✅ Perfect | ❌ Wrong |
| **Global State** | ❌ Wrong | ❌ Wrong | ❌ Wrong | ✅ Perfect |
| **Easy to Test** | ✅ Perfect | ⚠️ Moderate | ⚠️ Moderate | ⚠️ Moderate |

### Decision Tree

```
Is this UI-related?
├─ Yes → Is it global state?
│   ├─ Yes → Zustand Store
│   └─ No → React Hook
└─ No → Does it manage state?
    ├─ Yes → Does it need initialization/cleanup?
    │   ├─ Yes → Class-Based Service
    │   └─ No → Pure Functions with module-level state (rare)
    └─ No → Pure Functions
```

---

## Code Organization

### Directory Structure

```
src/
├── components/          # React components (Functional)
├── hooks/              # Custom hooks (React Hooks)
├── services/           # Business logic
│   ├── *.ts            # Pure function services
│   └── ml/             # ML services (Class-based)
├── stores/             # Zustand stores
├── utils/              # Utility functions (Pure)
├── lib/                # Third-party integrations (Mixed)
└── types/              # TypeScript definitions
```

### Naming Conventions

#### Files
- **Components**: `PascalCase.tsx` (e.g., `DocumentViewer.tsx`)
- **Hooks**: `useCamelCase.ts` (e.g., `useAuth.ts`)
- **Services**: `camelCase.ts` (e.g., `annotationExport.ts`)
- **Stores**: `camelCaseStore.ts` (e.g., `documentStore.ts`)
- **Utils**: `camelCase.ts` (e.g., `dateUtils.ts`)
- **Types**: `camelCase.ts` or `index.ts` (e.g., `citation.ts`, `index.ts`)

#### Exports
- **Pure Functions**: Named exports (e.g., `export function parseDocument()`)
- **Classes**: Named class export + optional factory (e.g., `export class EmbeddingService`)
- **Hooks**: Named export with `use` prefix (e.g., `export const useAuth`)
- **Components**: Named or default export (e.g., `export const DocumentViewer` or `export default`)
- **Stores**: Named export with `use` prefix (e.g., `export const useDocumentStore`)

#### Interfaces and Types
- **Props**: `ComponentNameProps` (e.g., `DocumentViewerProps`)
- **Return Types**: `UseHookNameReturn` (e.g., `UseAuthReturn`)
- **Service Interfaces**: Descriptive names (e.g., `ExportOptions`, `ParsedDocument`)
- **Type Aliases**: Use `type` for unions/intersections, `interface` for objects

---

## Migration Guide

### Migrating from Class to Pure Functions

**When to Migrate**:
- Class has no internal state
- Methods don't depend on each other
- No initialization/cleanup needed

**Steps**:
1. Extract each method as a standalone function
2. Convert instance properties to function parameters
3. Remove `this` references
4. Export functions individually
5. Update imports in consuming code
6. Add tests for each function

**Example**:
```typescript
// Before (Class)
class TextParser {
  private options: ParserOptions;

  constructor(options: ParserOptions) {
    this.options = options;
  }

  parse(text: string): ParsedText {
    // Implementation using this.options
  }
}

// After (Pure Functions)
export function parseText(text: string, options: ParserOptions): ParsedText {
  // Implementation using options parameter
}
```

### Migrating from Pure Functions to Class

**When to Migrate**:
- Need to add complex initialization
- Adding internal caching
- Require cleanup/disposal
- Multiple interdependent operations

**Steps**:
1. Create class with constructor
2. Move functions to methods
3. Add internal state as private properties
4. Add initialization method if needed
5. Consider singleton pattern
6. Update imports and instantiation

**Example**:
```typescript
// Before (Pure Functions)
let cache: Map<string, Result> = new Map();

export function processWithCache(input: string): Result {
  if (cache.has(input)) return cache.get(input)!;
  const result = process(input);
  cache.set(input, result);
  return result;
}

// After (Class)
export class Processor {
  private cache: Map<string, Result> = new Map();

  process(input: string): Result {
    if (this.cache.has(input)) return this.cache.get(input)!;
    const result = this.processInternal(input);
    this.cache.set(input, result);
    return result;
  }

  private processInternal(input: string): Result {
    // Implementation
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

---

## Code Review Checklist

### General
- [ ] Pattern matches the use case (refer to Decision Matrix)
- [ ] File is in the correct directory
- [ ] Naming conventions followed
- [ ] TypeScript types are properly defined
- [ ] No `any` types unless absolutely necessary
- [ ] JSDoc comments for exported functions/classes
- [ ] Error handling implemented

### Pure Function Services
- [ ] All functions are pure (no side effects except I/O)
- [ ] Functions are small and focused (< 50 lines)
- [ ] Parameters are typed with interfaces
- [ ] Return types are explicit
- [ ] No module-level mutable state
- [ ] Named exports used

### Class-Based Services
- [ ] Internal state is private
- [ ] Initialization method provided if needed
- [ ] Cleanup/disposal method if resources allocated
- [ ] Singleton pattern if service is shared
- [ ] Public API is minimal and clear
- [ ] Constructor is simple (complex logic in initialize)

### React Hooks
- [ ] Named with `use` prefix
- [ ] Returns object with clear interface
- [ ] Return type interface exported
- [ ] Dependencies arrays are correct
- [ ] No infinite loops in useEffect
- [ ] Cleanup functions in useEffect if needed
- [ ] useMemo/useCallback for optimization

### React Components
- [ ] Functional component pattern
- [ ] Props interface defined and exported
- [ ] Event handlers use useCallback
- [ ] Expensive computations use useMemo
- [ ] No logic in render (move to hooks/utils)
- [ ] Accessibility attributes included

### Zustand Stores
- [ ] Single domain per store
- [ ] Actions use functional updates
- [ ] No async logic in actions (use hooks instead)
- [ ] State is immutable (no mutations)
- [ ] TypeScript interface for state

---

## Examples

### Example 1: Export Service (Pure Functions)

```typescript
/**
 * Annotation Export Service
 * Exports annotations in various formats
 */

export interface ExportOptions {
  includeTimestamps?: boolean;
  includeColors?: boolean;
}

/**
 * Export annotations as JSON
 */
export const exportAsJSON = (
  annotations: Annotation[],
  documentTitle: string,
  options: ExportOptions = {}
): string => {
  const exportData = {
    document: documentTitle,
    exportDate: new Date().toISOString(),
    annotations: annotations.map(formatAnnotation),
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Export annotations as Markdown
 */
export const exportAsMarkdown = (
  annotations: Annotation[],
  documentTitle: string,
  options: ExportOptions = {}
): string => {
  let markdown = `# Annotations for "${documentTitle}"\n\n`;
  // Implementation
  return markdown;
};

// Helper functions (not exported)
const formatAnnotation = (annotation: Annotation) => {
  // Implementation
};
```

**Why Pure Functions**:
- No internal state needed
- Each function is independent
- Easy to test
- Simple data transformation

### Example 2: ML Service (Class-Based)

```typescript
/**
 * Embedding Service
 * Manages ML model lifecycle and caching
 */

export class EmbeddingService {
  private model: Model | null = null;
  private cache: EmbeddingCache;
  private isInitializing = false;

  constructor() {
    this.cache = new EmbeddingCache();
  }

  /**
   * Initialize the model (async, called once)
   */
  async initialize(): Promise<void> {
    if (this.model) return;

    if (this.isInitializing) {
      throw new Error('Already initializing');
    }

    this.isInitializing = true;

    try {
      this.model = await loadModel();
      await this.cache.initialize();
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Generate embedding for text
   */
  async embed(text: string): Promise<number[]> {
    if (!this.model) await this.initialize();

    // Check cache
    const cached = await this.cache.get(text);
    if (cached) return cached;

    // Generate new
    const embedding = await this.model!.embed(text);
    await this.cache.set(text, embedding);

    return embedding;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

// Singleton pattern
let instance: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!instance) {
    instance = new EmbeddingService();
  }
  return instance;
}
```

**Why Class-Based**:
- Complex initialization (async model loading)
- Internal state (model, cache, flags)
- Lifecycle management (dispose)
- Singleton pattern for shared resource

### Example 3: Authentication Hook

```typescript
/**
 * Authentication Hook
 * Manages user authentication state
 */

export interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Get initial session
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) setError(error);
      else setUser(data.session?.user ?? null);
      setLoading(false);
    };

    loadSession();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error);
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) setError(error);
    setLoading(false);
  };

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
  };
};
```

**Why React Hook**:
- Manages UI state (user, loading, error)
- Uses React lifecycle (useEffect)
- Provides operations for components
- Encapsulates auth logic

### Example 4: Document Store (Zustand)

```typescript
/**
 * Document State Store
 * Global state for current document and view mode
 */

interface DocumentState {
  currentDocument: Document | null;
  viewMode: ViewMode;

  // Actions
  setDocument: (document: Document) => void;
  setViewMode: (mode: ViewMode) => void;
  addAnnotation: (paragraphId: string, annotation: Annotation) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  // Initial state
  currentDocument: null,
  viewMode: 'original',

  // Actions
  setDocument: (document) => set({ currentDocument: document }),

  setViewMode: (mode) => set({ viewMode: mode }),

  addAnnotation: (paragraphId, annotation) =>
    set((state) => {
      if (!state.currentDocument) return state;

      const updatedParagraphs = state.currentDocument.paragraphs?.map((p) =>
        p.id === paragraphId
          ? { ...p, annotations: [...(p.annotations || []), annotation] }
          : p
      );

      return {
        currentDocument: {
          ...state.currentDocument,
          paragraphs: updatedParagraphs,
        },
      };
    }),
}));
```

**Why Zustand Store**:
- Global state shared across components
- Multiple actions that modify state
- Needs to persist across route changes
- Simple API for state updates

---

## Summary

### Quick Reference

| Pattern | Use For | Example |
|---------|---------|---------|
| **Pure Functions** | Data transformation, utilities, exports | `annotationExport.ts` |
| **Class-Based** | ML services, complex initialization, caching | `embeddings.ts`, `cache.ts` |
| **React Hooks** | UI state, API calls, component logic | `useAuth.ts`, `useAnnotations.ts` |
| **Zustand Stores** | Global state, cross-component state | `documentStore.ts` |
| **Functional Components** | All UI components | `DocumentViewer.tsx` |

### Key Principles

1. **Default to functional** - Use pure functions unless you need state
2. **Classes for services** - Use classes when managing complex resources
3. **Hooks for UI** - Use hooks for all UI-related logic
4. **Stores for global state** - Use Zustand for shared application state
5. **Keep it simple** - Don't over-engineer, use the simplest pattern that works

---

## Changelog

- **v1.0** (2025-11-10): Initial architectural decisions document
