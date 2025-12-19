/**
 * Comprehensive unit tests for useAuth hook
 *
 * Tests cover:
 * - Email validation (valid/invalid formats)
 * - Password validation (weak/strong passwords, sign-up requirements)
 * - Sign-in flow (success, validation errors, auth errors)
 * - Sign-up flow (success, validation errors, duplicate accounts)
 * - Sign-out functionality (clearing session)
 * - OAuth flows (Google, GitHub)
 * - Password reset functionality
 * - Account deletion (soft/hard delete)
 * - Token refresh monitoring
 * - Session initialization
 * - Error handling and state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth, validateEmail, validatePassword, validateAuthInputs } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { User, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';

// Mock the supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      signInWithOAuth: vi.fn(),
      refreshSession: vi.fn(),
      admin: {
        deleteUser: vi.fn(),
      },
    },
  },
}));

// Mock the logger
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock the account deletion service
vi.mock('@/services/accountDeletion', () => ({
  deleteAccountPermanently: vi.fn(),
  softDeleteAccount: vi.fn(),
}));

describe('useAuth Hook', () => {
  // Helper to create mock user
  const createMockUser = (overrides?: Partial<User>): User => ({
    id: 'test-user-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    ...overrides,
  });

  // Helper to create mock session
  const createMockSession = (user?: User): Session => ({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: user || createMockUser(),
  });

  // Helper to create mock auth error
  const createMockAuthError = (message: string): SupabaseAuthError => ({
    name: 'AuthError',
    message,
    status: 400,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Note: Don't use fake timers globally - they conflict with waitFor
    // Only use fake timers in specific tests that need them (Token Refresh section)

    // Default mock implementations
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'user+tag@example.com',
        'user123@test-domain.com',
      ];

      validEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user @example.com',
        'user@example',
      ];

      invalidEmails.forEach((email) => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Please enter a valid email address');
      });
    });

    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });

    it('should trim whitespace from email', () => {
      const result = validateEmail('  user@example.com  ');
      expect(result.isValid).toBe(true);
    });
  });

  describe('Password Validation', () => {
    it('should accept any password for sign-in', () => {
      const result = validatePassword('weak', false);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require minimum length for sign-up', () => {
      const result = validatePassword('abc', true);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 6 characters');
    });

    it('should require letters for sign-up', () => {
      const result = validatePassword('123456', true);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one letter');
    });

    it('should require numbers for sign-up', () => {
      const result = validatePassword('abcdefg', true);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should accept strong passwords for sign-up', () => {
      const strongPasswords = ['abc123', 'Test123', 'MyP@ssw0rd', 'SuperSecret1'];

      strongPasswords.forEach((password) => {
        const result = validatePassword(password, true);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject empty password', () => {
      const result = validatePassword('', false);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should accumulate multiple errors', () => {
      const result = validatePassword('12', true);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Combined Input Validation', () => {
    it('should validate both email and password', () => {
      const result = validateAuthInputs('user@example.com', 'Test123', true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should combine errors from both validations', () => {
      const result = validateAuthInputs('invalid-email', 'weak', true);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Session Initialization', () => {
    it('should load initial session on mount', async () => {
      const mockSession = createMockSession();
      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle no initial session', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle session loading error', async () => {
      const mockError = createMockAuthError('Failed to load session');
      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('Sign In', () => {
    it('should sign in successfully with valid credentials', async () => {
      const mockUser = createMockUser();
      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser, session: createMockSession(mockUser) },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const authResult = await result.current.signIn('test@example.com', 'password123');

      expect(authResult.success).toBe(true);
      expect(authResult.user).toEqual(mockUser);
      expect(authResult.error).toBeUndefined();
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should reject invalid email format', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const authResult = await result.current.signIn('invalid-email', 'password123');

      expect(authResult.success).toBe(false);
      expect(authResult.error).toContain('valid email');
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should reject empty password', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const authResult = await result.current.signIn('test@example.com', '');

      expect(authResult.success).toBe(false);
      expect(authResult.error).toContain('Password is required');
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should handle invalid credentials error', async () => {
      const mockError = createMockAuthError('Invalid credentials');
      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const authResult = await result.current.signIn('test@example.com', 'wrongpassword');

      expect(authResult.success).toBe(false);
      expect(authResult.error).toContain('Invalid email or password');
    });

    it('should trim email whitespace', async () => {
      const mockUser = createMockUser();
      (supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser, session: createMockSession(mockUser) },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.signIn('  test@example.com  ', 'password123');

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  describe('Sign Up', () => {
    it('should sign up successfully with valid inputs', async () => {
      const mockUser = createMockUser();
      (supabase.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: mockUser, session: createMockSession(mockUser) },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const authResult = await result.current.signUp('new@example.com', 'Test123');

      expect(authResult.success).toBe(true);
      expect(authResult.user).toEqual(mockUser);
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'Test123',
      });
    });

    it('should enforce password requirements for sign-up', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const authResult = await result.current.signUp('test@example.com', 'weak');

      expect(authResult.success).toBe(false);
      expect(authResult.error).toBeTruthy();
      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should handle duplicate account error', async () => {
      const mockError = createMockAuthError('User already exists');
      (supabase.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const authResult = await result.current.signUp('existing@example.com', 'Test123');

      expect(authResult.success).toBe(false);
      expect(authResult.error).toContain('already exists');
    });
  });

  describe('Sign Out', () => {
    it('should sign out successfully', async () => {
      const mockSession = createMockSession();
      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await result.current.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('should handle sign-out error', async () => {
      const mockError = createMockAuthError('Sign out failed');
      (supabase.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: mockError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.signOut();

      expect(result.current.error).toEqual(mockError);
    });
  });

  describe('OAuth Sign In', () => {
    it('should initiate Google OAuth flow', async () => {
      (supabase.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { provider: 'google', url: 'https://accounts.google.com/auth' },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const authResult = await result.current.signInWithGoogle();

      expect(authResult.success).toBe(true);
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
        },
      });
    });

    it('should initiate GitHub OAuth flow', async () => {
      (supabase.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { provider: 'github', url: 'https://github.com/login/oauth' },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const authResult = await result.current.signInWithGitHub();

      expect(authResult.success).toBe(true);
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
        },
      });
    });

    it('should handle OAuth error', async () => {
      const mockError = createMockAuthError('OAuth failed');
      (supabase.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { provider: 'google', url: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const authResult = await result.current.signInWithGoogle();

      expect(authResult.success).toBe(false);
      expect(authResult.error).toBeTruthy();
    });
  });

  describe('Password Reset', () => {
    it('should send password reset email', async () => {
      (supabase.auth.resetPasswordForEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {},
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const authResult = await result.current.resetPassword('test@example.com');

      expect(authResult.success).toBe(true);
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should validate email for password reset', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const authResult = await result.current.resetPassword('invalid-email');

      expect(authResult.success).toBe(false);
      expect(authResult.error).toContain('valid email');
      expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  describe('Account Deletion', () => {
    it('should permanently delete account', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);

      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { deleteAccountPermanently } = await import('@/services/accountDeletion');
      (deleteAccountPermanently as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        message: 'Account deleted',
      });

      (supabase.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const authResult = await result.current.deleteAccount({ soft: false });

      expect(authResult.success).toBe(true);
      expect(deleteAccountPermanently).toHaveBeenCalledWith(mockUser.id);
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should soft delete account', async () => {
      const mockUser = createMockUser();
      const mockSession = createMockSession(mockUser);

      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { softDeleteAccount } = await import('@/services/accountDeletion');
      (softDeleteAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        message: 'Account soft deleted',
      });

      (supabase.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      const authResult = await result.current.deleteAccount({ soft: true });

      expect(authResult.success).toBe(true);
      expect(softDeleteAccount).toHaveBeenCalledWith(mockUser.id);
    });

    it('should reject deletion when not signed in', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const authResult = await result.current.deleteAccount();

      expect(authResult.success).toBe(false);
      expect(authResult.error).toContain('No user is currently signed in');
    });
  });

  describe('Token Refresh', () => {
    // Token refresh tests need fake timers to control time advancement
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should setup token refresh timer', async () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const mockSession = createMockSession();
      mockSession.expires_at = expiresAt;

      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      renderHook(() => useAuth());

      // Flush pending promises while using fake timers
      await vi.runAllTimersAsync();

      // Timer should be set up (we can't directly test this without exposing internals)
      // But we can verify the session was loaded
      expect(supabase.auth.getSession).toHaveBeenCalled();
    });

    it('should refresh token before expiry', async () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
      const mockSession = createMockSession();
      mockSession.expires_at = expiresAt;

      const newSession = createMockSession();
      newSession.expires_at = Math.floor(Date.now() / 1000) + 3600;

      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.auth.refreshSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: newSession },
        error: null,
      });

      renderHook(() => useAuth());

      // Flush initial async work
      await vi.runAllTimersAsync();

      expect(supabase.auth.getSession).toHaveBeenCalled();

      // Fast-forward time to trigger refresh (5 minutes before expiry)
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1000);

      expect(supabase.auth.refreshSession).toHaveBeenCalled();
    });

    it('should handle token refresh failure', async () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 600;
      const mockSession = createMockSession();
      mockSession.expires_at = expiresAt;

      const mockError = createMockAuthError('Token refresh failed');

      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      (supabase.auth.refreshSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth());

      // Flush initial async work
      await vi.runAllTimersAsync();

      expect(supabase.auth.getSession).toHaveBeenCalled();

      // Fast-forward to trigger refresh
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1000);

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('Auth State Changes', () => {
    it('should handle SIGNED_IN event', async () => {
      const mockSession = createMockSession();
      let authStateCallback: ((event: string, session: Session | null) => void) | undefined;

      (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockImplementation((callback) => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Trigger SIGNED_IN event
      authStateCallback?.('SIGNED_IN', mockSession);

      await waitFor(() => {
        expect(result.current.user).toEqual(mockSession.user);
        expect(result.current.session).toEqual(mockSession);
      });
    });

    it('should handle SIGNED_OUT event', async () => {
      let authStateCallback: ((event: string, session: Session | null) => void) | undefined;

      (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockImplementation((callback) => {
        authStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Trigger SIGNED_OUT event
      authStateCallback?.('SIGNED_OUT', null);

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
      });
    });
  });

  describe('Error Management', () => {
    it('should clear error state', async () => {
      const mockError = createMockAuthError('Test error');
      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.error).toEqual(mockError);
      });

      result.current.clearError();

      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      const unsubscribeMock = vi.fn();

      (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockReturnValue({
        data: {
          subscription: {
            unsubscribe: unsubscribeMock,
          },
        },
      });

      const { unmount } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });

    it('should clear refresh timer on unmount', async () => {
      // This test needs fake timers to verify timer cleanup
      vi.useFakeTimers();

      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const mockSession = createMockSession();
      mockSession.expires_at = expiresAt;

      (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { unmount } = renderHook(() => useAuth());

      // Flush initial async work
      await vi.runAllTimersAsync();

      expect(supabase.auth.getSession).toHaveBeenCalled();

      unmount();

      // If timer wasn't cleared, this would trigger refresh
      await vi.advanceTimersByTimeAsync(55 * 60 * 1000);

      expect(supabase.auth.refreshSession).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Input Validation Helper', () => {
    it('should validate inputs through hook method', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const validation = result.current.validateInputs('test@example.com', 'Test123', true);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
