/**
 * Paragraph Links Hook
 *
 * Manages paragraph linking operations with Supabase.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type ParagraphLink = Database['public']['Tables']['paragraph_links']['Row'];
type ParagraphLinkInsert = Database['public']['Tables']['paragraph_links']['Insert'];

export const useParagraphLinks = (documentId?: string, userId?: string) => {
  const [links, setLinks] = useState<ParagraphLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch links for paragraphs in a document
  const fetchLinks = async () => {
    if (!documentId || !userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get all paragraphs for this document
      const { data: paragraphs, error: paraError } = await supabase
        .from('paragraphs')
        .select('id')
        .eq('document_id', documentId);

      if (paraError) throw paraError;

      const paragraphIds = paragraphs.map((p) => p.id);

      if (paragraphIds.length === 0) {
        setLinks([]);
        return;
      }

      // Get links where source is in this document
      const { data, error } = await supabase
        .from('paragraph_links')
        .select('*')
        .in('source_paragraph_id', paragraphIds)
        .eq('user_id', userId);

      if (error) throw error;
      setLinks(data || []);
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Create paragraph link
  const createLink = async (
    sourceParagraphId: string,
    targetParagraphId: string,
    linkType: ParagraphLink['link_type'] = 'related',
    note?: string
  ) => {
    if (!userId) throw new Error('User not authenticated');

    try {
      setIsLoading(true);

      // Create bidirectional links
      const links: ParagraphLinkInsert[] = [
        {
          user_id: userId,
          source_paragraph_id: sourceParagraphId,
          target_paragraph_id: targetParagraphId,
          link_type: linkType,
          note,
        },
        {
          user_id: userId,
          source_paragraph_id: targetParagraphId,
          target_paragraph_id: sourceParagraphId,
          link_type: linkType,
          note,
        },
      ];

      const { error } = await supabase.from('paragraph_links').insert(links);

      if (error) throw error;
      await fetchLinks();
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete paragraph link (bidirectional)
  const deleteLink = async (sourceParagraphId: string, targetParagraphId: string) => {
    try {
      setIsLoading(true);

      // Delete both directions
      const { error } = await supabase
        .from('paragraph_links')
        .delete()
        .or(
          `and(source_paragraph_id.eq.${sourceParagraphId},target_paragraph_id.eq.${targetParagraphId}),and(source_paragraph_id.eq.${targetParagraphId},target_paragraph_id.eq.${sourceParagraphId})`
        );

      if (error) throw error;
      await fetchLinks();
      setError(null);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Get linked paragraphs for a specific paragraph
  const getLinkedParagraphs = (paragraphId: string): string[] => {
    return links
      .filter((link) => link.source_paragraph_id === paragraphId)
      .map((link) => link.target_paragraph_id);
  };

  useEffect(() => {
    fetchLinks();

    // Set up real-time subscription
    if (documentId) {
      const channel = supabase
        .channel('paragraph_links_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'paragraph_links',
          },
          () => {
            fetchLinks();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [documentId, userId]);

  return {
    links,
    isLoading,
    error,
    createLink,
    deleteLink,
    getLinkedParagraphs,
    refetch: fetchLinks,
  };
};
