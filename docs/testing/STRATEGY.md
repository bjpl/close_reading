# Testing Strategy for Close-Reading Platform

## Overview

This document outlines the comprehensive testing strategy for the Close-Reading Platform, ensuring high code quality, reliability, and maintainability throughout the development lifecycle.

## Testing Philosophy

Our testing approach follows the Testing Pyramid principle:

```
          /\
         /e2e\          (10% - End-to-End Tests)
        /------\
       /integra\        (30% - Integration Tests)
      /----------\
     /   unit     \     (60% - Unit Tests)
    /--------------\
```

### Core Principles

1. **Test Early, Test Often**: Write tests before or alongside implementation
2. **Fast Feedback**: Unit tests should run in milliseconds
3. **Comprehensive Coverage**: Target 80%+ overall code coverage
4. **Realistic Tests**: Integration tests should use realistic data and scenarios
5. **User-Centric E2E**: End-to-end tests should mirror actual user workflows

## Testing Levels

### 1. Unit Tests (60% of test suite)

**Purpose**: Test individual functions, components, and modules in isolation.

**Tools**:
- Vitest (test runner)
- React Testing Library (component testing)
- Happy DOM (DOM environment)

**Coverage Goals**:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

**What to Test**:
- Component rendering and props
- State management logic (Zustand stores)
- Utility functions and helpers
- Data transformation and validation
- API request/response handling
- Business logic and calculations

**Example Test Files**:
- `/tests/unit/document-upload.test.ts` - Document upload functionality
- `/tests/unit/annotation-system.test.ts` - Annotation CRUD operations
- `/tests/unit/paragraph-linking.test.ts` - Paragraph link management
- `/tests/unit/citation-export.test.ts` - Citation format generation
- `/tests/unit/project-management.test.ts` - Project CRUD operations

**Best Practices**:
- Mock external dependencies (Supabase, APIs)
- Test one thing per test case
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent and isolated

### 2. Integration Tests (30% of test suite)

**Purpose**: Test interactions between multiple components, services, and systems.

**Tools**:
- Vitest (test runner)
- MSW (Mock Service Worker) for API mocking
- React Testing Library for full component trees

**What to Test**:
- Component composition and interaction
- Store integration with components
- API integration with real-like responses
- File upload and processing workflows
- Authentication flows
- Data synchronization between client and server

**Example Scenarios**:
```typescript
// Integration test example
describe('Document Upload Flow', () => {
  it('should upload document and create annotations', async () => {
    // 1. Upload document
    // 2. Parse content
    // 3. Create paragraphs
    // 4. Enable annotation creation
  });
});
```

**Best Practices**:
- Use realistic test data
- Test happy paths and error scenarios
- Verify state changes across components
- Test asynchronous operations thoroughly

### 3. End-to-End Tests (10% of test suite)

**Purpose**: Test complete user workflows from start to finish.

**Tools**:
- Playwright (browser automation)
- Real or staging backend environment

**What to Test**:
- Critical user journeys
- Authentication and authorization
- Document upload and viewing
- Annotation creation and management
- Citation export workflows
- Project sharing and collaboration

**Example User Journeys**:
1. **New User Onboarding**
   - Sign up → Create project → Upload document → Create first annotation

2. **Research Workflow**
   - Login → Open project → Annotate document → Link paragraphs → Export citations

3. **Collaboration Workflow**
   - Share project → Access public link → View annotations (read-only)

**Best Practices**:
- Focus on critical paths
- Run on multiple browsers (Chromium, Firefox, WebKit)
- Test on different viewport sizes
- Use Page Object Model for maintainability
- Run in CI/CD pipeline on staging environment

## Test Organization

```
tests/
├── unit/                    # Unit tests
│   ├── document-upload.test.ts
│   ├── annotation-system.test.ts
│   ├── paragraph-linking.test.ts
│   ├── citation-export.test.ts
│   └── project-management.test.ts
├── integration/             # Integration tests
│   ├── document-workflow.test.tsx
│   ├── annotation-workflow.test.tsx
│   └── auth-flow.test.tsx
├── e2e/                     # End-to-end tests
│   ├── user-onboarding.spec.ts
│   ├── research-workflow.spec.ts
│   └── collaboration.spec.ts
├── utils/                   # Test utilities
│   ├── test-utils.tsx      # Custom render with providers
│   ├── mockData.ts         # Mock data fixtures
│   └── testHelpers.ts      # Test helper functions
└── setup.ts                # Global test setup

```

## Coverage Requirements

### Minimum Coverage Thresholds

