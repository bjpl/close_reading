# Close Reading Platform - Project Setup

## Project Structure

```
close_reading/
├── src/
│   ├── components/     # React UI components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Supabase client, utilities
│   ├── stores/         # Zustand state management
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Main application component
│   ├── main.tsx        # Application entry point
│   └── vite-env.d.ts   # Vite environment types
├── tests/              # Test files
│   └── setup.ts        # Test configuration
├── docs/               # Documentation
├── public/             # Static assets
├── package.json        # Dependencies and scripts
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── .env.example        # Environment variables template
└── .gitignore          # Git ignore rules
```

## Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6
- **UI Library**: Chakra UI 2.8
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: Zustand 5
- **Routing**: React Router 6
- **Testing**: Vitest + React Testing Library
- **Code Quality**: ESLint + TypeScript

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Add your Supabase project URL and anon key

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Run tests**:
   ```bash
   npm test
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate coverage report
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types

## Next Steps

1. Set up Supabase database schema
2. Implement authentication components
3. Create document management features
4. Build annotation system
5. Add collaborative features

## Documentation

- [Architecture Overview](./ARCHITECTURE.md) - Coming soon
- [API Documentation](./API.md) - Coming soon
- [Development Guide](./DEVELOPMENT.md) - Coming soon
