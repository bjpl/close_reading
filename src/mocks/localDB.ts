import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MockDB extends DBSchema {
  users: {
    key: string;
    value: {
      id: string;
      email: string;
      password: string;
      created_at: string;
      user_metadata: Record<string, any>;
    };
    indexes: { 'by-email': string };
  };
  documents: {
    key: string;
    value: {
      id: string;
      user_id: string;
      title: string;
      content: string;
      paragraphs?: any[];
      created_at: string;
      updated_at: string;
      project_id?: string;
    };
    indexes: { 'by-user': string; 'by-project': string };
  };
  annotations: {
    key: string;
    value: {
      id: string;
      document_id: string;
      paragraph_id: string;
      content: string;
      type: string;
      created_at: string;
      updated_at: string;
    };
    indexes: { 'by-document': string };
  };
  projects: {
    key: string;
    value: {
      id: string;
      user_id: string;
      title: string;
      description?: string;
      created_at: string;
      updated_at: string;
    };
    indexes: { 'by-user': string };
  };
  paragraph_links: {
    key: string;
    value: {
      id: string;
      document_id: string;
      source_paragraph_id: string;
      target_paragraph_id: string;
      created_at: string;
    };
    indexes: { 'by-document': string };
  };
  session: {
    key: string;
    value: {
      key: string;
      value: any;
    };
  };
}

class LocalDatabase {
  private db: IDBPDatabase<MockDB> | null = null;
  private readonly DB_NAME = 'close-reading-mock-db';
  private readonly DB_VERSION = 1;

  async init() {
    if (this.db) return this.db;

    this.db = await openDB<MockDB>(this.DB_NAME, this.DB_VERSION, {
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
  async setSession(key: string, value: any) {
    const db = await this.init();
    await db.put('session', { key, value });
  }

  async getSession(key: string) {
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

  private sanitizeUser(user: any) {
    const sanitized = { ...user };
    delete sanitized.password;
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

  async createDocument(data: any) {
    const db = await this.init();

    const document = {
      id: this.generateId(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.add('documents', document);
    return document;
  }

  async updateDocument(id: string, data: any) {
    const db = await this.init();
    const existing = await db.get('documents', id);

    if (!existing) {
      throw new Error('Document not found');
    }

    const updated = {
      ...existing,
      ...data,
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

  async createAnnotation(data: any) {
    const db = await this.init();

    const annotation = {
      id: this.generateId(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.add('annotations', annotation);
    return annotation;
  }

  async updateAnnotation(id: string, data: any) {
    const db = await this.init();
    const existing = await db.get('annotations', id);

    if (!existing) {
      throw new Error('Annotation not found');
    }

    const updated = {
      ...existing,
      ...data,
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

  async createProject(data: any) {
    const db = await this.init();

    const project = {
      id: this.generateId(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.add('projects', project);
    return project;
  }

  // Paragraph links management
  async getParagraphLinks(documentId: string) {
    const db = await this.init();
    return await db.getAllFromIndex('paragraph_links', 'by-document', documentId);
  }

  async createParagraphLink(data: any) {
    const db = await this.init();

    const link = {
      id: this.generateId(),
      ...data,
      created_at: new Date().toISOString(),
    };

    await db.add('paragraph_links', link);
    return link;
  }
}

export const localDB = new LocalDatabase();