```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80
  }
}
```

### Coverage Exclusions
- Configuration files
- Type definitions
- Mock data
- Generated code
- Third-party integrations (tested via integration tests)

### Priority Coverage Areas

1. **Critical Path (95%+ coverage)**:
   - Authentication
   - Data persistence
   - Document parsing
   - Annotation system

2. **High Priority (85%+ coverage)**:
   - Project management
   - Citation export
   - Paragraph linking
   - File upload

3. **Standard Priority (75%+ coverage)**:
   - UI components
   - Utility functions
   - Helper modules

## Test Execution

### Local Development

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Generate coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:coverage
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
```

## Mock Strategy

### Supabase Mocking

```typescript
// tests/setup.ts
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { /* mocked auth methods */ },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      // ... other methods
    }))
  }))
}));
```

### API Mocking (Integration Tests)

```typescript
// Using MSW (Mock Service Worker)
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('/api/documents', (req, res, ctx) => {
    return res(ctx.json({ id: '123', title: 'Test' }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Test Data Management

### Mock Data Files

All mock data should be centralized in `/tests/utils/mockData.ts`:

```typescript
export const mockUser = { /* ... */ };
export const mockProject = { /* ... */ };
export const mockDocument = { /* ... */ };
export const mockAnnotations = [ /* ... */ ];
```

### Test Data Principles

1. **Realistic**: Mirror actual data structures
2. **Reusable**: Shared across multiple tests
3. **Versioned**: Update with schema changes
4. **Minimal**: Only include necessary fields
5. **Diverse**: Cover edge cases and variations

## Performance Testing

### Unit Test Performance

- Individual tests: < 50ms
- Test suite: < 5 seconds
- Use `vi.useFakeTimers()` for time-dependent tests

### E2E Test Performance

- Individual test: < 30 seconds
- Full suite: < 10 minutes
- Run in parallel when possible

## Accessibility Testing

### Tools
- `@testing-library/jest-dom` for accessibility assertions
- `axe-core` for automated accessibility checks

### Example
```typescript
import { axe } from 'jest-axe';

it('should be accessible', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Continuous Improvement

### Code Review Checklist

- [ ] Tests pass locally
- [ ] Coverage thresholds met
- [ ] No skipped or disabled tests without justification
- [ ] Test names are descriptive
- [ ] Mock data is realistic
- [ ] Integration tests use MSW where appropriate
- [ ] E2E tests cover critical paths

### Test Maintenance

- **Weekly**: Review failing tests in CI
- **Monthly**: Review test coverage reports
- **Quarterly**: Audit and refactor slow tests
- **Per Release**: Update E2E tests for new features

## Testing MVP Features

### Phase 1 (MVP) - Complete

✅ Document Upload
- File validation (type, size)
- Storage upload
- Text extraction
- Database record creation

✅ Annotation System
- Create (highlight, note, main idea, citation)
- Read (by document, paragraph, type)
- Update (content, color)
- Delete (single, bulk)

✅ Paragraph Linking
- Create links with relationship types
- Query links (incoming, outgoing)
- Update relationship metadata
- Delete links

✅ Citation Export
- BibTeX format generation
- RIS format generation
- JSON format export
- Metadata extraction

✅ Project Management
- CRUD operations
- Access control (public/private)
- Document association
- Search and filtering

### Phase 2 (Enhanced Features) - Upcoming

🔜 Auto-Suggested Links (TF-IDF similarity)
🔜 Term Definitions (NLP integration)
🔜 AI Summarization (Claude API)
🔜 Voice Annotations (Web Audio API)

## Success Metrics

### Quantitative Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Overall Coverage | 80% | TBD |
| Unit Test Coverage | 85% | TBD |
| Integration Coverage | 75% | TBD |
| E2E Coverage | 100% of critical paths | TBD |
| Test Execution Time | < 5 min | TBD |
| Flaky Test Rate | < 1% | TBD |

### Qualitative Metrics

- Test maintainability score
- Developer confidence in refactoring
- Bug escape rate to production
- Time to diagnose test failures

## Resources and Documentation

### Internal Resources
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)

### Team Resources
- Test data fixtures: `/tests/utils/mockData.ts`
- Test utilities: `/tests/utils/test-utils.tsx`
- CI/CD pipeline: `.github/workflows/test.yml`

### Getting Help
- Review existing tests for patterns
- Consult team lead for testing strategy questions
- Open issue for test infrastructure improvements

---

**Last Updated**: 2024-11-05
**Owner**: QA Engineering Team
**Status**: Living Document - Review quarterly
