/**
 * Mock Authentication Service
 *
 * Provides a mock implementation of Supabase auth API for local development.
 * Uses IndexedDB for user storage and localStorage for session persistence.
 * Includes improved error handling, session validation, and token management.
 */

import { IDBPDatabase } from 'idb';
import { MockDB, MockUser, MockSession, SupabaseResponse } from './types';
import logger from '@/lib/logger';

/**
 * Callback function for authentication state changes
 */
type AuthCallback = (event: string, session: MockSession | null) => void;

/**
 * Session storage keys
 */
const SESSION_STORAGE_KEY = 'mock_auth_session';
const SESSION_EXPIRY_KEY = 'mock_auth_session_expiry';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Mock authentication service class
 *
 * Implements the Supabase auth API surface including:
 * - Sign in/sign up with email and password
 * - Session management with expiry
 * - Auth state change listeners
 * - Password reset functionality
 * - Token refresh simulation
 */
export class MockAuthService {
  private authListeners: AuthCallback[] = [];
  private sessionCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private db: IDBPDatabase<MockDB> | null,
    private generateId: () => string,
    private getCurrentUser: () => MockUser | null,
    private setCurrentUser: (user: MockUser | null) => void
  ) {
    // Initialize session check on construction
    this.initializeSessionCheck();
  }

  /**
   * Initialize periodic session validation
   * Checks session expiry every minute
   */
  private initializeSessionCheck(): void {
    // Check session validity on initialization
    this.validateStoredSession();

    // Set up periodic check (every minute)
    this.sessionCheckInterval = setInterval(() => {
      this.validateStoredSession();
    }, 60000);
  }

  /**
   * Validates the stored session and clears if expired
   */
  private validateStoredSession(): void {
    const expiryStr = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (expiryStr) {
      const expiry = parseInt(expiryStr, 10);
      if (Date.now() > expiry) {
        logger.info('Mock auth: Session expired, clearing');
        this.clearSession();
        this.authListeners.forEach(cb => cb('TOKEN_EXPIRED', null));
      }
    }
  }

  /**
   * Stores session data with expiry
   */
  private storeSession(session: MockSession): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS));
  }

  /**
   * Retrieves stored session if valid
   */
  private getStoredSession(): MockSession | null {
    const expiryStr = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (!expiryStr || Date.now() > parseInt(expiryStr, 10)) {
      this.clearSession();
      return null;
    }

    const sessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionStr) {
      return null;
    }

    try {
      return JSON.parse(sessionStr) as MockSession;
    } catch {
      this.clearSession();
      return null;
    }
  }

  /**
   * Clears all session data
   */
  private clearSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    this.setCurrentUser(null);
  }

  /**
   * Generates a mock access token
   */
  private generateAccessToken(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `mock_token_${userId}_${timestamp}_${random}`;
  }

  /**
   * Generates a mock refresh token
   */
  private generateRefreshToken(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `mock_refresh_${userId}_${timestamp}_${random}`;
  }

  /**
   * Creates a session object for a user
   */
  private createSession(user: MockUser): MockSession {
    return {
      access_token: this.generateAccessToken(user.id),
      refresh_token: this.generateRefreshToken(user.id),
      user,
    };
  }

  /**
   * Gets the current session
   *
   * Checks for stored session first, then falls back to current user.
   * Validates session expiry before returning.
   *
   * @returns Current session with user and tokens, or null if not authenticated
   */
  async getSession(): Promise<SupabaseResponse<{ session: MockSession | null }>> {
    // First check for stored session with valid expiry
    const storedSession = this.getStoredSession();
    if (storedSession) {
      logger.debug({
        hasUser: true,
        userId: storedSession.user.id,
        userEmail: storedSession.user.email
      }, 'Mock auth: getSession - returning stored session');

      // Ensure current user is in sync
      this.setCurrentUser(storedSession.user);
      return { data: { session: storedSession }, error: null };
    }

    // Fall back to current user (for backwards compatibility)
    const user = this.getCurrentUser();
    logger.debug({
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    }, 'Mock auth: getSession called');

    if (user) {
      // Create and store a new session
      const session = this.createSession(user);
      this.storeSession(session);
      return { data: { session }, error: null };
    }

    return { data: { session: null }, error: null };
  }

  /**
   * Refreshes the current session token
   *
   * @returns New session with fresh tokens
   */
  async refreshSession(): Promise<SupabaseResponse<{ session: MockSession | null }>> {
    const currentSession = this.getStoredSession();
    if (!currentSession) {
      logger.warn('Mock auth: No session to refresh');
      return { data: { session: null }, error: { message: 'No session to refresh' } };
    }

    // Create new session with fresh tokens
    const newSession = this.createSession(currentSession.user);
    this.storeSession(newSession);

    logger.info({
      userId: currentSession.user.id
    }, 'Mock auth: Session refreshed');

    // Notify listeners
    setTimeout(() => {
      this.authListeners.forEach(cb => cb('TOKEN_REFRESHED', newSession));
    }, 0);

    return { data: { session: newSession }, error: null };
  }

  /**
   * Signs in a user with email and password
   *
   * Validates credentials against stored users in IndexedDB,
   * creates a session with expiry, and notifies listeners.
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns User object and session on success, error on failure
   */
  async signInWithPassword({ email, password }: { email: string; password: string }): Promise<SupabaseResponse<{ user: MockUser | null; session: MockSession | null }>> {
    // Validate inputs
    if (!email || !email.trim()) {
      return { data: { user: null, session: null }, error: { message: 'Email is required' } };
    }
    if (!password) {
      return { data: { user: null, session: null }, error: { message: 'Password is required' } };
    }

    if (!this.db) {
      logger.warn('Mock auth: Database not initialized, retrying...');
      // Wait a bit for DB to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!this.db) {
        return { data: { user: null, session: null }, error: { message: 'Database not initialized. Please try again.' } };
      }
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const user = await this.db.getFromIndex('users', 'by-email', normalizedEmail);

      if (!user) {
        logger.warn({ email: normalizedEmail }, 'Mock auth: User not found');
        return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } };
      }

      if (user.password !== password) {
        logger.warn({ email: normalizedEmail }, 'Mock auth: Invalid password');
        return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } };
      }

      // Create sanitized user object (without password)
      const sanitized: MockUser = {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        user_metadata: user.user_metadata || {},
        aud: 'authenticated',
        role: 'authenticated',
      };

      // Create and store session
      const session = this.createSession(sanitized);
      this.storeSession(session);
      this.setCurrentUser(sanitized);

      logger.info({
        userId: sanitized.id,
        userEmail: sanitized.email
      }, 'Mock auth: User signed in successfully');

      // Notify listeners asynchronously
      setTimeout(() => {
        this.authListeners.forEach(cb => cb('SIGNED_IN', session));
      }, 0);

      return { data: { user: sanitized, session }, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({
        email,
        error: errorMessage
      }, 'Mock auth: Login failed with exception');
      return { data: { user: null, session: null }, error: { message: 'Login failed. Please try again.' } };
    }
  }

  /**
   * Signs up a new user with email and password
   *
   * Creates a new user in IndexedDB, establishes a session,
   * and notifies listeners. Validates email uniqueness.
   *
   * @param email - New user's email address
   * @param password - New user's password
   * @returns User object and session on success, error if user already exists
   */
  async signUp({ email, password }: { email: string; password: string }): Promise<SupabaseResponse<{ user: MockUser | null; session: MockSession | null }>> {
    // Validate inputs
    if (!email || !email.trim()) {
      return { data: { user: null, session: null }, error: { message: 'Email is required' } };
    }
    if (!password) {
      return { data: { user: null, session: null }, error: { message: 'Password is required' } };
    }
    if (password.length < 6) {
      return { data: { user: null, session: null }, error: { message: 'Password must be at least 6 characters' } };
    }

    if (!this.db) {
      logger.warn('Mock auth: Database not initialized, retrying...');
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!this.db) {
        return { data: { user: null, session: null }, error: { message: 'Database not initialized. Please try again.' } };
      }
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    try {
      const existingUser = await this.db.getFromIndex('users', 'by-email', normalizedEmail);
      if (existingUser) {
        logger.warn({ email: normalizedEmail }, 'Mock auth: User already exists');
        return { data: { user: null, session: null }, error: { message: 'User already exists' } };
      }
    } catch {
      // Index lookup failed, continue with registration
    }

    const user = {
      id: this.generateId(),
      email: normalizedEmail,
      password,
      created_at: new Date().toISOString(),
      user_metadata: {},
    };

    try {
      await this.db.add('users', user);

      // Create sanitized user object (without password)
      const sanitized: MockUser = {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        user_metadata: user.user_metadata,
        aud: 'authenticated',
        role: 'authenticated',
      };

      // Create and store session
      const session = this.createSession(sanitized);
      this.storeSession(session);
      this.setCurrentUser(sanitized);

      logger.info({
        userId: sanitized.id,
        userEmail: sanitized.email
      }, 'Mock auth: User signed up successfully');

      // Notify listeners asynchronously
      setTimeout(() => {
        this.authListeners.forEach(cb => cb('SIGNED_IN', session));
      }, 0);

      return { data: { user: sanitized, session }, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({
        email: normalizedEmail,
        error: errorMessage
      }, 'Mock auth: Signup failed with exception');

      // Check if it's a duplicate key error
      if (errorMessage.includes('already exists') || errorMessage.includes('ConstraintError')) {
        return { data: { user: null, session: null }, error: { message: 'User already exists' } };
      }

      return { data: { user: null, session: null }, error: { message: 'Registration failed. Please try again.' } };
    }
  }

  /**
   * Signs out the current user
   *
   * Clears all session data from storage and notifies listeners.
   */
  async signOut(): Promise<{ error: null }> {
    const currentUser = this.getCurrentUser();
    logger.info({
      userId: currentUser?.id,
      userEmail: currentUser?.email
    }, 'Mock auth: User signing out');

    // Clear all session data
    this.clearSession();

    logger.info('Mock auth: User signed out successfully');

    // Notify listeners asynchronously
    setTimeout(() => {
      this.authListeners.forEach(cb => cb('SIGNED_OUT', null));
    }, 0);

    return { error: null };
  }

  /**
   * Gets the current user
   *
   * @returns Current authenticated user or null
   */
  async getUser(): Promise<SupabaseResponse<{ user: MockUser | null }>> {
    const session = this.getStoredSession();
    return { data: { user: session?.user ?? null }, error: null };
  }

  /**
   * Registers a callback for auth state changes
   *
   * @param callback - Function to call when auth state changes
   * @returns Subscription object with unsubscribe method
   */
  onAuthStateChange(callback: AuthCallback) {
    this.authListeners.push(callback);

    // Immediately call with current state
    const user = this.getCurrentUser();
    if (user) {
      const session: MockSession = {
        access_token: `mock_token_${user.id}`,
        refresh_token: `mock_refresh_${user.id}`,
        user,
      };
      setTimeout(() => callback('INITIAL_SESSION', session), 0);
    }

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const index = this.authListeners.indexOf(callback);
            if (index > -1) {
              this.authListeners.splice(index, 1);
            }
          },
        },
      },
    };
  }

  /**
   * Initiates password reset for an email address
   *
   * @param email - Email address to send reset link to
   * @returns Success response (mock implementation, doesn't send actual email)
   */
  async resetPasswordForEmail(email: string): Promise<SupabaseResponse<Record<string, never>>> {
    logger.info({ email }, 'Mock auth: Password reset requested');
    return { data: {}, error: null };
  }
}
