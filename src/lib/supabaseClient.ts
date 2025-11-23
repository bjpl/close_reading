/**
 * Type-safe Supabase Client Helpers
 *
 * Provides strongly-typed database operations with RLS awareness.
 */

import { supabase } from './supabase';
import type { Database } from '../types/database.types';

// Table type shortcuts
export type Tables = Database['public']['Tables'];
export type Project = Tables['projects']['Row'];
export type ProjectInsert = Tables['projects']['Insert'];
export type ProjectUpdate = Tables['projects']['Update'];

export type Document = Tables['documents']['Row'];
export type DocumentInsert = Tables['documents']['Insert'];
export type DocumentUpdate = Tables['documents']['Update'];

export type Paragraph = Tables['paragraphs']['Row'];
export type ParagraphInsert = Tables['paragraphs']['Insert'];
export type ParagraphUpdate = Tables['paragraphs']['Update'];

export type Sentence = Tables['sentences']['Row'];
export type SentenceInsert = Tables['sentences']['Insert'];

export type Annotation = Tables['annotations']['Row'];
export type AnnotationInsert = Tables['annotations']['Insert'];
export type AnnotationUpdate = Tables['annotations']['Update'];

export type ParagraphLink = Tables['paragraph_links']['Row'];
export type ParagraphLinkInsert = Tables['paragraph_links']['Insert'];
export type ParagraphLinkUpdate = Tables['paragraph_links']['Update'];

export type UserProfile = Tables['user_profiles']['Row'];
export type UserProfileInsert = Tables['user_profiles']['Insert'];
export type UserProfileUpdate = Tables['user_profiles']['Update'];

/**
 * Error handling helper
 */
export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

/**
 * Handle Supabase response and throw on error
 */
export const handleSupabaseResponse = <T>(response: {
  data: T | null;
  error: { message: string; code?: string; details?: unknown } | null;
}): T => {
  if (response.error) {
    throw new SupabaseError(
      response.error.message,
      response.error.code,
      response.error.details
    );
  }
  if (response.data === null) {
    throw new SupabaseError('No data returned from query');
  }
  return response.data;
};

/**
 * Storage helpers
 */
export const storage = {
  /**
   * Upload document to user's folder
   */
  uploadDocument: async (userId: string, file: File, fileName: string) => {
    const filePath = `${userId}/${Date.now()}-${fileName}`;
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw new SupabaseError(error.message);
    return data;
  },

  /**
   * Get public URL for document
   */
  getDocumentUrl: (filePath: string) => {
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);
    return data.publicUrl;
  },

  /**
   * Delete document
   */
  deleteDocument: async (filePath: string) => {
    const { error } = await supabase.storage
      .from('documents')
      .remove([filePath]);

    if (error) throw new SupabaseError(error.message);
  },
};

export { supabase };
