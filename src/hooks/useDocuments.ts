/**
 * Documents Hook
 *
 * Manages document CRUD operations and file uploads with Supabase.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';
import { useDocumentStore } from '../stores/documentStore';

type DocumentRow = Database['public']['Tables']['documents']['Row'];
type DocumentUpdate = Database['public']['Tables']['documents']['Update'];

export const useDocuments = (projectId?: string, userId?: string) => {
  const { setDocument } = useDocumentStore();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch documents for a project
  const fetchDocuments = async () => {
    if (!projectId || !userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload file to Supabase Storage
  const uploadFile = async (file: File, projectId: string, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${projectId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    return data.path;
  };

  // Create document record
  const createDocument = async (
    file: File,
    projectId: string,
    userId: string,
    title?: string
  ) => {
    try {
      setIsLoading(true);

      // Upload file to storage
      const filePath = await uploadFile(file, projectId, userId);

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('documents').getPublicUrl(filePath);

      // Create document record
      const { data, error } = await supabase
        .from('documents')
        .insert({
          project_id: projectId,
          user_id: userId,
          title: title || file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          processing_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      await fetchDocuments();
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get single document with all related data
  const getDocumentWithContent = async (documentId: string) => {
    try {
      setIsLoading(true);

      // Fetch document
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      // Fetch paragraphs
      const { data: paragraphs, error: paraError } = await supabase
        .from('paragraphs')
        .select('*')
        .eq('document_id', documentId)
        .order('position', { ascending: true });

      if (paraError) throw paraError;

      // Fetch sentences
      const { data: sentences, error: sentError } = await supabase
        .from('sentences')
        .select('*')
        .eq('document_id', documentId)
        .order('position', { ascending: true });

      if (sentError) throw sentError;

      // Fetch annotations
      const { data: annotations, error: annoError } = await supabase
        .from('annotations')
        .select('*')
        .eq('document_id', documentId)
        .eq('archived', false);

      if (annoError) throw annoError;

      // Transform to app format
      const transformedDocument = {
        id: doc.id,
        title: doc.title,
        projectId: doc.project_id,
        userId: doc.user_id,
        fileUrl: doc.file_url,
        fileType: doc.file_type,
        processingStatus: doc.processing_status,
        paragraphs: paragraphs.map((p) => ({
          id: p.id,
          content: p.content,
          order: p.position,
          pageNumber: p.page_number || undefined,
          linkedParagraphs: [],
          annotations: annotations
            .filter((a) => a.paragraph_id === p.id)
            .map((a) => ({
              id: a.id,
              type: a.annotation_type,
              text: a.content || '',
              note: a.content,
              color: (a.highlight_color as any) || 'yellow',
              startOffset: a.start_offset || 0,
              endOffset: a.end_offset || 0,
              paragraphId: a.paragraph_id || '',
              createdAt: new Date(a.created_at),
              updatedAt: new Date(a.updated_at),
            })),
        })),
        sentences: sentences.map((s) => ({
          id: s.id,
          paragraphId: s.paragraph_id,
          content: s.content,
          order: s.position,
          startOffset: s.start_offset,
          endOffset: s.end_offset,
        })),
        createdAt: new Date(doc.created_at),
        updatedAt: new Date(doc.updated_at),
      };

      setDocument(transformedDocument as any);
      setError(null);
      return transformedDocument;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update document
  const updateDocument = async (id: string, updates: DocumentUpdate) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      await fetchDocuments();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  // Delete document (soft delete)
  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ archived: true })
        .eq('id', id);

      if (error) throw error;
      await fetchDocuments();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    }
  };

  useEffect(() => {
    fetchDocuments();

    // Set up real-time subscription
    if (projectId) {
      const channel = supabase
        .channel('documents_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents',
            filter: `project_id=eq.${projectId}`,
          },
          () => {
            fetchDocuments();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [projectId, userId]);

  return {
    documents,
    isLoading,
    error,
    createDocument,
    getDocumentWithContent,
    updateDocument,
    deleteDocument,
    refetch: fetchDocuments,
  };
};
