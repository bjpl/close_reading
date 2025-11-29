/**
 * MockAuthService Unit Tests
 *
 * Comprehensive tests for the mock authentication service including:
 * - Sign in with password
 * - Sign up
 * - Sign out
 * - Session management
 * - Auth state change listeners
 * - Password reset
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { MockAuthService } from '@/lib/mock/auth';
import { MockDB, MockUser } from '@/lib/mock/types';
import { IDBPDatabase } from 'idb';

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MockAuthService', () => {
  let authService: MockAuthService;
  let mockDb: Partial<IDBPDatabase<MockDB>>;
  let currentUser: MockUser | null;
  let generateId: Mock;
  let getCurrentUser: Mock;
  let setCurrentUser: Mock;

  // Test user data
  const testUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    password: 'securePassword123!',
    created_at: '2024-01-01T00:00:00Z',
    user_metadata: {},
  };

  const sanitizedUser: MockUser = {
    id: testUser.id,
    email: testUser.email,
    created_at: testUser.created_at,
    user_metadata: testUser.user_metadata,
    aud: 'authenticated',
    role: 'authenticated',
  };

  beforeEach(() => {
    // Reset current user state
    currentUser = null;

    // Create mock functions
    generateId = vi.fn().mockReturnValue('generated-id-123');
    getCurrentUser = vi.fn(() => currentUser);
    setCurrentUser = vi.fn((user: MockUser | null) => {
      currentUser = user;
    });

    // Create mock database
    mockDb = {
      getFromIndex: vi.fn(),
      add: vi.fn(),
    };

    // Create auth service instance
    authService = new MockAuthService(
      mockDb as IDBPDatabase<MockDB>,
      generateId,
      getCurrentUser,
      setCurrentUser
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getSession', () => {
    it('should return null session when no user is logged in', async () => {
      const result = await authService.getSession();

      expect(result.data.session).toBeNull();
      expect(result.error).toBeNull();
    });

    it('should return session with tokens when user is logged in', async () => {
      // The getSession method checks stored session first, then falls back to getCurrentUser
      // To test the getCurrentUser fallback, we need to ensure no stored session exists
      // But in the test environment, localStorage might be mocked differently

      // First, sign in a user to create a proper session
      (mockDb.getFromIndex as Mock).mockResolvedValue({
        id: testUser.id,
        email: testUser.email,
        password: testUser.password,
        created_at: testUser.created_at,
        user_metadata: {},
      });

      // Sign in to establish a session
      await authService.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      // Now getSession should return the established session
      const result = await authService.getSession();

      expect(result.data.session).not.toBeNull();
      expect(result.data.session?.user.email).toEqual(testUser.email);
      // Token format now includes timestamp and random suffix
      expect(result.data.session?.access_token).toMatch(/^mock_token_test-user-123_\d+_[a-z0-9]+$/);
      expect(result.data.session?.refresh_token).toMatch(/^mock_refresh_test-user-123_\d+_[a-z0-9]+$/);
      expect(result.error).toBeNull();
    });
  });

  describe('signInWithPassword', () => {
    it('should sign in user with valid credentials', async () => {
      (mockDb.getFromIndex as Mock).mockResolvedValue(testUser);

      const result = await authService.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      expect(result.data.user).not.toBeNull();
      expect(result.data.user?.email).toBe(testUser.email);
      expect(result.data.session).not.toBeNull();
      expect(result.error).toBeNull();
      expect(setCurrentUser).toHaveBeenCalledWith(expect.objectContaining({
        email: testUser.email,
      }));
    });

    it('should return error for invalid credentials', async () => {
      (mockDb.getFromIndex as Mock).mockResolvedValue(testUser);

      const result = await authService.signInWithPassword({
        email: testUser.email,
        password: 'wrongPassword',
      });

      expect(result.data.user).toBeNull();
      expect(result.data.session).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('Invalid credentials');
    });

    it('should return error for non-existent user', async () => {
      (mockDb.getFromIndex as Mock).mockResolvedValue(undefined);

      const result = await authService.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(result.data.user).toBeNull();
      expect(result.data.session).toBeNull();
      expect(result.error?.message).toBe('Invalid credentials');
    });

    it('should return error when database is not initialized', async () => {
      const serviceWithoutDb = new MockAuthService(
        null,
        generateId,
        getCurrentUser,
        setCurrentUser
      );

      const result = await serviceWithoutDb.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      expect(result.data.user).toBeNull();
      expect(result.error?.message).toBe('Database not initialized. Please try again.');
    });

    it('should handle database errors gracefully', async () => {
      (mockDb.getFromIndex as Mock).mockRejectedValue(new Error('Database error'));

      const result = await authService.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      expect(result.data.user).toBeNull();
      expect(result.error?.message).toBe('Login failed. Please try again.');
    });

    it('should not include password in returned user object', async () => {
      (mockDb.getFromIndex as Mock).mockResolvedValue(testUser);

      const result = await authService.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      expect(result.data.user).not.toHaveProperty('password');
    });

    it('should include proper authentication fields in user object', async () => {
      (mockDb.getFromIndex as Mock).mockResolvedValue(testUser);

      const result = await authService.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      expect(result.data.user?.aud).toBe('authenticated');
      expect(result.data.user?.role).toBe('authenticated');
    });
  });

  describe('signUp', () => {
    it('should create new user successfully', async () => {
      (mockDb.add as Mock).mockResolvedValue(undefined);

      const result = await authService.signUp({
        email: 'newuser@example.com',
        password: 'newPassword123!',
      });

      expect(result.data.user).not.toBeNull();
      expect(result.data.user?.email).toBe('newuser@example.com');
      expect(result.data.session).not.toBeNull();
      expect(result.error).toBeNull();
      expect(generateId).toHaveBeenCalled();
      expect(mockDb.add).toHaveBeenCalledWith('users', expect.objectContaining({
        email: 'newuser@example.com',
        password: 'newPassword123!',
      }));
    });

    it('should return error for duplicate email', async () => {
      // Mock getFromIndex to return an existing user
      (mockDb.getFromIndex as Mock).mockResolvedValue(testUser);

      const result = await authService.signUp({
        email: testUser.email,
        password: 'password123',
      });

      expect(result.data.user).toBeNull();
      expect(result.error?.message).toBe('User already exists');
    });

    it('should return error when database is not initialized', async () => {
      const serviceWithoutDb = new MockAuthService(
        null,
        generateId,
        getCurrentUser,
        setCurrentUser
      );

      const result = await serviceWithoutDb.signUp({
        email: 'new@example.com',
        password: 'password123',
      });

      expect(result.data.user).toBeNull();
      expect(result.error?.message).toBe('Database not initialized. Please try again.');
    });

    it('should automatically sign in user after signup', async () => {
      (mockDb.add as Mock).mockResolvedValue(undefined);

      const result = await authService.signUp({
        email: 'newuser@example.com',
        password: 'password123',
      });

      expect(setCurrentUser).toHaveBeenCalled();
      expect(result.data.session).not.toBeNull();
    });

    it('should generate created_at timestamp', async () => {
      (mockDb.add as Mock).mockResolvedValue(undefined);

      await authService.signUp({
        email: 'newuser@example.com',
        password: 'password123',
      });

      expect(mockDb.add).toHaveBeenCalledWith('users', expect.objectContaining({
        created_at: expect.any(String),
      }));
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      currentUser = sanitizedUser;

      const result = await authService.signOut();

      expect(result.error).toBeNull();
      expect(setCurrentUser).toHaveBeenCalledWith(null);
    });

    it('should handle sign out when no user is logged in', async () => {
      const result = await authService.signOut();

      expect(result.error).toBeNull();
      expect(setCurrentUser).toHaveBeenCalledWith(null);
    });
  });

  describe('onAuthStateChange', () => {
    it('should register callback and return unsubscribe function', () => {
      const callback = vi.fn();

      const subscription = authService.onAuthStateChange(callback);

      expect(subscription.data.subscription).toBeDefined();
      expect(typeof subscription.data.subscription.unsubscribe).toBe('function');
    });

    it('should call callback immediately with current session if user is logged in', async () => {
      currentUser = sanitizedUser;
      const callback = vi.fn();

      authService.onAuthStateChange(callback);

      // Wait for setTimeout to execute
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith('INITIAL_SESSION', expect.objectContaining({
        user: sanitizedUser,
      }));
    });

    it('should not call callback immediately if no user is logged in', async () => {
      const callback = vi.fn();

      authService.onAuthStateChange(callback);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should notify listeners on sign in', async () => {
      (mockDb.getFromIndex as Mock).mockResolvedValue(testUser);
      const callback = vi.fn();

      authService.onAuthStateChange(callback);

      await authService.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith('SIGNED_IN', expect.objectContaining({
        user: expect.objectContaining({ email: testUser.email }),
      }));
    });

    it('should notify listeners on sign out', async () => {
      currentUser = sanitizedUser;
      const callback = vi.fn();

      authService.onAuthStateChange(callback);

      // Clear initial call
      callback.mockClear();

      await authService.signOut();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith('SIGNED_OUT', null);
    });

    it('should unsubscribe callback correctly', async () => {
      (mockDb.getFromIndex as Mock).mockResolvedValue(testUser);
      const callback = vi.fn();

      const subscription = authService.onAuthStateChange(callback);
      subscription.data.subscription.unsubscribe();

      await authService.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalledWith('SIGNED_IN', expect.anything());
    });

    it('should support multiple listeners', async () => {
      (mockDb.getFromIndex as Mock).mockResolvedValue(testUser);
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      authService.onAuthStateChange(callback1);
      authService.onAuthStateChange(callback2);

      await authService.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback1).toHaveBeenCalledWith('SIGNED_IN', expect.anything());
      expect(callback2).toHaveBeenCalledWith('SIGNED_IN', expect.anything());
    });
  });

  describe('resetPasswordForEmail', () => {
    it('should return success for any email', async () => {
      const result = await authService.resetPasswordForEmail('test@example.com');

      expect(result.data).toEqual({});
      expect(result.error).toBeNull();
    });

    it('should handle non-existent email gracefully', async () => {
      const result = await authService.resetPasswordForEmail('nonexistent@example.com');

      expect(result.error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty email during sign in', async () => {
      const result = await authService.signInWithPassword({
        email: '',
        password: 'password123',
      });

      expect(result.error?.message).toBe('Email is required');
    });

    it('should handle empty password during sign in', async () => {
      const result = await authService.signInWithPassword({
        email: testUser.email,
        password: '',
      });

      // Empty password should return error
      expect(result.error?.message).toBe('Password is required');
    });

    it('should handle special characters in email', async () => {
      const specialEmail = 'test+special@example.com';
      (mockDb.getFromIndex as Mock).mockResolvedValue({
        ...testUser,
        email: specialEmail,
      });

      const result = await authService.signInWithPassword({
        email: specialEmail,
        password: testUser.password,
      });

      expect(result.data.user?.email).toBe(specialEmail);
    });

    it('should handle special characters in password', async () => {
      const specialPassword = 'p@$$w0rd!#$%^&*()';
      (mockDb.getFromIndex as Mock).mockResolvedValue({
        ...testUser,
        password: specialPassword,
      });

      const result = await authService.signInWithPassword({
        email: testUser.email,
        password: specialPassword,
      });

      expect(result.data.user).not.toBeNull();
    });

    it('should handle unicode characters in user metadata', async () => {
      const userWithUnicode = {
        ...testUser,
        user_metadata: { name: '日本語', emoji: '🎉' },
      };
      (mockDb.getFromIndex as Mock).mockResolvedValue(userWithUnicode);

      const result = await authService.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      expect(result.data.user?.user_metadata).toEqual({ name: '日本語', emoji: '🎉' });
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      (mockDb.getFromIndex as Mock).mockResolvedValue({
        ...testUser,
        password: longPassword,
      });

      const result = await authService.signInWithPassword({
        email: testUser.email,
        password: longPassword,
      });

      expect(result.data.user).not.toBeNull();
    });
  });
});
