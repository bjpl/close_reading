/**
 * AuthContext
 *
 * Global authentication context provider
 * Wraps useAuth hook and provides auth state to entire app.
 * Includes utility hooks and HOCs for authentication requirements.
 */

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { useAuth, UseAuthReturn, AuthResult, ValidationResult } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext<UseAuthReturn | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Context Provider
 * Wraps the app to provide authentication state
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const auth = useAuth();

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => auth, [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 */
export const useAuthContext = (): UseAuthReturn => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }

  return context;
};

/**
 * HOC to require authentication
 * Redirects to login if not authenticated
 */
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  const AuthenticatedComponent: React.FC<P> = (props) => {
    const { user, loading } = useAuthContext();

    if (loading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}>
          <div>Loading...</div>
        </div>
      );
    }

    if (!user) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h2>Authentication Required</h2>
          <p>Please sign in to access this content.</p>
        </div>
      );
    }

    return <Component {...props} />;
  };

  return AuthenticatedComponent;
};

/**
 * Hook to check if user is authenticated
 */
export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated } = useAuthContext();
  return isAuthenticated;
};

/**
 * Hook to require authentication (throws if not authenticated)
 */
export const useRequireAuth = (): UseAuthReturn => {
  const auth = useAuthContext();

  if (!auth.user && !auth.loading) {
    throw new Error('User must be authenticated to use this feature');
  }

  return auth;
};

/**
 * Hook providing authentication actions with navigation
 * Automatically navigates after successful auth operations
 */
export const useAuthActions = () => {
  const auth = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  const signInAndNavigate = useCallback(async (
    email: string,
    password: string,
    redirectTo?: string
  ): Promise<AuthResult> => {
    const result = await auth.signIn(email, password);
    if (result.success) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(redirectTo || from || '/dashboard', { replace: true });
    }
    return result;
  }, [auth, navigate, location.state]);

  const signUpAndNavigate = useCallback(async (
    email: string,
    password: string,
    redirectTo?: string
  ): Promise<AuthResult> => {
    const result = await auth.signUp(email, password);
    if (result.success) {
      navigate(redirectTo || '/dashboard', { replace: true });
    }
    return result;
  }, [auth, navigate]);

  const signOutAndNavigate = useCallback(async (
    redirectTo = '/login'
  ): Promise<void> => {
    await auth.signOut();
    navigate(redirectTo, { replace: true });
  }, [auth, navigate]);

  return {
    ...auth,
    signInAndNavigate,
    signUpAndNavigate,
    signOutAndNavigate,
  };
};

/**
 * Hook to get the current user's ID
 * Returns null if not authenticated
 */
export const useUserId = (): string | null => {
  const { user } = useAuthContext();
  return user?.id ?? null;
};

/**
 * Hook to get the current user's email
 * Returns null if not authenticated
 */
export const useUserEmail = (): string | null => {
  const { user } = useAuthContext();
  return user?.email ?? null;
};

/**
 * Hook to validate authentication inputs
 */
export const useAuthValidation = () => {
  const { validateInputs } = useAuthContext();

  return {
    validateInputs,
    validateEmail: (email: string): ValidationResult => validateInputs(email, '', false),
    validatePassword: (password: string, isSignUp = false): ValidationResult => {
      // Create a dummy validation to extract password errors
      const result = validateInputs('test@example.com', password, isSignUp);
      return {
        isValid: result.errors.filter(e => !e.includes('email')).length === 0,
        errors: result.errors.filter(e => !e.includes('email')),
      };
    },
  };
};

// Re-export types for convenience
export type { AuthResult, ValidationResult } from '../hooks/useAuth';
