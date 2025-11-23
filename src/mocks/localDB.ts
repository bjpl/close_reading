import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Database } from '../types/database';

/**
 * Session storage value - can be any serializable data
 */
interface SessionValue {
  key: string;
  value: unknown;
}

/**
 * LocalDB schema extending the database types
 */
interface LocalDBSchema extends DBSchema {
  users: {
    key: string;
    value: {
      id: string;
      email: string;
      password: string;
      created_at: string;
      user_metadata: Record<string, unknown>;
    };
    indexes: { 'by-email': string };
  };
  documents: {
    key: string;
    value: Database['public']['Tables']['documents']['Row'];
    indexes: { 'by-user': string; 'by-project': string };
  };
  annotations: {
    key: string;
    value: Database['public']['Tables']['annotations']['Row'];
    indexes: { 'by-document': string };
  };
  projects: {
    key: string;
    value: Database['public']['Tables']['projects']['Row'];
    indexes: { 'by-user': string };
  };
  paragraph_links: {
    key: string;
    value: Database['public']['Tables']['paragraph_links']['Row'];
    indexes: { 'by-document': string };
  };
  session: {
    key: string;
    value: SessionValue;
  };
}

class LocalDatabase {
  private db: IDBPDatabase<LocalDBSchema> | null = null;
  private readonly DB_NAME = 'close-reading-mock-db';
  private readonly DB_VERSION = 1;

  async init() {
    if (this.db) return this.db;

    this.db = await openDB<LocalDBSchema>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Users store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('by-email', 'email', { unique: true });
        }

