/**
 * Mock Supabase Client for Local Development
 *
 * This file maintains backwards compatibility by re-exporting from the modular implementation.
 * The actual implementation has been refactored into separate service modules in ./mock/
 *
 * @deprecated Import from './mock' instead for better tree-shaking
 */

export { createMockClient, MockSupabaseClient } from './mock';
