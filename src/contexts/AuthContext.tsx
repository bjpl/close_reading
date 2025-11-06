/**
 * AuthContext
 *
 * Global authentication context provider
 * Wraps useAuth hook and provides auth state to entire app
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth, UseAuthReturn } from '../hooks/useAuth';

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

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
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
  const { user } = useAuthContext();
  return !!user;
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
