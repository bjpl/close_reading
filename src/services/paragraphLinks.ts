/**
 * Paragraph Links Service
 *
 * Handles database operations for paragraph linking functionality.
 */
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type ParagraphLinkRow = Database['public']['Tables']['paragraph_links']['Row'];
type ParagraphLinkInsert = Database['public']['Tables']['paragraph_links']['Insert'];

/**
 * Create bidirectional links between paragraphs
 */
export const createParagraphLinks = async (
  paragraphIds: string[],
  userId: string
): Promise<ParagraphLinkRow[]> => {
  if (paragraphIds.length < 2) {
    throw new Error('At least 2 paragraphs required for linking');
  }

  const linksToCreate: ParagraphLinkInsert[] = [];
  const now = new Date().toISOString();

  // Create bidirectional links between all selected paragraphs
  for (let i = 0; i < paragraphIds.length; i++) {
    for (let j = i + 1; j < paragraphIds.length; j++) {
      // Forward link
      linksToCreate.push({
        user_id: userId,
        source_paragraph_id: paragraphIds[i],
        target_paragraph_id: paragraphIds[j],
        link_type: 'related',
        strength: 5,
        metadata: {},
        created_at: now,
        updated_at: now,
      });

      // Backward link
      linksToCreate.push({
        user_id: userId,
        source_paragraph_id: paragraphIds[j],
        target_paragraph_id: paragraphIds[i],
        link_type: 'related',
        strength: 5,
        metadata: {},
        created_at: now,
        updated_at: now,
      });
    }
  }

  const { data, error } = await supabase
    .from('paragraph_links')
    .insert(linksToCreate)
    .select();

  if (error) throw error;
  return data || [];
};

/**
 * Get all paragraph links for a document
 */
export const getParagraphLinks = async (
  documentId: string
): Promise<Map<string, string[]>> => {
  // Fetch all paragraphs for the document to get their IDs
  const { data: paragraphs, error: paraError } = await supabase
    .from('paragraphs')
    .select('id')
    .eq('document_id', documentId);

  if (paraError) throw paraError;

  const paragraphIds = paragraphs?.map((p: { id: string }) => p.id) || [];
  if (paragraphIds.length === 0) {
    return new Map();
  }

  // Fetch all links where source is one of these paragraphs
  const { data: links, error: linksError } = await supabase
    .from('paragraph_links')
    .select('source_paragraph_id, target_paragraph_id')
    .in('source_paragraph_id', paragraphIds);

  if (linksError) throw linksError;

  // Build a map of paragraph ID -> linked paragraph IDs
  const linkMap = new Map<string, string[]>();

  for (const link of links || []) {
    const typedLink = link as { source_paragraph_id: string; target_paragraph_id: string };
    const existing = linkMap.get(typedLink.source_paragraph_id) || [];
    existing.push(typedLink.target_paragraph_id);
    linkMap.set(typedLink.source_paragraph_id, existing);
  }

  return linkMap;
};

/**
 * Remove a specific link between two paragraphs (bidirectional)
 */
export const removeParagraphLink = async (
  paragraphId1: string,
  paragraphId2: string
): Promise<void> => {
  // Delete both directions of the link
  const { error: error1 } = await supabase
    .from('paragraph_links')
    .delete()
    .eq('source_paragraph_id', paragraphId1)
    .eq('target_paragraph_id', paragraphId2);

  if (error1) throw error1;

  const { error: error2 } = await supabase
    .from('paragraph_links')
    .delete()
    .eq('source_paragraph_id', paragraphId2)
    .eq('target_paragraph_id', paragraphId1);

  if (error2) throw error2;
};

/**
 * Get links for a specific paragraph
 */
export const getParagraphLinksForParagraph = async (
  paragraphId: string
): Promise<string[]> => {
  const { data, error } = await supabase
    .from('paragraph_links')
    .select('target_paragraph_id')
    .eq('source_paragraph_id', paragraphId);

  if (error) throw error;
  return data?.map((link: { target_paragraph_id: string }) => link.target_paragraph_id) || [];
};
