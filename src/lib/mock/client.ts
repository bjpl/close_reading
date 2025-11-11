/**
 * Mock Supabase Client
 *
 * Main client class that composes all mock services (auth, database, storage, realtime)
 * to provide a complete mock implementation of the Supabase client API.
 */

import { openDB, IDBPDatabase } from 'idb';
import { MockDB, MockUser } from './types';
import { MockAuthService } from './auth';
import { MockDatabaseService } from './database';
import { MockRealtimeService } from './realtime';
import { MockStorageService } from './storage';

/**
 * Mock Supabase client class
 *
 * Provides a drop-in replacement for the Supabase client that uses
 * IndexedDB and localStorage for persistence. Composes separate
 * service modules for auth, database, storage, and real-time functionality.
 */
export class MockSupabaseClient {
  private db: IDBPDatabase<MockDB> | null = null;
  private authService: MockAuthService;
  private databaseService: MockDatabaseService;
  private realtimeService: MockRealtimeService;
  private storageService: MockStorageService;

  // Public API surfaces
  public auth: MockAuthService;
  public storage: MockStorageService;

  constructor() {
    // Initialize database connection
    this.initDB();

    // Create service instances with dependency injection
    this.authService = new MockAuthService(
      this.db,
      this.generateId.bind(this),
      this.getCurrentUser.bind(this),
      this.setCurrentUser.bind(this)
    );

    this.databaseService = new MockDatabaseService(
      this.db,
      this.generateId.bind(this),
      this.getCurrentUser.bind(this)
    );

    this.realtimeService = new MockRealtimeService();
    this.storageService = new MockStorageService();

    // Expose public APIs
    this.auth = this.authService;
    this.storage = this.storageService;
  }

  /**
   * Initializes the IndexedDB database
   *
   * Creates all object stores (tables) and indexes needed for the application.
   * Runs upgrade logic when the database version changes.
   *
   * @private
   */
  private async initDB() {
    this.db = await openDB<MockDB>('close-reading-mock', 2, {
      upgrade(db, _oldVersion, _newVersion, _transaction) {
        // Users table
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('by-email', 'email', { unique: true });
        }

        // Documents table
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('by-user', 'user_id');
        }

        // Annotations table
        if (!db.objectStoreNames.contains('annotations')) {
          const annotStore = db.createObjectStore('annotations', { keyPath: 'id' });
          annotStore.createIndex('by-document', 'document_id');
        }

        // Projects table
        if (!db.objectStoreNames.contains('projects')) {
          const projStore = db.createObjectStore('projects', { keyPath: 'id' });
          projStore.createIndex('by-user', 'user_id');
        }

        // Paragraphs table
        if (!db.objectStoreNames.contains('paragraphs')) {
          const paraStore = db.createObjectStore('paragraphs', { keyPath: 'id' });
          paraStore.createIndex('by-document', 'document_id');
        }

        // Sentences table
        if (!db.objectStoreNames.contains('sentences')) {
          const sentStore = db.createObjectStore('sentences', { keyPath: 'id' });
          sentStore.createIndex('by-document', 'document_id');
        }

        // Paragraph links table
        if (!db.objectStoreNames.contains('paragraph_links')) {
          const linkStore = db.createObjectStore('paragraph_links', { keyPath: 'id' });
          linkStore.createIndex('by-document', 'document_id');
        }
      },
    });

    // Update service instances with initialized DB
    this.authService = new MockAuthService(
      this.db,
      this.generateId.bind(this),
      this.getCurrentUser.bind(this),
      this.setCurrentUser.bind(this)
    );

    this.databaseService = new MockDatabaseService(
      this.db,
      this.generateId.bind(this),
      this.getCurrentUser.bind(this)
    );

    // Update public API references
    this.auth = this.authService;
  }

  /**
   * Generates a unique ID for new records
   *
   * @private
   * @returns Unique string ID combining timestamp and random string
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets the current authenticated user from localStorage
   *
   * @private
   * @returns Current user object or null if not authenticated
   */
  private getCurrentUser(): MockUser | null {
    const userJson = localStorage.getItem('mock_current_user');
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Sets the current authenticated user in localStorage
   *
   * @private
   * @param user - User object to store, or null to clear
   */
  private setCurrentUser(user: MockUser | null): void {
    if (user) {
      localStorage.setItem('mock_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('mock_current_user');
    }
  }

  /**
   * Creates a query builder for a database table
   *
   * @param table - Name of the table to query
   * @returns Query builder object
   */
  from(table: string) {
    return this.databaseService.from(table);
  }

  /**
   * Creates a real-time channel subscription
   *
   * @param name - Channel name
   * @returns Mock channel object
   */
  channel(name: string) {
    return this.realtimeService.channel(name);
  }
}
