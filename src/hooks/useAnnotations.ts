/**
 * Annotations Hook
 *
 * Manages annotation CRUD operations with Supabase.
 */
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type AnnotationInsert = Database['public']['Tables']['annotations']['Insert'];
type AnnotationUpdate = Database['public']['Tables']['annotations']['Update'];

export const useAnnotations = (documentId?: string, userId?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create annotation
  const createAnnotation = async (
    annotation: Omit<AnnotationInsert, 'user_id' | 'document_id'>
  ) => {
    if (!userId || !documentId) {
      throw new Error('User and document required');
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('annotations')
        .insert({
          ...annotation,
          user_id: userId,
          document_id: documentId,
        })
        .select()
        .single();

      if (error) throw error;
      setError(null);
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update annotation
  const updateAnnotation = async (id: string, updates: AnnotationUpdate) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('annotations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete annotation (soft delete)
  const deleteAnnotation = async (id: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('annotations')
        .update({ archived: true })
        .eq('id', id);

      if (error) throw error;
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get annotations for document
  const getAnnotations = async () => {
    if (!documentId) return [];

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('document_id', documentId)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setError(null);
      return data || [];
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    getAnnotations,
  };
};
