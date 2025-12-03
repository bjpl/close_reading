/**
 * Authentication Hook
 *
 * Provides authentication state and operations with comprehensive
 * error handling, input validation, and session management.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import logger from '../lib/logger';

/**
 * Authentication result type for sign-in/sign-up operations
 */
export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User | null;
}

/**
 * Input validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates email format
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];

  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Please enter a valid email address');
    }
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validates password requirements
 */
export const validatePassword = (password: string, isSignUp = false): ValidationResult => {
  const errors: string[] = [];

  if (!password || password.length === 0) {
    errors.push('Password is required');
  } else if (isSignUp) {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    if (!/[A-Za-z]/.test(password)) {
      errors.push('Password must contain at least one letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validates all authentication inputs
 */
export const validateAuthInputs = (
  email: string,
  password: string,
  isSignUp = false
): ValidationResult => {
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password, isSignUp);

  return {
    isValid: emailValidation.isValid && passwordValidation.isValid,
    errors: [...emailValidation.errors, ...passwordValidation.errors],
  };
};

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithGitHub: () => Promise<AuthResult>;
  deleteAccount: (options?: { soft?: boolean }) => Promise<AuthResult>;
  clearError: () => void;
  validateInputs: (email: string, password: string, isSignUp?: boolean) => ValidationResult;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  // Track token refresh timer
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Setup automatic token refresh monitoring
   * Refreshes the session 5 minutes before expiry
   */
  const setupTokenRefreshMonitor = useCallback((currentSession: Session | null) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!currentSession?.expires_at) {
      return;
    }

    const expiresAt = currentSession.expires_at;
    const expiresAtMs = expiresAt * 1000; // Convert to milliseconds
    const now = Date.now();

    // Refresh 5 minutes (300000ms) before expiry
    const REFRESH_BUFFER_MS = 5 * 60 * 1000;
    const refreshTime = expiresAtMs - REFRESH_BUFFER_MS;
    const timeUntilRefresh = refreshTime - now;

    logger.info({
      expiresAt: new Date(expiresAtMs).toISOString(),
      refreshAt: new Date(refreshTime).toISOString(),
      timeUntilRefreshMinutes: Math.round(timeUntilRefresh / 60000),
    }, 'Token refresh monitor setup');

    // Only setup refresh if there's time before expiry
    if (timeUntilRefresh > 0) {
      refreshTimerRef.current = setTimeout(async () => {
        if (!isMounted.current) return;

        logger.info('Attempting automatic token refresh');

        try {
          const { data, error: refreshError } = await supabase.auth.refreshSession();

          if (!isMounted.current) return;

          if (refreshError) {
            logger.error({ error: refreshError }, 'Token refresh failed');
            setError(refreshError);

            // Clear session on refresh failure - user will need to re-authenticate
            setSession(null);
            setUser(null);

            // The auth state change listener will handle redirecting to login
          } else if (data.session) {
            logger.info('Token refresh successful');
            setSession(data.session);
            setUser(data.session.user);
            setError(null);

            // Setup next refresh
            setupTokenRefreshMonitor(data.session);
          }
        } catch (err) {
          logger.error({ error: err }, 'Token refresh exception');
          if (isMounted.current) {
            setSession(null);
            setUser(null);
          }
        }
      }, timeUntilRefresh);
    } else if (timeUntilRefresh <= 0 && expiresAtMs > now) {
      // Session is about to expire or already expired, refresh immediately
      logger.warn('Session expiring soon or expired, refreshing immediately');

      supabase.auth.refreshSession().then(({ data, error: refreshError }) => {
        if (!isMounted.current) return;

        if (refreshError) {
          logger.error({ error: refreshError }, 'Immediate token refresh failed');
          setError(refreshError);
          setSession(null);
          setUser(null);
        } else if (data.session) {
          logger.info('Immediate token refresh successful');
          setSession(data.session);
          setUser(data.session.user);
          setError(null);
          setupTokenRefreshMonitor(data.session);
        }
      });
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    // Get initial session
    const initializeSession = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (!isMounted.current) return;

        logger.info({
          hasUser: !!currentSession?.user,
          userEmail: currentSession?.user?.email,
          hasExpiry: !!currentSession?.expires_at,
        }, 'Initial session loaded');

        if (sessionError) {
          logger.error({ error: sessionError }, 'Error loading initial session');
          setError(sessionError);
        } else {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          // Setup token refresh monitoring for initial session
          if (currentSession) {
            setupTokenRefreshMonitor(currentSession);
          }
        }
      } catch (err) {
        logger.error({ error: err }, 'Exception loading initial session');
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    initializeSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted.current) return;

      logger.info({
        event,
        hasUser: !!newSession?.user,
        userEmail: newSession?.user?.email,
        hasExpiry: !!newSession?.expires_at,
      }, 'Auth state changed');

      setSession(newSession);
      setUser(newSession?.user ?? null);
      setError(null); // Clear errors on successful auth state change
      setLoading(false);

      // Setup/clear token refresh monitoring based on session state
      if (newSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setupTokenRefreshMonitor(newSession);
      } else if (event === 'SIGNED_OUT') {
        // Clear refresh timer on sign out
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();

      // Clear refresh timer on cleanup
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [setupTokenRefreshMonitor]);

  /**
   * Sign in with email and password
   * Returns a result object with success status and optional error
   */
  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    // Validate inputs first
    const validation = validateAuthInputs(email, password, false);
    if (!validation.isValid) {
      const errorMessage = validation.errors.join('. ');
      return { success: false, error: errorMessage };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!isMounted.current) {
        return { success: false, error: 'Component unmounted' };
      }

      if (signInError) {
        logger.warn({ email, error: signInError.message }, 'Sign in failed');
        setError(signInError);
        return {
          success: false,
          error: signInError.message === 'Invalid credentials'
            ? 'Invalid email or password. Please try again.'
            : signInError.message
        };
      }

      logger.info({ email, userId: data.user?.id }, 'Sign in successful');

      // Session will be updated via onAuthStateChange listener
      return { success: true, user: data.user };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      logger.error({ email, error: errorMessage }, 'Sign in exception');
      return { success: false, error: errorMessage };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Sign up with email and password
   * Returns a result object with success status and optional error
   */
  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    // Validate inputs with stricter password requirements for sign-up
    const validation = validateAuthInputs(email, password, true);
    if (!validation.isValid) {
      const errorMessage = validation.errors.join('. ');
      return { success: false, error: errorMessage };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (!isMounted.current) {
        return { success: false, error: 'Component unmounted' };
      }

      if (signUpError) {
        logger.warn({ email, error: signUpError.message }, 'Sign up failed');
        setError(signUpError);
        return {
          success: false,
          error: signUpError.message === 'User already exists'
            ? 'An account with this email already exists. Please sign in instead.'
            : signUpError.message
        };
      }

      logger.info({ email, userId: data.user?.id }, 'Sign up successful');
      return { success: true, user: data.user };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      logger.error({ email, error: errorMessage }, 'Sign up exception');
      return { success: false, error: errorMessage };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (!isMounted.current) return;

      if (signOutError) {
        logger.warn({ error: signOutError.message }, 'Sign out failed');
        setError(signOutError);
      } else {
        logger.info('Sign out successful');
        // Clear local state immediately for better UX
        setUser(null);
        setSession(null);
      }
    } catch (err) {
      logger.error({ error: err }, 'Sign out exception');
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Request password reset email
   */
  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    const validation = validateEmail(email);
    if (!validation.isValid) {
      return { success: false, error: validation.errors.join('. ') };
    }

    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (!isMounted.current) {
        return { success: false, error: 'Component unmounted' };
      }

      if (resetError) {
        logger.warn({ email, error: resetError.message }, 'Password reset failed');
        setError(resetError);
        return { success: false, error: resetError.message };
      }

      logger.info({ email }, 'Password reset email sent');
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      logger.error({ email, error: errorMessage }, 'Password reset exception');
      return { success: false, error: errorMessage };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Sign in with Google OAuth
   */
  const signInWithGoogle = useCallback(async (): Promise<AuthResult> => {
    setLoading(true);
    setError(null);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (!isMounted.current) {
        return { success: false, error: 'Component unmounted' };
      }

      if (oauthError) {
        logger.warn({ error: oauthError.message }, 'Google OAuth failed');
        setError(oauthError);
        return {
          success: false,
          error: oauthError.message || 'Failed to sign in with Google',
        };
      }

      logger.info('Google OAuth initiated');
      // OAuth flow will redirect user, so we return success
      // The actual session will be established after redirect
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      logger.error({ error: errorMessage }, 'Google OAuth exception');
      return { success: false, error: errorMessage };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Sign in with GitHub OAuth
   */
  const signInWithGitHub = useCallback(async (): Promise<AuthResult> => {
    setLoading(true);
    setError(null);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (!isMounted.current) {
        return { success: false, error: 'Component unmounted' };
      }

      if (oauthError) {
        logger.warn({ error: oauthError.message }, 'GitHub OAuth failed');
        setError(oauthError);
        return {
          success: false,
          error: oauthError.message || 'Failed to sign in with GitHub',
        };
      }

      logger.info('GitHub OAuth initiated');
      // OAuth flow will redirect user, so we return success
      // The actual session will be established after redirect
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      logger.error({ error: errorMessage }, 'GitHub OAuth exception');
      return { success: false, error: errorMessage };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Validate authentication inputs
   */
  const validateInputs = useCallback((
    email: string,
    password: string,
    isSignUp = false
  ): ValidationResult => {
    return validateAuthInputs(email, password, isSignUp);
  }, []);

  /**
   * Delete user account and all associated data
   *
   * @param options - Deletion options
   * @param options.soft - If true, soft delete with 30-day recovery period. If false (default), permanent deletion.
   * @returns Promise with deletion result
   */
  const deleteAccount = useCallback(async (options: { soft?: boolean } = {}): Promise<AuthResult> => {
    if (!user) {
      return { success: false, error: 'No user is currently signed in' };
    }

    setLoading(true);
    setError(null);

    try {
      // Import the account deletion service dynamically
      const { deleteAccountPermanently, softDeleteAccount } = await import('../services/accountDeletion');

      let result;
      if (options.soft) {
        result = await softDeleteAccount(user.id);
      } else {
        result = await deleteAccountPermanently(user.id);
      }

      if (!isMounted.current) {
        return { success: false, error: 'Component unmounted' };
      }

      if (!result.success) {
        logger.error({ userId: user.id, error: result.error }, 'Account deletion failed');
        return { success: false, error: result.error };
      }

      logger.info({ userId: user.id, soft: options.soft }, 'Account deletion successful');

      // Sign out the user after successful deletion
      await signOut();

      return {
        success: true,
        user: null
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      logger.error({ userId: user.id, error: errorMessage }, 'Account deletion exception');
      return { success: false, error: errorMessage };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [user, signOut]);

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    resetPassword,
    signInWithGoogle,
    signInWithGitHub,
    deleteAccount,
    clearError,
    validateInputs,
  };
};
