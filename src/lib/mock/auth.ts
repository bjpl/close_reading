/**
 * Mock Authentication Service
 *
 * Provides a mock implementation of Supabase auth API for local development.
 * Uses IndexedDB for user storage and localStorage for session persistence.
 */

import { IDBPDatabase } from 'idb';
import { MockDB, MockUser, MockSession, SupabaseResponse } from './types';

type AuthCallback = (event: string, session: any) => void;

/**
 * Mock authentication service class
 *
 * Implements the Supabase auth API surface including:
 * - Sign in/sign up with email and password
 * - Session management
 * - Auth state change listeners
 * - Password reset functionality
 */
export class MockAuthService {
  private authListeners: AuthCallback[] = [];

  constructor(
    private db: IDBPDatabase<MockDB> | null,
    private generateId: () => string,
    private getCurrentUser: () => MockUser | null,
    private setCurrentUser: (user: MockUser | null) => void
  ) {}

  /**
   * Gets the current session
   *
   * @returns Current session with user and tokens, or null if not authenticated
   */
  async getSession(): Promise<SupabaseResponse<{ session: MockSession | null }>> {
    const user = this.getCurrentUser();
    console.log('🔍 getSession called, user:', user ? `${user.email} (${user.id})` : 'null');

    const session = user ? {
      access_token: `mock_token_${user.id}`,
      refresh_token: `mock_refresh_${user.id}`,
      user: user,
    } : null;

    return { data: { session }, error: null };
  }

  /**
   * Signs in a user with email and password
   *
   * @param email - User's email address
   * @param password - User's password
   * @returns User object and session on success, error on failure
   */
  async signInWithPassword({ email, password }: { email: string; password: string }): Promise<SupabaseResponse<{ user: MockUser | null; session: MockSession | null }>> {
    if (!this.db) {
      return { data: { user: null, session: null }, error: { message: 'Database not initialized' } };
    }

    try {
      const user = await this.db.getFromIndex('users', 'by-email', email);

      if (user && user.password === password) {
        const sanitized: MockUser = {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          user_metadata: user.user_metadata || {},
          aud: 'authenticated',
          role: 'authenticated',
        };

        this.setCurrentUser(sanitized);
        console.log('✅ User signed in:', sanitized.email);

        const session: MockSession = {
          access_token: `mock_token_${user.id}`,
          refresh_token: `mock_refresh_${user.id}`,
          user: sanitized,
        };

        // Notify listeners asynchronously
        setTimeout(() => {
          this.authListeners.forEach(cb => cb('SIGNED_IN', session));
        }, 0);

        return { data: { user: sanitized, session }, error: null };
      }

      console.log('❌ Invalid credentials for:', email);
      return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } };
    } catch (error) {
      console.error('❌ Login failed:', error);
      return { data: { user: null, session: null }, error: { message: 'Login failed' } };
    }
  }

  /**
   * Signs up a new user with email and password
   *
   * @param email - New user's email address
   * @param password - New user's password
   * @returns User object and session on success, error if user already exists
   */
  async signUp({ email, password }: { email: string; password: string }): Promise<SupabaseResponse<{ user: MockUser | null; session: MockSession | null }>> {
    if (!this.db) {
      return { data: { user: null, session: null }, error: { message: 'Database not initialized' } };
    }

    const user = {
      id: this.generateId(),
      email,
      password,
      created_at: new Date().toISOString(),
      user_metadata: {},
    };

    try {
      await this.db.add('users', user);

      const sanitized: MockUser = {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        user_metadata: user.user_metadata,
        aud: 'authenticated',
        role: 'authenticated',
      };

      this.setCurrentUser(sanitized);
      console.log('✅ User signed up:', sanitized.email);

      const session: MockSession = {
        access_token: `mock_token_${user.id}`,
        refresh_token: `mock_refresh_${user.id}`,
        user: sanitized,
      };

      // Notify listeners asynchronously
      setTimeout(() => {
        this.authListeners.forEach(cb => cb('SIGNED_IN', session));
      }, 0);

      return { data: { user: sanitized, session }, error: null };
    } catch (error) {
      console.error('❌ Signup failed:', error);
      return { data: { user: null, session: null }, error: { message: 'User already exists' } };
    }
  }

  /**
   * Signs out the current user
   *
   * Clears the session and notifies listeners
   */
  async signOut(): Promise<{ error: null }> {
    console.log('👋 User signed out');
    this.setCurrentUser(null);

    // Notify listeners asynchronously
    setTimeout(() => {
      this.authListeners.forEach(cb => cb('SIGNED_OUT', null));
    }, 0);

    return { error: null };
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
  async resetPasswordForEmail(email: string): Promise<SupabaseResponse<{}>> {
    console.log('Password reset requested for:', email);
    return { data: {}, error: null };
  }
}