        // Documents store
        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('by-user', 'user_id');
          docStore.createIndex('by-project', 'project_id');
        }

        // Annotations store
        if (!db.objectStoreNames.contains('annotations')) {
          const annotStore = db.createObjectStore('annotations', { keyPath: 'id' });
          annotStore.createIndex('by-document', 'document_id');
        }

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projStore = db.createObjectStore('projects', { keyPath: 'id' });
          projStore.createIndex('by-user', 'user_id');
        }

        // Paragraph links store
        if (!db.objectStoreNames.contains('paragraph_links')) {
          const linkStore = db.createObjectStore('paragraph_links', { keyPath: 'id' });
          linkStore.createIndex('by-document', 'document_id');
        }

        // Session store
        if (!db.objectStoreNames.contains('session')) {
          db.createObjectStore('session', { keyPath: 'key' });
        }
      },
    });

    return this.db;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Session management
  /**
   * Store a value in session storage
   * @param key Session key
   * @param value Any serializable value to store
   */
  async setSession(key: string, value: unknown): Promise<void> {
    const db = await this.init();
    await db.put('session', { key, value });
  }

  /**
   * Retrieve a value from session storage
   * @param key Session key
   * @returns The stored value or undefined if not found
   */
  async getSession(key: string): Promise<unknown> {
    const db = await this.init();
    const result = await db.get('session', key);
    return result?.value;
  }

  async clearSession(key: string) {
    const db = await this.init();
    await db.delete('session', key);
  }

  // User management
  async createUser(email: string, password: string) {
    const db = await this.init();

    const user = {
      id: this.generateId(),
      email,
      password, // In real app, this would be hashed
      created_at: new Date().toISOString(),
      user_metadata: {},
    };

    await db.add('users', user);
    await this.setSession('currentUser', user);

    return this.sanitizeUser(user);
  }

  async authenticateUser(email: string, password: string) {
    const db = await this.init();
    const user = await db.getFromIndex('users', 'by-email', email);

    if (user && user.password === password) {
      await this.setSession('currentUser', user);
      return this.sanitizeUser(user);
    }

    return null;
  }

  getCurrentUser() {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      return JSON.parse(userJson);
    }
    return null;
  }

  async clearCurrentUser() {
    localStorage.removeItem('currentUser');
    await this.clearSession('currentUser');
  }

  /**
   * Remove sensitive data from user object before returning to client
   * @param user User object with password
   * @returns Sanitized user object without password
   */
  private sanitizeUser(user: LocalDBSchema['users']['value']) {
    const { password: _password, ...sanitized } = user;
    localStorage.setItem('currentUser', JSON.stringify(sanitized));
    return sanitized;
  }

  // Document management
  async getDocuments(userId: string) {
    const db = await this.init();
    return await db.getAllFromIndex('documents', 'by-user', userId);
  }

  async getDocument(id: string) {
    const db = await this.init();
    return await db.get('documents', id);
  }

  /**
   * Create a new document
   * @param data Document data (Insert type from database schema)
   */
  async createDocument(data: Database['public']['Tables']['documents']['Insert']) {
    const db = await this.init();

    const document: Database['public']['Tables']['documents']['Row'] = {
      id: data.id || this.generateId(),
      project_id: data.project_id,
      user_id: data.user_id,
      title: data.title,
      file_url: data.file_url,
      file_type: data.file_type,
      file_size: data.file_size ?? null,
      page_count: data.page_count ?? null,
      metadata: data.metadata ?? {},
      processing_status: data.processing_status ?? 'pending',
      processing_error: data.processing_error ?? null,
      archived: data.archived ?? false,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    };

    await db.add('documents', document);
    return document;
  }

  /**
   * Update an existing document
   * @param id Document ID
   * @param data Partial document data to update
   */
  async updateDocument(
    id: string,
    data: Database['public']['Tables']['documents']['Update']
  ) {
    const db = await this.init();
    const existing = await db.get('documents', id);

    if (!existing) {
      throw new Error('Document not found');
    }

    const updated: Database['public']['Tables']['documents']['Row'] = {
      ...existing,
      ...data,
      id: existing.id, // Preserve ID
      updated_at: new Date().toISOString(),
    };

    await db.put('documents', updated);
    return updated;
  }

  async deleteDocument(id: string) {
    const db = await this.init();
    await db.delete('documents', id);
  }

  // Annotation management
  async getAnnotations(documentId: string) {
    const db = await this.init();
    return await db.getAllFromIndex('annotations', 'by-document', documentId);
  }

  /**
   * Create a new annotation
   * @param data Annotation data (Insert type from database schema)
   */
  async createAnnotation(data: Database['public']['Tables']['annotations']['Insert']) {
    const db = await this.init();

    const annotation: Database['public']['Tables']['annotations']['Row'] = {
      id: data.id || this.generateId(),
      user_id: data.user_id,
      document_id: data.document_id,
      paragraph_id: data.paragraph_id ?? null,
      sentence_id: data.sentence_id ?? null,
      annotation_type: data.annotation_type,
      content: data.content ?? null,
      highlight_color: data.highlight_color ?? null,
      start_offset: data.start_offset ?? null,
      end_offset: data.end_offset ?? null,
      position: data.position ?? null,
      metadata: data.metadata ?? {},
      archived: data.archived ?? false,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    };

    await db.add('annotations', annotation);
    return annotation;
  }

  /**
   * Update an existing annotation
   * @param id Annotation ID
   * @param data Partial annotation data to update
   */
  async updateAnnotation(
    id: string,
    data: Database['public']['Tables']['annotations']['Update']
  ) {
    const db = await this.init();
    const existing = await db.get('annotations', id);

    if (!existing) {
      throw new Error('Annotation not found');
    }

    const updated: Database['public']['Tables']['annotations']['Row'] = {
      ...existing,
      ...data,
      id: existing.id, // Preserve ID
      updated_at: new Date().toISOString(),
    };

    await db.put('annotations', updated);
    return updated;
  }

  async deleteAnnotation(id: string) {
    const db = await this.init();
    await db.delete('annotations', id);
  }

  // Project management
  async getProjects(userId: string) {
    const db = await this.init();
    return await db.getAllFromIndex('projects', 'by-user', userId);
  }

  /**
   * Create a new project
   * @param data Project data (Insert type from database schema)
   */
  async createProject(data: Database['public']['Tables']['projects']['Insert']) {
    const db = await this.init();

    const project: Database['public']['Tables']['projects']['Row'] = {
      id: data.id || this.generateId(),
      user_id: data.user_id,
      title: data.title,
      description: data.description ?? null,
      color: data.color ?? '#3B82F6',
      archived: data.archived ?? false,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    };

    await db.add('projects', project);
    return project;
  }

  // Paragraph links management
  async getParagraphLinks(documentId: string) {
    const db = await this.init();
    return await db.getAllFromIndex('paragraph_links', 'by-document', documentId);
  }

  /**
   * Create a new paragraph link
   * @param data Paragraph link data (Insert type from database schema)
   */
  async createParagraphLink(data: Database['public']['Tables']['paragraph_links']['Insert']) {
    const db = await this.init();

    const link: Database['public']['Tables']['paragraph_links']['Row'] = {
      id: data.id || this.generateId(),
      user_id: data.user_id,
      source_paragraph_id: data.source_paragraph_id,
      target_paragraph_id: data.target_paragraph_id,
      link_type: data.link_type,
      note: data.note ?? null,
      strength: data.strength ?? 5,
      metadata: data.metadata ?? {},
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    };

    await db.add('paragraph_links', link);
    return link;
  }
}

export const localDB = new LocalDatabase();
