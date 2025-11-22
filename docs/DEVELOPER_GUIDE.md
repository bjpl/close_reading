# Developer Guide

**Version:** 0.1.0
**Last Updated:** November 11, 2025

Complete guide for developers contributing to the Close Reading Platform.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing Guidelines](#testing-guidelines)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)

---

## Development Setup

### Prerequisites

**Required:**
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher (comes with Node.js)
- Git 2.30 or higher
- Modern code editor (VS Code recommended)

**Optional but Recommended:**
- VS Code extensions:
  - ESLint
  - Prettier
  - TypeScript Vue Plugin
  - Error Lens
  - GitLens

### Initial Setup

#### 1. Clone Repository

```bash
git clone https://github.com/your-username/close_reading.git
cd close_reading
```

#### 2. Install Dependencies

```bash
npm install
```

This installs:
- React 19 + TypeScript
- Vite build tool
- Testing libraries (Vitest, Playwright)
- All service dependencies

Expected installation time: 2-5 minutes

#### 3. Environment Configuration

Create `.env.local` file in project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Development Settings
VITE_DEV_MODE=true
VITE_LOG_LEVEL=debug
```

**Get Supabase Credentials:**

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → API
4. Copy `URL` and `anon/public` key

#### 4. Database Setup

Run database migrations:

```bash
# Initialize Supabase locally (optional)
npx supabase init

# Push schema to Supabase
npx supabase db push

# Or apply migrations manually from supabase/migrations/
```

See [Database Schema](database/SCHEMA.md) for details.

#### 5. Verify Setup

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run tests
npm run test

# Start development server
npm run dev
```

If all commands succeed, setup is complete!

### VS Code Configuration

Recommended `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.eol": "\n",
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true
}
```

---

## Project Structure

### Directory Layout

```
close_reading/
├── src/                      # Source code
│   ├── components/          # React components
│   │   ├── AnnotationToolbar.tsx
│   │   ├── DocumentViewer.tsx
│   │   └── ...
│   ├── services/            # Business logic services
│   │   ├── BibliographyService.ts
│   │   ├── DocumentParserService.ts
│   │   ├── AnnotationService.ts
│   │   ├── ml/             # Machine learning services
│   │   │   ├── embeddings.ts
│   │   │   ├── similarity.ts
│   │   │   └── cache.ts
│   │   └── citation/       # Citation formatting
│   ├── stores/             # Zustand state management
│   │   ├── annotationStore.ts
│   │   ├── documentStore.ts
│   │   └── projectStore.ts
│   ├── hooks/              # Custom React hooks
│   │   ├── useAnnotations.ts
│   │   ├── useDocuments.ts
│   │   └── ...
│   ├── types/              # TypeScript type definitions
│   │   ├── index.ts
│   │   ├── database.ts
│   │   └── citation.ts
│   ├── lib/                # Utilities and helpers
│   │   ├── supabase.ts
│   │   ├── logger.ts
│   │   └── ...
│   ├── pages/              # Route pages
│   │   ├── DashboardPage.tsx
│   │   ├── DocumentPage.tsx
│   │   └── ...
│   ├── App.tsx             # Main app component
│   ├── main.tsx            # Entry point
│   └── theme.ts            # Chakra UI theme
├── tests/                   # Test files
│   ├── unit/               # Unit tests
│   │   ├── bibliography-service.test.ts
│   │   ├── document-parser-service.test.ts
│   │   └── ...
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
├── public/                 # Static assets
├── docs/                   # Documentation
│   ├── API_REFERENCE.md
│   ├── USER_GUIDE.md
│   ├── architecture/       # Architecture docs
│   ├── database/          # Database docs
│   └── deployment/        # Deployment guides
├── supabase/              # Supabase configuration
│   ├── migrations/        # Database migrations
│   └── config.toml        # Supabase config
├── .github/               # GitHub configuration
│   └── workflows/         # CI/CD workflows
├── examples/              # Code examples
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite config
├── vitest.config.ts       # Vitest config
└── playwright.config.ts   # Playwright config
```

### Key Files

**Configuration:**
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript compiler options
- `vite.config.ts` - Build configuration
- `.env.local` - Environment variables (not committed)

**Entry Points:**
- `src/main.tsx` - Application entry
- `src/App.tsx` - Root component
- `index.html` - HTML template

**Testing:**
- `vitest.config.ts` - Unit test configuration
- `playwright.config.ts` - E2E test configuration

---

## Development Workflow

### Starting Development

```bash
# Start dev server with hot reload
npm run dev
```

Server starts at `http://localhost:5173`

**Hot Module Replacement (HMR):**
- Changes auto-reload in browser
- State preserved when possible
- Fast feedback loop

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm run test             # Run all tests (watch mode)
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
npm run test:coverage   # Coverage report

# Code Quality
npm run lint            # Run ESLint
npm run typecheck       # TypeScript type checking

# All Quality Checks (run before commit)
npm run lint && npm run typecheck && npm run test:unit
```

### Development Server Features

**Port Configuration:**

Default: 5173

Change in `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 3000,
    open: true  // Auto-open browser
  }
});
```

**Network Access:**

```bash
# Access from other devices
npm run dev -- --host
```

**HTTPS (if needed):**

```bash
npm run dev -- --https
```

---

## Code Style

### TypeScript Guidelines

#### Type Safety

**Always use explicit types:**

```typescript
// Good
function processDocument(file: File): Promise<ParsedDocument> {
  return documentParserService.parseDocument(file);
}

