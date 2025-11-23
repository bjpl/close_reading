import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import 'fake-indexeddb/auto';

// Cleanup after each test
afterEach(() => {
  cleanup();
  // Clear all mocks to prevent test pollution
  vi.clearAllMocks();
});

// Handle unhandled promise rejections gracefully in tests
beforeAll(() => {
  // Suppress console errors during tests unless debugging
  if (!process.env.DEBUG_TESTS) {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  }
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Mock logger with all exports
const createMockLogger = () => ({
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  trace: vi.fn(),
  child: vi.fn(() => createMockLogger()),
  level: 'info',
  silent: vi.fn(),
});

vi.mock('../src/lib/logger', () => ({
  default: createMockLogger(),
  logError: vi.fn(),
  logUserAction: vi.fn(),
  logDataOperation: vi.fn(),
  logPerformance: vi.fn(),
  sanitizeLogData: vi.fn((data) => data),
  createLogger: vi.fn(() => createMockLogger()),
}));

// Mock Supabase client with comprehensive chainable methods
vi.mock('@supabase/supabase-js', () => {
  const createChainableMock = () => {
    const mock: Record<string, any> = {};
    const chainMethods = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike',
      'is', 'in', 'contains', 'containedBy', 'range', 'overlaps',
      'textSearch', 'match', 'not', 'or', 'filter',
      'order', 'limit', 'offset', 'single', 'maybeSingle',
      'then', 'catch', 'finally'
    ];

    chainMethods.forEach(method => {
      mock[method] = vi.fn().mockReturnValue(mock);
    });

    // Override terminal methods
    mock.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mock.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    return mock;
  };

  return {
    createClient: vi.fn(() => ({
      auth: {
        signIn: vi.fn().mockResolvedValue({ data: null, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
      },
      from: vi.fn(() => createChainableMock()),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: null, error: null }),
          download: vi.fn().mockResolvedValue({ data: null, error: null }),
          remove: vi.fn().mockResolvedValue({ data: null, error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } })
        }))
      },
      rpc: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  };
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
