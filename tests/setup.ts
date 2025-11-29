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

// Helper function for sanitizing sensitive data
const mockSanitizeLogData = (data: Record<string, unknown>): Record<string, unknown> => {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization', 'cookie'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = mockSanitizeLogData(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

const mockLogger = createMockLogger();

vi.mock('../src/lib/logger', () => ({
  default: mockLogger,
  logError: vi.fn((error: Error | string, context?: Record<string, unknown>) => {
    mockLogger.error({ error, ...context });
  }),
  logUserAction: vi.fn((action: string, context?: Record<string, unknown>) => {
    mockLogger.info({ type: 'user-action', action, ...context });
  }),
  logDataOperation: vi.fn((operation: string, entity: string, context?: Record<string, unknown>) => {
    mockLogger.info({ type: 'data-operation', operation, entity, ...context });
  }),
  logPerformance: vi.fn((operation: string, duration: number, context?: Record<string, unknown>) => {
    mockLogger.info({ type: 'performance', operation, duration, ...context });
  }),
  startTimer: vi.fn((operation: string, context?: Record<string, unknown>) => {
    return vi.fn(() => {
      mockLogger.info({ type: 'performance', operation, ...context });
    });
  }),
  logApiCall: vi.fn((method: string, url: string, status: number, duration: number, context?: Record<string, unknown>) => {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    mockLogger[level]({ type: 'api-call', method, url, status, duration, ...context });
  }),
  sanitizeLogData: vi.fn(mockSanitizeLogData),
  createLogger: vi.fn(() => createMockLogger()),
  info: mockLogger.info,
  error: mockLogger.error,
  warn: mockLogger.warn,
  debug: mockLogger.debug,
  trace: mockLogger.trace,
  fatal: mockLogger.fatal,
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
