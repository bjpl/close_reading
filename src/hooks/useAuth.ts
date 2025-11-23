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

  useEffect(() => {
    isMounted.current = true;

    // Get initial session
    const initializeSession = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

        if (!isMounted.current) return;

        logger.info({
          hasUser: !!currentSession?.user,
          userEmail: currentSession?.user?.email
        }, 'Initial session loaded');

        if (sessionError) {
          logger.error({ error: sessionError }, 'Error loading initial session');
          setError(sessionError);
        } else {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
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
        userEmail: newSession?.user?.email
      }, 'Auth state changed');

      setSession(newSession);
      setUser(newSession?.user ?? null);
      setError(null); // Clear errors on successful auth state change
      setLoading(false);
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

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
   * Validate authentication inputs
   */
  const validateInputs = useCallback((
    email: string,
    password: string,
    isSignUp = false
  ): ValidationResult => {
    return validateAuthInputs(email, password, isSignUp);
  }, []);

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
    clearError,
    validateInputs,
  };
};
