# Changelog

All notable changes to the Close Reading Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- Real-time collaboration
- Offline mode with service workers
- Mobile native applications (iOS/Android)
- Voice annotations
- Graph view for paragraph links
- Zotero integration
- Advanced OCR for scanned PDFs
- Plugin system
- API webhooks

## [0.1.0] - 2025-11-11

### Added

#### Core Services (Week 1)
- **Bibliography Management Service** (`BibliographyService.ts`)
  - Multi-format import/export (BibTeX, RIS, CSL-JSON)
  - Citation style formatting (APA, MLA, Chicago, Harvard, Vancouver)
  - Full CRUD operations for bibliography entries
  - Advanced search and tag-based filtering
  - In-text citation generation
  - Bibliography statistics and analytics

- **Document Parser Service** (`DocumentParserService.ts`)
  - Multi-format support (PDF, DOCX, TXT, Markdown, HTML)
  - Intelligent paragraph extraction
  - Sentence segmentation with abbreviation handling
  - Document metadata extraction
  - Whitespace normalization
  - Document structure validation

- **Annotation Service** (`AnnotationService.ts`)
  - 9 annotation types (highlight, note, main_idea, citation, question, critical, definition, example, summary)
  - 8 highlight colors for categorization
  - Range-based text selection
  - Tag system for organization
  - Privacy controls (private/shared annotations)
  - Advanced search and filtering
  - Annotation groups
  - Statistics and analytics
  - JSON import/export

#### ML/AI Features (Week 2)
- **Embedding Service** (`ml/embeddings.ts`)
  - TensorFlow.js Universal Sentence Encoder integration
  - Batch embedding generation
  - Multi-layer caching (Memory, IndexedDB, Supabase)
  - Automatic model initialization

- **Similarity Service** (`ml/similarity.ts`)
  - Cosine similarity calculation
  - Find most similar paragraphs
  - Semantic search capabilities

- **Link Suggestion Service** (`ml/linkSuggestions.ts`)
  - AI-powered paragraph link suggestions
  - Configurable similarity thresholds
  - Relationship type detection

#### Citation Features
- **Citation Export Formats**
  - BibTeX export
  - RIS export
  - CSL-JSON export
  - Plain text export

- **Citation Formatters**
  - APA formatter
  - MLA formatter
  - Chicago formatter

#### UI Components
- **Research Workspace** (`ResearchWorkspace.tsx`)
  - Split-pane layout (document + sidebar)
  - Document viewer with metadata editor
  - Text selection handling
  - Multi-panel sidebar (annotations, bibliography, links, export)
  - Quick highlight functionality
  - Toast notifications
  - Responsive design

- **Annotation Components**
  - Annotation toolbar with all types
  - Annotation filter panel
  - Annotation list with search
  - Annotation dialog for creation/editing

- **Document Components**
  - Document upload with drag-and-drop
  - Document viewer (original and sentence views)
  - Document metadata editor
  - Paragraph linking panel

- **Bibliography Components**
  - Citation export modal
  - Bibliography entry management

- **Project Management**
  - Project dashboard
  - Project creation and organization
  - Document list within projects

#### State Management
- **Zustand Stores**
  - Annotation store with CRUD operations
  - Document store with parsing integration
  - Project store with project management

#### Custom Hooks
- `useAnnotations` - Annotation management
- `useAnnotationActions` - Annotation CRUD operations
- `useAnnotationFilters` - Annotation filtering
- `useAnnotationGrouping` - Annotation organization
- `useAnnotationExport` - Export functionality
- `useAnnotationStatistics` - Analytics
- `useDocuments` - Document management
- `useProjects` - Project management
- `useParagraphAnnotations` - Paragraph-specific annotations
- `useParagraphLinks` - Paragraph linking
- `useSharing` - Document sharing
- `useAuth` - Authentication