// Avoid
function processDocument(file) {  // Implicit any
  return documentParserService.parseDocument(file);
}
```

**Use interfaces for objects:**

```typescript
// Good
interface UserPreferences {
  theme: 'light' | 'dark';
  fontSize: number;
  autoSave: boolean;
}

// Avoid
type UserPreferences = {
  theme: string;
  fontSize: number;
  autoSave: boolean;
};
```

**Prefer type inference when obvious:**

```typescript
// Good
const count = 5;  // Obviously number
const users = await getUsers();  // Return type inferred

// Avoid unnecessary annotations
const count: number = 5;
```

#### Naming Conventions

**Variables and Functions:**
- Use camelCase
- Descriptive names
- Boolean prefix: `is`, `has`, `should`

```typescript
// Good
const isAuthenticated = true;
const hasAnnotations = annotations.length > 0;
const shouldShowModal = !isAuthenticated;

function getUserProfile(userId: string) { }
```

**Constants:**
- Use UPPER_SNAKE_CASE for true constants
- Use camelCase for config objects

```typescript
const MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50MB
const API_TIMEOUT = 30000;

const config = {
  maxRetries: 3,
  retryDelay: 1000
};
```

**Classes and Interfaces:**
- Use PascalCase
- Interfaces: no `I` prefix

```typescript
// Good
class BibliographyService { }
interface Annotation { }

// Avoid
class bibliographyService { }
interface IAnnotation { }
```

**Types:**
- Use PascalCase
- Suffix with descriptive name

```typescript
type AnnotationType = 'highlight' | 'note' | 'citation';
type CitationStyle = 'apa' | 'mla' | 'chicago';
```

#### File Naming

- Components: `PascalCase.tsx`
- Services: `PascalCase.ts` or `camelCase.ts`
- Utilities: `camelCase.ts`
- Tests: `*.test.ts` or `*.spec.ts`

```
components/
  DocumentViewer.tsx
  AnnotationToolbar.tsx
services/
  BibliographyService.ts
  documentParser.ts
lib/
  logger.ts
  utils.ts
tests/
  document-parser.test.ts
```

### React Guidelines

#### Component Structure

```typescript
// 1. Imports
import { useState, useEffect } from 'react';
import { Box, Button } from '@chakra-ui/react';
import { useAnnotations } from '@/hooks';

// 2. Types
interface DocumentViewerProps {
  documentId: string;
  onAnnotationCreate?: (annotation: Annotation) => void;
}

// 3. Component
export function DocumentViewer({
  documentId,
  onAnnotationCreate
}: DocumentViewerProps) {
  // Hooks
  const [isLoading, setIsLoading] = useState(false);
  const { annotations, createAnnotation } = useAnnotations(documentId);

  // Effects
  useEffect(() => {
    loadDocument();
  }, [documentId]);

  // Handlers
  const handleAnnotate = (text: string) => {
    const annotation = createAnnotation({ text });
    onAnnotationCreate?.(annotation);
  };

  // Render helpers
  const renderAnnotations = () => { };

  // Main render
  return (
    <Box>
      {/* JSX */}
    </Box>
  );
}
```

#### Hooks

**Custom hooks prefix with `use`:**

```typescript
// hooks/useAnnotations.ts
export function useAnnotations(documentId: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  useEffect(() => {
    loadAnnotations();
  }, [documentId]);

  const createAnnotation = (data: CreateAnnotationData) => {
    // Implementation
  };

  return { annotations, createAnnotation };
}
```

**Hook dependencies:**

```typescript
// Good: All dependencies listed
useEffect(() => {
  fetchData(userId, documentId);
}, [userId, documentId]);

// Avoid: Missing dependencies
useEffect(() => {
  fetchData(userId, documentId);
}, []);  // ESLint will warn
```

#### Props

**Destructure in parameter:**

```typescript
// Good
function Button({ label, onClick, disabled }: ButtonProps) {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}

