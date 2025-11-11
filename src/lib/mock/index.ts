/**
 * Mock Supabase Client - Main Entry Point
 *
 * This module provides a complete mock implementation of the Supabase client
 * for local development and testing. It uses IndexedDB for data persistence
 * and localStorage for session management.
 *
 * @example
 * ```typescript
 * import { createMockClient } from './lib/mock';
 *
 * const supabase = createMockClient();
 *
 * // Use exactly like the real Supabase client
 * const { data, error } = await supabase.auth.signInWithPassword({
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 * ```
 */

import { MockSupabaseClient } from './client';

/**
 * Creates a new mock Supabase client instance
 *
 * This is the main factory function that creates a complete mock Supabase client
 * with all services initialized and ready to use.
 *
 * @returns Mock Supabase client instance
 */
export const createMockClient = (): MockSupabaseClient => {
  return new MockSupabaseClient();
};

// Re-export types for convenience
export type { MockDB, MockUser, MockSession, SupabaseResponse } from './types';
export { MockSupabaseClient } from './client';
