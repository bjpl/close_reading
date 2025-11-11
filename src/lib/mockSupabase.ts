/**
 * Mock Supabase Client for Local Development
 *
 * This provides a drop-in replacement for the Supabase client
 * that uses localStorage and IndexedDB for persistence.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MockDB extends DBSchema {
  users: {
    key: string;
    value: any;
    indexes: { 'by-email': string };
  };
  documents: {
    key: string;
    value: any;
    indexes: { 'by-user': string };
  };
  annotations: {
    key: string;
    value: any;
    indexes: { 'by-document': string };
  };
  projects: {
    key: string;
    value: any;
    indexes: { 'by-user': string };
  };
  paragraphs: {
    key: string;
    value: any;
    indexes: { 'by-document': string };
  };
  sentences: {
    key: string;
    value: any;
    indexes: { 'by-document': string };
  };
  paragraph_links: {
    key: string;
    value: any;
    indexes: { 'by-document': string };
  };
}

class MockSupabaseClient {
  private db: IDBPDatabase<MockDB> | null = null;
  private authListeners: Array<(event: string, session: any) => void> = [];

  constructor() {
    this.initDB();
  }

  private async initDB() {
    this.db = await openDB<MockDB>('close-reading-mock', 2, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('by-email', 'email', { unique: true });
        }
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('by-user', 'user_id');
        }
        if (!db.objectStoreNames.contains('annotations')) {
          const annotStore = db.createObjectStore('annotations', { keyPath: 'id' });
          annotStore.createIndex('by-document', 'document_id');
        }
        if (!db.objectStoreNames.contains('projects')) {
          const projStore = db.createObjectStore('projects', { keyPath: 'id' });
          projStore.createIndex('by-user', 'user_id');
        }
        if (!db.objectStoreNames.contains('paragraphs')) {
          const paraStore = db.createObjectStore('paragraphs', { keyPath: 'id' });
          paraStore.createIndex('by-document', 'document_id');
        }
        if (!db.objectStoreNames.contains('sentences')) {
          const sentStore = db.createObjectStore('sentences', { keyPath: 'id' });
          sentStore.createIndex('by-document', 'document_id');
        }
        if (!db.objectStoreNames.contains('paragraph_links')) {
          const linkStore = db.createObjectStore('paragraph_links', { keyPath: 'id' });
          linkStore.createIndex('by-document', 'document_id');
        }
      },
    });
  }

  private generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUser() {
    const userJson = localStorage.getItem('mock_current_user');
    return userJson ? JSON.parse(userJson) : null;
  }

  private setCurrentUser(user: any) {
    if (user) {
      localStorage.setItem('mock_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('mock_current_user');
    }
  }

  // Auth API
  auth = {
    getSession: async () => {
      const user = this.getCurrentUser();
      console.log('🔍 getSession called, user:', user ? `${user.email} (${user.id})` : 'null');
      const session = user ? {
        access_token: `mock_token_${user.id}`,
        refresh_token: `mock_refresh_${user.id}`,
        user: user,
      } : null;

      return { data: { session }, error: null };
    },

    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      await this.initDB();
      if (!this.db) return { data: { user: null, session: null }, error: { message: 'Database not initialized' } };

      try {
        const user = await this.db.getFromIndex('users', 'by-email', email);

        if (user && user.password === password) {
          const sanitized = {
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            user_metadata: user.user_metadata || {},
            aud: 'authenticated',
            role: 'authenticated',
          };
          this.setCurrentUser(sanitized);
          console.log('✅ User signed in:', sanitized.email);

          const session = {
            access_token: `mock_token_${user.id}`,
            refresh_token: `mock_refresh_${user.id}`,
            user: sanitized,
          };

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
    },

    signUp: async ({ email, password }: { email: string; password: string }) => {
      await this.initDB();
      if (!this.db) return { data: { user: null, session: null }, error: { message: 'Database not initialized' } };

      const user = {
        id: this.generateId(),
        email,
        password,
        created_at: new Date().toISOString(),
        user_metadata: {},
      };

      try {
        await this.db.add('users', user);
        const sanitized = {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          user_metadata: user.user_metadata,
          aud: 'authenticated',
          role: 'authenticated',
        };
        this.setCurrentUser(sanitized);
        console.log('✅ User signed up:', sanitized.email);

        const session = {
          access_token: `mock_token_${user.id}`,
          refresh_token: `mock_refresh_${user.id}`,
          user: sanitized,
        };

        setTimeout(() => {
          this.authListeners.forEach(cb => cb('SIGNED_IN', session));
        }, 0);

        return { data: { user: sanitized, session }, error: null };
      } catch (error) {
        console.error('❌ Signup failed:', error);
        return { data: { user: null, session: null }, error: { message: 'User already exists' } };
      }
    },

    signOut: async () => {
      console.log('👋 User signed out');
      this.setCurrentUser(null);
      setTimeout(() => {
        this.authListeners.forEach(cb => cb('SIGNED_OUT', null));
      }, 0);
      return { error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      this.authListeners.push(callback);

      // Immediately call with current state
      const user = this.getCurrentUser();
      if (user) {
        const session = {
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
    },

    resetPasswordForEmail: async (email: string) => {
      console.log('Password reset requested for:', email);
      return { data: {}, error: null };
    },
  };

  // Database API
  from(table: string) {
    const queryBuilder = {
      _filters: [] as Array<{ column: string; value: any }>,
      _orderBy: null as { column: string; ascending: boolean } | null,
      _isSingle: false,

      select: function(columns: string = '*') {
        return this;
      },

      eq: function(column: string, value: any) {
        this._filters.push({ column, value });
        return this;
      },

      order: function(column: string, options: { ascending: boolean } = { ascending: true }) {
        this._orderBy = { column, ascending: options.ascending };
        return this;
      },

      single: function() {
        this._isSingle = true;
        return this;
      },

      then: async function(resolve: any, reject: any) {
        await queryBuilder._execute().then(resolve, reject);
      },

      _execute: async function() {
        await queryBuilder._parent.initDB();
        const db = queryBuilder._parent.db;
        if (!db) return { data: this._isSingle ? null : [], error: { message: 'Database not initialized' } };

        try {
          let items: any[] = [];

          // Check if we're filtering by user_id or document_id
          const userIdFilter = this._filters.find(f => f.column === 'user_id');
          const docIdFilter = this._filters.find(f => f.column === 'document_id');
          const idFilter = this._filters.find(f => f.column === 'id');
          const archivedFilter = this._filters.find(f => f.column === 'archived');

          if (idFilter) {
            // Get single item by ID
            const item = await db.get(table as any, idFilter.value);
            items = item ? [item] : [];
          } else if (userIdFilter && db.objectStoreNames.contains(table as any)) {
            // Get all items for user
            const allItems = await db.getAllFromIndex(table as any, 'by-user' as any, userIdFilter.value);
            items = allItems;
          } else if (docIdFilter) {
            // Handle document_id filter for tables that have this index
            const tablesWithDocIndex = ['annotations', 'paragraphs', 'sentences', 'paragraph_links'];
            if (tablesWithDocIndex.includes(table) && db.objectStoreNames.contains(table as any)) {
              try {
                items = await db.getAllFromIndex(table as any, 'by-document' as any, docIdFilter.value);
                console.log(`🔍 Query ${table} by document_id=${docIdFilter.value}: found ${items.length} items`);
              } catch (err) {
                console.error(`❌ Error querying ${table} by document_id:`, err);
                items = [];
              }
            }
          } else {
            // Get all items (fallback)
            items = db.objectStoreNames.contains(table as any) ? await db.getAll(table as any) : [];
          }

          // Apply filters
          this._filters.forEach(filter => {
            if (filter.column !== 'id') {
              items = items.filter(item => item[filter.column] === filter.value);
            }
          });

          // Apply archived filter
          if (archivedFilter !== undefined) {
            items = items.filter(item => item.archived === archivedFilter.value);
          }

          // Apply ordering
          if (this._orderBy) {
            items.sort((a, b) => {
              const aVal = a[this._orderBy!.column];
              const bVal = b[this._orderBy!.column];
              const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
              return this._orderBy!.ascending ? comparison : -comparison;
            });
          }

          if (this._isSingle) {
            return { data: items[0] || null, error: null };
          }

          return { data: items, error: null };
        } catch (error) {
          console.error('Query error:', error);
          return { data: this._isSingle ? null : [], error: { message: 'Query failed' } };
        }
      },

      _parent: this,
    };

    return {
      select: queryBuilder.select.bind(queryBuilder),
      eq: queryBuilder.eq.bind(queryBuilder),
      order: queryBuilder.order.bind(queryBuilder),
      single: queryBuilder.single.bind(queryBuilder),
      then: queryBuilder.then.bind(queryBuilder),

      insert: (data: any) => {
        const insertBuilder = {
          _data: data,
          _shouldSelect: false,
          _shouldSingle: false,

          select: function(columns: string = '*') {
            this._shouldSelect = true;
            return this;
          },

          single: function() {
            this._shouldSingle = true;
            return this;
          },

          then: async function(resolve: any, reject: any) {
            await insertBuilder._execute().then(resolve, reject);
          },

          _execute: async function() {
            await insertBuilder._parent.initDB();
            const db = insertBuilder._parent.db;
            if (!db) return { data: null, error: { message: 'Database not initialized' } };

            const user = insertBuilder._parent.getCurrentUser();

            // Handle array of records
            const isArray = Array.isArray(this._data);
            const dataArray = isArray ? this._data : [this._data];
            const records = dataArray.map((item: any) => ({
              id: insertBuilder._parent.generateId(),
              ...item,
              user_id: item.user_id || user?.id,
              archived: item.archived !== undefined ? item.archived : false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            try {
              // Insert all records
              for (const record of records) {
                await db.add(table as any, record);
                if (table === 'paragraphs' || table === 'sentences') {
                  console.log(`✅ Created ${table} record:`, record.id, 'document_id:', record.document_id);
                } else {
                  console.log(`✅ Created ${table} record:`, record.id);
                }
              }

              const result = isArray ? records : records[0];
              return { data: result, error: null };
            } catch (error) {
              console.error(`❌ Insert error for ${table}:`, error);
              return { data: null, error: { message: 'Insert failed', details: error } };
            }
          },

          _parent: this,
        };

        return insertBuilder;
      },

      update: (data: any) => {
        return {
          eq: async (column: string, value: any) => {
            await this.initDB();
            if (!this.db) return { data: null, error: { message: 'Database not initialized' } };

            try {
              const existing = await this.db.get(table as any, value);
              if (!existing) {
                return { data: null, error: { message: 'Not found' } };
              }

              const updated = {
                ...existing,
                ...data,
                updated_at: new Date().toISOString(),
              };

              await this.db.put(table as any, updated);
              return { data: updated, error: null };
            } catch (error) {
              console.error('Update error:', error);
              return { data: null, error: { message: 'Update failed' } };
            }
          },
        };
      },

      delete: () => {
        return {
          eq: async (column: string, value: any) => {
            await this.initDB();
            if (!this.db) return { data: null, error: { message: 'Database not initialized' } };

            try {
              await this.db.delete(table as any, value);
              return { data: null, error: null };
            } catch (error) {
              return { data: null, error: { message: 'Delete failed' } };
            }
          },
        };
      },
    };
  }

  // Real-time subscription (mock - no actual real-time updates)
  channel(name: string) {
    const mockChannel = {
      on: function(...args: any[]) {
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

  // Storage API (mock - just store metadata)
  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: File, options?: any) => {
        // Store file in IndexedDB as base64
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `mock://storage/${path}` },
      }),
    }),
  };
}

export const createMockClient = () => {
  return new MockSupabaseClient();
};