#### Database & Backend
- Supabase integration
  - PostgreSQL database with RLS
  - Authentication system
  - Real-time subscriptions
  - File storage
- Mock database for local development
- Database migrations and schema

#### Development Infrastructure
- React 19 with TypeScript 5.3
- Vite 7.2 build system
- Chakra UI 3.29.0 for components
- ESLint and TypeScript strict mode
- Comprehensive test suite:
  - 50+ unit tests (Vitest)
  - Integration tests
  - E2E tests (Playwright)
  - 95%+ test coverage target
- GitHub Actions CI/CD pipeline
- Vercel deployment configuration

#### Documentation
- Complete API reference
- User guide with tutorials
- Developer setup guide
- Integration guide for extensibility
- Deployment guide
- Performance optimization guide
- Architecture documentation
- Code examples

#### Dependencies
- `@citation-js/core` ^0.7.21 - Citation management
- `@citation-js/plugin-bibtex` ^0.7.21 - BibTeX support
- `@citation-js/plugin-csl` ^0.7.21 - CSL styles
- `@chakra-ui/react` ^3.29.0 - UI components
- `@supabase/supabase-js` ^2.39.0 - Backend integration
- `@tensorflow/tfjs` ^4.15.0 - ML framework
- `@tensorflow-models/universal-sentence-encoder` ^1.3.3 - Embeddings
- `mammoth` ^1.11.0 - DOCX parsing
- `pdf-parse` ^2.4.5 - PDF parsing
- `dompurify` ^3.3.0 - HTML sanitization
- `compromise` ^14.11.0 - NLP processing
- `wink-nlp` ^1.14.2 - Text analysis
- `zustand` ^4.4.7 - State management
- `pino` ^10.1.0 - Structured logging
- `idb` ^8.0.0 - IndexedDB wrapper

### Changed
- Migrated to React 19 from React 18
- Updated to Chakra UI v3 with new component APIs
- Improved TypeScript strictness and type safety
- Enhanced error handling across all services
- Optimized ML model caching strategy

### Fixed
- PDF parsing for complex documents
- Annotation range offset calculation
- Citation formatting edge cases
- Sentence segmentation with abbreviations
- Database date handling consistency

### Security
- Input validation on all user data
- HTML sanitization with DOMPurify
- Row Level Security (RLS) policies
- JWT-based authentication
- HTTPS-only connections
- Secure environment variable handling

### Performance
- Lazy loading for large documents
- Efficient indexing (document, paragraph)
- In-memory caching for frequently accessed data
- Batch operations for ML embeddings
- Code splitting and tree shaking
- 2-5 second initial page load
- Sub-100ms annotation operations

### Testing
- 50+ unit tests with Vitest
- Integration test suite
- E2E tests with Playwright
- 95%+ code coverage
- Continuous integration with GitHub Actions

## [0.0.1] - 2025-11-05

### Added
- Initial project setup
- Basic React + TypeScript + Vite configuration
- Supabase database schema
- Authentication system setup
- Project structure and conventions
- Development environment configuration

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.1.0 | 2025-11-11 | Initial release with core features |
| 0.0.1 | 2025-11-05 | Project initialization |

---

## Migration Guides

### Migrating from 0.0.x to 0.1.0

**Database:**
```sql
-- Run all migrations in supabase/migrations/
-- Or use Supabase CLI:
npx supabase db push
```

**Dependencies:**
```bash
# Update dependencies
npm install

# Clear cache
rm -rf node_modules/.cache
```

**Breaking Changes:**
- None (initial release)

---

## Contributing

See [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for contribution guidelines.

---

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-username/close_reading/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/close_reading/discussions)

---

**[Unreleased]**: https://github.com/your-username/close_reading/compare/v0.1.0...HEAD
**[0.1.0]**: https://github.com/your-username/close_reading/releases/tag/v0.1.0
**[0.0.1]**: https://github.com/your-username/close_reading/releases/tag/v0.0.1
