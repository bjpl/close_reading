/**
 * Mock Database Service
 *
 * Provides a mock implementation of Supabase database query builder.
 * Uses IndexedDB for data persistence with support for filtering,
 * ordering, and CRUD operations.
 */

import { IDBPDatabase } from 'idb';
import { MockDB, MockUser } from './types';
import { logger } from '../../utils/logger';

/**
 * Mock database service class
 *
 * Implements the Supabase database API including:
 * - Query builder with select, filter, and order operations
 * - Insert, update, and delete operations
 * - Index-based querying for performance
 */
export class MockDatabaseService {
  constructor(
    private db: IDBPDatabase<MockDB> | null,
    private generateId: () => string,
    private getCurrentUser: () => MockUser | null
  ) {}

  /**
   * Creates a query builder for a table
   *
   * @param table - Name of the table to query
   * @returns Query builder object with chainable methods
   */
  from(table: string) {
    const self = this;

    const queryBuilder = {
      _filters: [] as Array<{ column: string; value: any }>,
      _orderBy: null as { column: string; ascending: boolean } | null,
      _isSingle: false,

      /**
       * Selects columns to return (currently returns all columns)
       *
       * @param columns - Column names to select (default: '*')
       * @returns Query builder for chaining
       */
      select: function(_columns: string = '*') {
        return this;
      },

      /**
       * Filters results where column equals value
       *
       * @param column - Column name to filter on
       * @param value - Value to match
       * @returns Query builder for chaining
       */
      eq: function(column: string, value: any) {
        this._filters.push({ column, value });
        return this;
      },

      /**
       * Orders results by a column
       *
       * @param column - Column name to order by
       * @param options - Sort direction (default: ascending)
       * @returns Query builder for chaining
       */
      order: function(column: string, options: { ascending: boolean } = { ascending: true }) {
        this._orderBy = { column, ascending: options.ascending };
        return this;
      },

      /**
       * Expects query to return a single row
       *
       * @returns Query builder for chaining
       */
      single: function() {
        this._isSingle = true;
        return this;
      },

      /**
       * Makes the query builder thenable (Promise-like)
       */
      then: async function(resolve: any, reject: any) {
        await queryBuilder._execute().then(resolve, reject);
      },

      /**
       * Executes the query and returns results
       *
       * @private
       * @returns Query results with data and error
       */
      _execute: async function() {
        if (!self.db) {
          return { data: this._isSingle ? null : [], error: { message: 'Database not initialized' } };
        }

        try {
          let items: any[] = [];

          // Check for filter types to optimize query
          const userIdFilter = this._filters.find(f => f.column === 'user_id');
          const docIdFilter = this._filters.find(f => f.column === 'document_id');
          const idFilter = this._filters.find(f => f.column === 'id');
          const archivedFilter = this._filters.find(f => f.column === 'archived');

          if (idFilter) {
            // Get single item by ID
            const item = await self.db.get(table as any, idFilter.value);
            items = item ? [item] : [];
          } else if (userIdFilter && self.db.objectStoreNames.contains(table as any)) {
            // Get all items for user using index
            // @ts-ignore - Dynamic table name requires type assertion
            const allItems = await self.db.getAllFromIndex(table as any, 'by-user' as any, userIdFilter.value);
            items = allItems;
          } else if (docIdFilter) {
            // Handle document_id filter for tables that have this index
            const tablesWithDocIndex = ['annotations', 'paragraphs', 'sentences', 'paragraph_links'];
            if (tablesWithDocIndex.includes(table) && self.db.objectStoreNames.contains(table as any)) {
              try {
                // @ts-ignore - Dynamic table name requires type assertion
                items = await self.db.getAllFromIndex(table as any, 'by-document' as any, docIdFilter.value);
                logger.debug(`🔍 Query ${table} by document_id=${docIdFilter.value}: found ${items.length} items`);
              } catch (err) {
                logger.error(`❌ Error querying ${table} by document_id:`, err);
                items = [];
              }
            }
          } else {
            // Get all items (fallback)
            items = self.db.objectStoreNames.contains(table as any) ? await self.db.getAll(table as any) : [];
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
          logger.error('Query error:', error);
          return { data: this._isSingle ? null : [], error: { message: 'Query failed' } };
        }
      },
    };

    return {
      select: queryBuilder.select.bind(queryBuilder),
      eq: queryBuilder.eq.bind(queryBuilder),
      order: queryBuilder.order.bind(queryBuilder),
      single: queryBuilder.single.bind(queryBuilder),
      then: queryBuilder.then.bind(queryBuilder),

      /**
       * Inserts one or more records into the table
       *
       * @param data - Record or array of records to insert
       * @returns Insert builder with select and single methods
       */
      insert: (data: any) => {
        const insertBuilder = {
          _data: data,
          _shouldSelect: false,
          _shouldSingle: false,

          select: function(_columns: string = '*') {
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
            if (!self.db) {
              return { data: null, error: { message: 'Database not initialized' } };
            }

            const user = self.getCurrentUser();

            // Handle array of records
            const isArray = Array.isArray(this._data);
            const dataArray = isArray ? this._data : [this._data];
            const records = dataArray.map((item: any) => ({
              id: self.generateId(),
              ...item,
              user_id: item.user_id || user?.id,
              archived: item.archived !== undefined ? item.archived : false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            try {
              // Insert all records
              for (const record of records) {
                await self.db.add(table as any, record);
                if (table === 'paragraphs' || table === 'sentences') {
                  logger.debug(`✅ Created ${table} record:`, record.id, 'document_id:', record.document_id);
                } else {
                  logger.debug(`✅ Created ${table} record:`, record.id);
                }
              }

              const result = isArray ? records : records[0];
              return { data: result, error: null };
            } catch (error) {
              logger.error(`❌ Insert error for ${table}:`, error);
              return { data: null, error: { message: 'Insert failed', details: error } };
            }
          },
        };

        return insertBuilder;
      },

      /**
       * Updates records in the table
       *
       * @param data - Data to update
       * @returns Update builder with eq method for filtering
       */
      update: (data: any) => {
        return {
          eq: async (_column: string, value: any) => {
            if (!self.db) {
              return { data: null, error: { message: 'Database not initialized' } };
            }

            try {
              const existing = await self.db.get(table as any, value);
              if (!existing) {
                return { data: null, error: { message: 'Not found' } };
              }

              const updated = {
                ...existing,
                ...data,
                updated_at: new Date().toISOString(),
              };

              await self.db.put(table as any, updated);
              return { data: updated, error: null };
            } catch (error) {
              logger.error('Update error:', error);
              return { data: null, error: { message: 'Update failed' } };
            }
          },
        };
      },

      /**
       * Deletes records from the table
       *
       * @returns Delete builder with eq method for filtering
       */
      delete: () => {
        return {
          eq: async (_column: string, value: any) => {
            if (!self.db) {
              return { data: null, error: { message: 'Database not initialized' } };
            }

            try {
              await self.db.delete(table as any, value);
              return { data: null, error: null };
            } catch (error) {
              return { data: null, error: { message: 'Delete failed' } };
            }
          },
        };
      },
    };
  }
}
