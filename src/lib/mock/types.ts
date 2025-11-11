/**
 * Type definitions for mock Supabase client
 *
 * This module contains all TypeScript interfaces and types used across
 * the mock Supabase implementation.
 */

import { DBSchema } from 'idb';

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

/**
 * User object returned by authentication methods
 */
export interface MockUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata: Record<string, any>;
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
 * Standard response format for Supabase operations
 */
export interface SupabaseResponse<T> {
  data: T;
  error: { message: string; details?: any } | null;
}
