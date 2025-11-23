/**
 * AuthContext Unit Tests
 *
 * Tests for the React authentication context including:
 * - AuthProvider
 * - useAuthContext hook
 * - withAuth HOC
 * - useIsAuthenticated hook
 * - useRequireAuth hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React, { ReactNode } from 'react';

// Mock react-router-dom before importing AuthContext
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null, pathname: '/test' }),
}));

import {
  AuthProvider,
  useAuthContext,
  withAuth,
  useIsAuthenticated,
  useRequireAuth,
} from '@/contexts/AuthContext';
import { UseAuthReturn } from '@/hooks/useAuth';

// Mock the useAuth hook
const mockUseAuth = vi.fn<[], UseAuthReturn>();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AuthContext', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
  };

  const mockSession = {
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    user: mockUser,
  };

  const createMockAuth = (overrides: Partial<UseAuthReturn> = {}): UseAuthReturn => ({
    user: null,
    session: null,
    loading: false,
    error: null,
    isAuthenticated: false,
    signIn: vi.fn().mockResolvedValue({ success: true }),
    signUp: vi.fn().mockResolvedValue({ success: true }),
    signOut: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue({ success: true }),
    clearError: vi.fn(),
    validateInputs: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
    ...overrides,
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    mockUseAuth.mockReturnValue(createMockAuth());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('should render children', () => {
      render(
        <AuthProvider>
          <div data-testid="child">Test Child</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should provide auth context to children', () => {
      const TestComponent = () => {
        const auth = useAuthContext();
        return <div data-testid="auth-present">{auth ? 'Auth Available' : 'No Auth'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-present')).toHaveTextContent('Auth Available');
    });

    it('should pass through auth state correctly', () => {
      mockUseAuth.mockReturnValue(createMockAuth({ user: mockUser as any, session: mockSession as any }));

      const TestComponent = () => {
        const { user, session } = useAuthContext();
        return (
          <div>
            <span data-testid="user-email">{user?.email}</span>
            <span data-testid="session-token">{session?.access_token}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('session-token')).toHaveTextContent('mock-token');
    });
  });

  describe('useAuthContext', () => {
    it('should throw error when used outside AuthProvider', () => {
      const TestComponent = () => {
        useAuthContext();
        return null;
      };

      // Suppress console.error for expected error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestComponent />)).toThrow(
        'useAuthContext must be used within AuthProvider'
      );

      consoleSpy.mockRestore();
    });

    it('should return auth context when used within AuthProvider', () => {
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('signIn');
    });

    it('should return all auth methods', () => {
      const { result } = renderHook(() => useAuthContext(), { wrapper });

      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.resetPassword).toBe('function');
    });
  });

  describe('withAuth HOC', () => {
    const ProtectedComponent = () => <div data-testid="protected">Protected Content</div>;
    const WrappedComponent = withAuth(ProtectedComponent);

    it('should show loading state when loading is true', () => {
      mockUseAuth.mockReturnValue(createMockAuth({ loading: true }));

      render(
        <AuthProvider>
          <WrappedComponent />
        </AuthProvider>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show authentication required message when not authenticated', () => {
      mockUseAuth.mockReturnValue(createMockAuth({ loading: false, user: null }));

      render(
        <AuthProvider>
          <WrappedComponent />
        </AuthProvider>
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('Please sign in to access this content.')).toBeInTheDocument();
    });

    it('should render protected component when authenticated', () => {
      mockUseAuth.mockReturnValue(createMockAuth({ loading: false, user: mockUser as any }));

      render(
        <AuthProvider>
          <WrappedComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('protected')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should pass props to wrapped component', () => {
      mockUseAuth.mockReturnValue(createMockAuth({ loading: false, user: mockUser as any }));

      interface TestProps {
        customProp: string;
      }

      const TestComponent: React.FC<TestProps> = ({ customProp }) => (
        <div data-testid="prop-value">{customProp}</div>
      );

      const WrappedTest = withAuth(TestComponent);

      render(
        <AuthProvider>
          <WrappedTest customProp="test-value" />
        </AuthProvider>
      );

      expect(screen.getByTestId('prop-value')).toHaveTextContent('test-value');
    });
  });

  describe('useIsAuthenticated', () => {
    it('should return false when user is null', () => {
      mockUseAuth.mockReturnValue(createMockAuth({ user: null, isAuthenticated: false }));

      const { result } = renderHook(() => useIsAuthenticated(), { wrapper });

      expect(result.current).toBe(false);
    });

    it('should return true when user is present', () => {
      mockUseAuth.mockReturnValue(createMockAuth({ user: mockUser as any, isAuthenticated: true }));

      const { result } = renderHook(() => useIsAuthenticated(), { wrapper });

      expect(result.current).toBe(true);
    });

    it('should update when auth state changes', () => {
      // Start with no user
      mockUseAuth.mockReturnValue(createMockAuth({ user: null, isAuthenticated: false }));

      const { result, rerender } = renderHook(() => useIsAuthenticated(), { wrapper });

      expect(result.current).toBe(false);

      // Update to have user
      mockUseAuth.mockReturnValue(createMockAuth({ user: mockUser as any, isAuthenticated: true }));
      rerender();

      expect(result.current).toBe(true);
    });
  });

  describe('useRequireAuth', () => {
    it('should throw error when not authenticated and not loading', () => {
      mockUseAuth.mockReturnValue(createMockAuth({ user: null, loading: false }));

      const { result } = renderHook(() => {
        try {
          return useRequireAuth();
        } catch (error) {
          return { error };
        }
      }, { wrapper });

      expect((result.current as any).error?.message).toBe(
        'User must be authenticated to use this feature'
      );
    });

    it('should not throw when loading', () => {
      mockUseAuth.mockReturnValue(createMockAuth({ user: null, loading: true }));

      const { result } = renderHook(() => useRequireAuth(), { wrapper });

      expect(result.current).toBeDefined();
    });

    it('should return auth context when authenticated', () => {
      mockUseAuth.mockReturnValue(createMockAuth({ user: mockUser as any, loading: false }));

      const { result } = renderHook(() => useRequireAuth(), { wrapper });

      expect(result.current.user).toEqual(mockUser);
    });

    it('should provide all auth methods when authenticated', () => {
      mockUseAuth.mockReturnValue(createMockAuth({ user: mockUser as any, loading: false }));

      const { result } = renderHook(() => useRequireAuth(), { wrapper });

      expect(typeof result.current.signIn).toBe('function');
      expect(typeof result.current.signUp).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.resetPassword).toBe('function');
    });
  });

  describe('Context Updates', () => {
    it('should propagate loading state changes', async () => {
      mockUseAuth.mockReturnValue(createMockAuth({ loading: true }));

      const TestComponent = () => {
        const { loading } = useAuthContext();
        return <div data-testid="loading">{loading ? 'Loading' : 'Loaded'}</div>;
      };

      const { rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

      mockUseAuth.mockReturnValue(createMockAuth({ loading: false }));
      rerender(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    it('should propagate error state changes', () => {
      const error = { message: 'Auth error', status: 401, name: 'AuthError' };
      mockUseAuth.mockReturnValue(createMockAuth({ error: error as any }));

      const TestComponent = () => {
        const { error } = useAuthContext();
        return <div data-testid="error">{error?.message || 'No Error'}</div>;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('error')).toHaveTextContent('Auth error');
    });
  });
});
