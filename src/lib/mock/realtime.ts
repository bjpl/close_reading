/**
 * Mock Real-time Service
 *
 * Provides a mock implementation of Supabase real-time subscriptions.
 * This is a no-op implementation that provides the same API surface
 * but doesn't actually perform real-time updates.
 */

/**
 * Mock channel interface
 *
 * Implements the chainable API for Supabase channels
 * but doesn't actually subscribe to or broadcast events.
 */
interface MockChannel {
  on(...args: any[]): MockChannel;
  subscribe(): MockChannel;
  unsubscribe(): MockChannel;
}

/**
 * Mock real-time service class
 *
 * Creates mock channels that match the Supabase real-time API
 * but don't perform actual real-time synchronization.
 */
export class MockRealtimeService {
  /**
   * Creates a mock channel for real-time subscriptions
   *
   * @param _name - Channel name
   * @returns Mock channel object with chainable methods
   */
  channel(_name: string): MockChannel {
    const mockChannel: MockChannel = {
      on: function(..._args: any[]) {
        return this;
      },
      subscribe: function() {
        return this;
      },
      unsubscribe: function() {
        return this;
      },
    };
    return mockChannel;
  }
}
