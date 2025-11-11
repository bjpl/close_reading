/**
 * Type definitions for mock Supabase client
 *
 * This module contains all TypeScript interfaces and types used across
 * the mock Supabase implementation.
 */

import { DBSchema } from 'idb';
import { Database } from '../../types/database';

/**
 * Type alias for JSON data from database schema
 */
export type Json = Database['public']['Tables']['annotations']['Row']['metadata'];

/**
 * User record stored in IndexedDB
 * Extends the database user type with authentication fields
 */
export interface DBUser {
  id: string;
  email: string;
  password: string; // Stored in mock DB only - hashed in production
  created_at: string;
  user_metadata: Record<string, unknown>;
}

/**
 * Document record from database schema
 */
export type DBDocument = Database['public']['Tables']['documents']['Row'];

/**
 * Annotation record from database schema
 */
export type DBAnnotation = Database['public']['Tables']['annotations']['Row'];

/**
 * Project record from database schema
 */
export type DBProject = Database['public']['Tables']['projects']['Row'];

/**
 * Paragraph record from database schema
 */
export type DBParagraph = Database['public']['Tables']['paragraphs']['Row'];

/**
 * Sentence record from database schema
 */
export type DBSentence = Database['public']['Tables']['sentences']['Row'];

/**
 * Paragraph link record from database schema
 */
export type DBParagraphLink = Database['public']['Tables']['paragraph_links']['Row'];

/**
 * IndexedDB schema definition for the mock Supabase database
 *
 * Defines all object stores (tables) with their structure:
 * - users: User accounts with authentication credentials
 * - documents: Text documents uploaded by users
 * - annotations: User annotations on documents
 * - projects: User-created projects containing documents
 * - paragraphs: Document text segmented into paragraphs
 * - sentences: Document text segmented into sentences
 * - paragraph_links: Links between paragraphs for navigation
 */
export interface MockDB extends DBSchema {
  users: {
    key: string;
    value: DBUser;
    indexes: { 'by-email': string };
  };
  documents: {
    key: string;
    value: DBDocument;
    indexes: { 'by-user': string };
  };
  annotations: {
    key: string;
    value: DBAnnotation;
    indexes: { 'by-document': string };
  };
  projects: {
    key: string;
    value: DBProject;
    indexes: { 'by-user': string };
  };
  paragraphs: {
    key: string;
    value: DBParagraph;
    indexes: { 'by-document': string };
  };
  sentences: {
    key: string;
    value: DBSentence;
    indexes: { 'by-document': string };
  };
  paragraph_links: {
    key: string;
    value: DBParagraphLink;
    indexes: { 'by-document': string };
  };
}

/**
 * User object returned by authentication methods
 */
export interface MockUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata: Record<string, unknown>;
  aud: string;
  role: string;
}

/**
 * Session object containing authentication tokens
 */
export interface MockSession {
  access_token: string;
  refresh_token: string;
  user: MockUser;
}

/**
 * Error details that may be included in Supabase responses
 */
export interface SupabaseErrorDetails {
  message: string;
  details?: string | Record<string, unknown>;
  hint?: string;
  code?: string;
}

/**
 * Standard response format for Supabase operations
 * @template T The type of data returned on success
 */
export interface SupabaseResponse<T> {
  data: T;
  error: SupabaseErrorDetails | null;
}
