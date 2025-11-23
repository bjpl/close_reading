# Close Reading Platform

**Version:** 0.1.0 | **Status:** ACTIVE

A modern web application for close reading and text analysis, featuring document upload, annotation tools, and AI-powered text analysis capabilities.

## Features

- **Document Management**: Upload and manage PDF, DOCX, and image files (with OCR via Tesseract.js)
- **Rich Annotations**: Create, edit, and organize text annotations with tags and colors
- **ML-Powered Text Analysis**:
  - TensorFlow.js integration for machine learning insights
  - Wink NLP for natural language processing
  - Sentiment analysis, keyword extraction, and entity recognition
- **Document Parsing**: Comprehensive PDF and DOCX parsing capabilities
- **Search & Filter**: Powerful search across documents and annotations
- **User Authentication**: Secure user accounts with Supabase Auth
- **Real-time Sync**: Changes sync across devices in real-time
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **High Test Coverage**: 95%+ test coverage with comprehensive testing suite

## Tech Stack

- **Frontend**: React 19 + TypeScript 5.3 + Vite 7.2
- **UI Framework**: Chakra UI 3.29.0 + Framer Motion
- **State Management**: Zustand
- **Backend**: Supabase 2.39.0 (PostgreSQL + Auth + Real-time)
- **ML/NLP Processing**:
  - TensorFlow.js 4.15.0 (machine learning)
  - Wink NLP 1.14.2 (natural language processing)
  - PDF parsing: react-pdf
  - DOCX parsing: mammoth
  - OCR: tesseract.js (Tesseract.js)
- **Testing**: Vitest 4.0 + React Testing Library + Playwright (95%+ coverage)
- **Deployment**: Vercel (configured) + GitHub Actions CI/CD

## Quick Start

### Prerequisites

- Node.js 18+ or higher
- npm or yarn
- Supabase account
- Vercel account (for deployment)

**Current Configuration:** Vercel deployment configured and ready

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd close_reading
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the project root:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

## Development Workflow

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run test` - Run all tests in watch mode
- `npm run test:unit` - Run unit tests
- `npm run test:integration` - Run integration tests
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Project Structure

```
close_reading/
├── src/
│   ├── components/        # React components
│   ├── features/         # Feature-based modules
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   ├── services/         # API and external services
│   ├── store/            # Zustand state management
│   ├── types/            # TypeScript type definitions
│   └── App.tsx           # Main application component
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── docs/
│   └── deployment/       # Deployment documentation
├── .github/
│   └── workflows/        # GitHub Actions CI/CD
├── public/               # Static assets
└── dist/                 # Production build output
```

## Exploring the Code

This project demonstrates modern document analysis application architecture with ML-powered text processing:

**Architecture Highlights:**
- Feature-based module organization for scalable development
- Zustand state management with React Server Components
- TensorFlow.js integration for client-side machine learning
- Wink NLP for natural language processing pipelines
- Real-time synchronization with Supabase subscriptions

**ML/NLP Pipeline Implementation:**
- Sentiment analysis using pre-trained models
- Keyword extraction with TF-IDF algorithms
- Named entity recognition for document indexing
- OCR integration via Tesseract.js for image-based documents

**Testing Strategy:**
- Unit tests for individual components and utilities
- Integration tests for feature workflows
- End-to-end tests with Playwright for critical paths
- 95%+ coverage target with comprehensive mocking

**For Technical Review:**

Those interested in the implementation details can explore:
- `/src/features/` for feature-based architecture patterns
- `/src/services/` for ML pipeline integration
- `/src/hooks/` for custom React hooks (annotation, search, sync)
- `/tests/` for testing patterns at all levels
- `/.github/workflows/` for CI/CD pipeline configuration

### Code Style

This project uses:
- **ESLint** for linting
- **TypeScript** for type safety
- **Prettier** for code formatting (configured in ESLint)

Run checks before committing:
```bash
npm run lint
npm run typecheck
npm run test
```

## Testing

### Unit Tests

Located in `tests/unit/`, these test individual components and functions in isolation.

```bash
npm run test:unit
```

### Integration Tests

Located in `tests/integration/`, these test how different parts of the application work together.

```bash
npm run test:integration
```

### End-to-End Tests

Located in `tests/e2e/`, these test complete user workflows using Playwright.

```bash
npm run test:e2e
```

### Test Coverage

Generate a coverage report:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Deployment

### Vercel Deployment

This application is configured for deployment on Vercel with automatic CI/CD via GitHub Actions.

#### Prerequisites

1. Vercel account connected to your GitHub repository
2. Supabase project set up with required tables
3. GitHub secrets configured for CI/CD

#### Deployment Steps

1. **Configure Supabase**

   Follow the complete setup guide in [`docs/deployment/DEPLOYMENT_GUIDE.md`](docs/deployment/DEPLOYMENT_GUIDE.md)

2. **Set Environment Variables in Vercel**

   In your Vercel project settings, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. **Configure GitHub Secrets**

   Add these secrets to your GitHub repository:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. **Deploy**

   Push to the `main` branch to trigger automatic deployment:
   ```bash
   git push origin main
   ```

   The CI/CD pipeline will:
   - Run tests and linting
   - Build the application
   - Deploy to Vercel
   - Run E2E tests against production

### Manual Deployment

For manual deployment:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod
```

## Architecture

### Frontend Architecture

- **Component-based**: Modular React components following atomic design principles
- **State Management**: Zustand for global state, React hooks for local state
- **Type Safety**: Full TypeScript coverage with strict mode enabled
- **Code Splitting**: Automatic code splitting via Vite for optimal bundle size
- **Lazy Loading**: Components and routes loaded on demand

### Backend Architecture

- **Supabase**:
  - PostgreSQL database with Row Level Security (RLS)
  - Real-time subscriptions for live updates
  - Built-in authentication
  - File storage for document uploads

### Data Flow

1. User authenticates via Supabase Auth
2. Frontend makes requests to Supabase API
3. RLS policies enforce user-specific data access
4. Real-time subscriptions push updates to connected clients
5. Client-side state management via Zustand

## Performance

- **Lighthouse Score**: Target 90+ across all metrics
- **Bundle Size**: Optimized with code splitting and tree shaking
- **Caching**: Leverages Vercel Edge Network CDN
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Automatic image optimization via Vercel

## Security

- **Authentication**: Secure JWT-based authentication via Supabase
- **Authorization**: Row Level Security (RLS) policies in database
- **Data Validation**: Input validation on both client and server
- **HTTPS**: All connections encrypted
- **Environment Variables**: Secrets never committed to repository
- **Content Security Policy**: CSP headers configured in Vercel
- **Regular Updates**: Dependencies kept up to date

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm run test && npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- **Documentation**: [docs/deployment/DEPLOYMENT_GUIDE.md](docs/deployment/DEPLOYMENT_GUIDE.md)
- **Issue Tracker**: [GitHub Issues](https://github.com/your-username/close_reading/issues)
- **Email**: support@example.com

## Acknowledgments

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Supabase](https://supabase.com/)
- [Chakra UI](https://chakra-ui.com/)
- [Vercel](https://vercel.com/)

## Roadmap

- [ ] Collaborative annotations
- [ ] Export annotations to PDF/DOCX
- [ ] Advanced NLP analysis (summarization, topic modeling)
- [ ] Mobile applications (iOS/Android)
- [ ] Browser extensions
- [ ] API for third-party integrations
- [ ] Offline support with PWA
- [ ] Multi-language support (i18n)

---

Built using React and Supabase