// Avoid
function Button(props: ButtonProps) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

**Optional callbacks with `?`:**

```typescript
interface Props {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

function Component({ onSuccess, onError }: Props) {
  onSuccess?.();  // Safe optional call
}
```

### Service Guidelines

#### Service Class Pattern

```typescript
export class MyService {
  private cache: Map<string, any>;

  constructor() {
    this.cache = new Map();
  }

  // Public methods
  async performOperation(input: string): Promise<Result> {
    // Implementation
  }

  // Private helpers
  private validateInput(input: string): boolean {
    // Implementation
  }
}

// Singleton export
export const myService = new MyService();
```

#### Error Handling

```typescript
// Service method
async parseDocument(file: File): Promise<ParsedDocument> {
  try {
    const result = await this.parsePDF(file);
    return result;
  } catch (error) {
    throw new Error(
      `Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Caller
try {
  const parsed = await service.parseDocument(file);
} catch (error) {
  logger.error('Parse failed', { error, filename: file.name });
  // Handle error
}
```

### ESLint Configuration

Our ESLint config enforces:
- TypeScript strict rules
- React hooks rules
- Unused variable detection
- Import order

**Disable rules sparingly:**

```typescript
// Good: With explanation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = externalLibraryCall();  // Library has no types

// Avoid: Blanket disable
/* eslint-disable */
```

---

## Testing Guidelines

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { AnnotationService } from '@/services';

describe('AnnotationService', () => {
  let service: AnnotationService;

  beforeEach(() => {
    service = new AnnotationService();
  });

  describe('createAnnotation', () => {
    it('should create annotation with generated ID', () => {
      const annotation = service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'highlight',
        color: 'yellow',
        tags: [],
        isPrivate: false
      });

      expect(annotation.id).toBeDefined();
      expect(annotation.documentId).toBe('doc-1');
    });

    it('should set timestamps automatically', () => {
      const before = new Date();
      const annotation = service.createAnnotation(/* ... */);
      const after = new Date();

      expect(annotation.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(annotation.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
```

### Unit Tests

**Location:** `tests/unit/`

**What to test:**
- Service methods
- Utility functions
- Data transformations
- Edge cases

**Example:**

```typescript
describe('calculateSimilarity', () => {
  it('should return 1.0 for identical vectors', () => {
    const vector = [1, 2, 3];
    expect(calculateSimilarity(vector, vector)).toBe(1.0);
  });

  it('should return 0.0 for orthogonal vectors', () => {
    expect(calculateSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  it('should handle zero vectors', () => {
    expect(calculateSimilarity([0, 0], [1, 2])).toBe(0);
  });
});
```

### Integration Tests

**Location:** `tests/integration/`

**What to test:**
- Service interactions
- Data flow
- State management

**Example:**

```typescript
describe('Document workflow', () => {
  it('should parse document and create annotations', async () => {
    // Parse document
    const file = new File(['content'], 'test.txt');
    const parsed = await documentParserService.parseDocument(file);

    // Create annotation
    const annotation = annotationService.createAnnotation({
      documentId: parsed.metadata.id,
      target: { type: 'paragraph', id: parsed.paragraphs[0].id },
      // ...
    });

    // Verify
    const annotations = annotationService.getDocumentAnnotations(parsed.metadata.id);
    expect(annotations).toContainEqual(annotation);
  });
});
```

### E2E Tests

**Location:** `tests/e2e/`

**What to test:**
- User workflows
- UI interactions
- Full features

**Example:**

```typescript
import { test, expect } from '@playwright/test';

test('user can create and view annotation', async ({ page }) => {
  // Navigate
  await page.goto('/document/123');

  // Select text
  await page.locator('[data-testid="paragraph-0"]').selectText();

  // Create annotation
  await page.click('[data-testid="highlight-button"]');
  await page.selectOption('[data-testid="color-select"]', 'yellow');
  await page.click('[data-testid="save-button"]');

  // Verify
  await expect(page.locator('.annotation-highlight')).toBeVisible();
  await expect(page.locator('.annotation-highlight')).toHaveClass(/yellow/);
});
```

### Test Coverage

**Run coverage:**

```bash
npm run test:coverage
```

**Coverage targets:**
- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

**View report:**

```bash
open coverage/index.html
```

---

## Git Workflow

### Branch Strategy

**Main branches:**
- `main` - Production code
- `develop` - Development integration (optional)

**Feature branches:**
- `feature/annotation-tags` - New features
- `fix/citation-formatting` - Bug fixes
- `docs/api-reference` - Documentation
- `refactor/service-structure` - Refactoring

### Commit Messages

Follow conventional commits:

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples:**

```bash
git commit -m "feat(annotations): add tag filtering"
git commit -m "fix(parser): handle empty paragraphs correctly"
git commit -m "docs(api): update BibliographyService examples"
git commit -m "refactor(services): extract common validation logic"
```

**Multi-line commits:**

```bash
git commit -m "feat(search): add semantic paragraph search

- Integrate TensorFlow.js embeddings
- Add similarity calculation
- Create link suggestion UI
- Add tests for search functionality

Closes #123"
```

### Creating Feature Branch

```bash
# Update main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ... code ...

# Commit
git add .
git commit -m "feat(scope): description"

# Push
git push origin feature/my-feature
```

---

## Pull Request Process

### Before Creating PR

**1. Update from main:**

```bash
git checkout main
git pull origin main
git checkout feature/my-feature
git rebase main
```

**2. Run checks:**

```bash
npm run lint
npm run typecheck
npm run test
```

**3. Review changes:**

```bash
git diff main...feature/my-feature
```

### Creating PR

**1. Push branch:**

```bash
git push origin feature/my-feature
```

**2. Open PR on GitHub**

**3. Fill out template:**

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No console errors
- [ ] Tests passing
```

### Code Review

**As Author:**
- Respond to all comments
- Make requested changes
- Re-request review after changes

**As Reviewer:**
- Check code quality
- Verify tests
- Test locally if needed
- Approve or request changes

### Merging

**After approval:**

```bash
# Squash and merge (preferred)
# or
# Merge commit
# or
# Rebase and merge
```

**Delete branch after merge**

---

## Debugging

### Browser DevTools

**Console:**
- `Ctrl+Shift+J` (Windows/Linux)
- `Cmd+Option+J` (Mac)

**React DevTools:**
- Install extension
- Inspect component tree
- View props/state
- Profile performance

**Network Tab:**
- Monitor API calls
- Check request/response
- View timing

### Logging

```typescript
import { logger } from '@/lib/logger';

// Development logging
logger.debug('Processing document', { documentId });
logger.info('Annotation created', { annotation });
logger.warn('Cache miss', { key });
logger.error('Parse failed', { error });

// Production: Only errors logged
```

### VS Code Debugging

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMapPathOverrides": {
        "webpack:///./src/*": "${webRoot}/*"
      }
    }
  ]
}
```

**Usage:**
1. Start dev server: `npm run dev`
2. Press F5 to launch debugger
3. Set breakpoints in VS Code
4. Debug in browser

### Common Issues

**Issue: Port already in use**

```bash
# Find process
lsof -i :5173

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- --port 3000
```

**Issue: Type errors after dependency update**

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache

# Reinstall
npm install

# Rebuild
npm run build
```

**Issue: Tests failing unexpectedly**

```bash
# Clear test cache
npm run test -- --clearCache

# Run single test
npm run test -- path/to/test.test.ts
```

---

## Common Tasks

### Adding New Service

1. **Create service file:**

```typescript
// src/services/MyService.ts
export class MyService {
  async doSomething(): Promise<Result> {
    // Implementation
  }
}

export const myService = new MyService();
```

2. **Add types:**

```typescript
// src/types/index.ts
export interface MyServiceData {
  field: string;
}
```

3. **Export from index:**

```typescript
// src/services/index.ts
export * from './MyService';
```

4. **Add tests:**

```typescript
// tests/unit/my-service.test.ts
describe('MyService', () => {
  // Tests
});
```

### Adding New Component

1. **Create component:**

```typescript
// src/components/MyComponent.tsx
interface MyComponentProps {
  // Props
}

export function MyComponent(props: MyComponentProps) {
  return <div>{/* JSX */}</div>;
}
```

2. **Add to index:**

```typescript
// src/components/index.ts
export * from './MyComponent';
```

3. **Add tests:**

```typescript
// tests/unit/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
```

### Adding Database Migration

1. **Create migration:**

```bash
npx supabase migration new add_my_table
```

2. **Edit migration file:**

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_my_table.sql
CREATE TABLE my_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
```

3. **Apply migration:**

```bash
npx supabase db push
```

---

## Additional Resources

### Documentation

- [API Reference](API_REFERENCE.md) - Complete API docs
- [Architecture](architecture/SYSTEM_DESIGN.md) - System architecture
- [Deployment](DEPLOYMENT.md) - Deployment guide

### External Resources

- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Vitest Docs](https://vitest.dev)
- [Playwright Docs](https://playwright.dev)
- [Supabase Docs](https://supabase.com/docs)

### Community

- GitHub Discussions
- Discord Server (coming soon)
- Stack Overflow tag: `close-reading-platform`

---

**Last Updated:** November 11, 2025
**Version:** 0.1.0

For deployment instructions, see [Deployment Guide](DEPLOYMENT.md).
