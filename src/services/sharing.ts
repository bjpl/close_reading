/**
 * Sharing Service
 *
 * Handles document sharing functionality including:
 * - Share link generation
 * - Token validation
 * - Public document access
 * - Access tracking
 */

import { supabase } from '../lib/supabase';
import logger, { logError } from '../lib/logger';

export interface ShareLink {
  id: string;
  document_id: string;
  token: string;
  created_by: string;
  expires_at: string | null;
  access_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Annotation data for shared documents
 */
export interface SharedAnnotation {
  id: string;
  annotation_type: 'highlight' | 'note' | 'main_idea' | 'citation' | 'question';
  content: string | null;
  highlight_color: string | null;
  start_offset: number | null;
  end_offset: number | null;
  selected_text?: string | null;
  tags?: string[];
  created_at: string;
}

export interface SharedDocument {
  id: string;
  title: string;
  content: string;
  project_id: string;
  created_at: string;
  annotations: SharedAnnotation[];
  project_title?: string;
}

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(36).padStart(2, '0')).join('');
}

/**
 * Generate a share link for a document
 * @param documentId - ID of the document to share
 * @param expiresInDays - Optional expiration period in days
 * @returns The generated share link with full URL
 */
export async function generateShareLink(
  documentId: string,
  expiresInDays?: number
): Promise<{ link: string; token: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User must be authenticated to generate share links');
  }

  // Check if user owns the document
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('id, user_id')
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    throw new Error('Document not found');
  }

  if (document.user_id !== user.id) {
    throw new Error('You do not have permission to share this document');
  }

  // Delete any existing share links for this document
  await supabase
    .from('share_links')
    .delete()
    .eq('document_id', documentId);

  // Generate secure token
  const token = generateSecureToken();

  // Calculate expiration date if specified
  let expiresAt: string | null = null;
  if (expiresInDays && expiresInDays > 0) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiresInDays);
    expiresAt = expiryDate.toISOString();
  }

  // Create share link in database
  const { error } = await supabase
    .from('share_links')
    .insert({
      document_id: documentId,
      token,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    logError(new Error('Failed to create share link'), {
      documentId,
      errorCode: error.code,
      errorMessage: error.message
    });
    throw new Error('Failed to create share link');
  }

  // Generate full URL
  const baseUrl = window.location.origin;
  const link = `${baseUrl}/shared/${token}`;

  return { link, token };
}

/**
 * Validate a share token using secure database function
 * @param token - The share token to validate
 * @returns True if valid and not expired, false otherwise
 */
export async function validateShareToken(token: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('validate_share_token', { p_token: token });

  if (error || !data || data.length === 0) {
    return false;
  }

  return data[0].is_valid;
}

/**
 * Get a shared document by token using secure validation
 * @param token - The share token
 * @returns The document data with annotations
 */
export async function getSharedDocument(token: string): Promise<SharedDocument | null> {
  // Validate the token using secure function
  const { data: validationData, error: validationError } = await supabase
    .rpc('validate_share_token', { p_token: token });

  if (validationError || !validationData || validationData.length === 0 || !validationData[0].is_valid) {
    return null;
  }

  const documentId = validationData[0].document_id;

  // Increment access count using secure function
  await incrementAccessCount(token);

  // Get the document with annotations
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      content,
      project_id,
      created_at,
      projects:project_id (
        title
      )
    `)
    .eq('id', documentId)
    .single();

  if (docError || !document) {
    return null;
  }

  // Get annotations for the document
  const { data: annotations } = await supabase
    .from('annotations')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });

  const projectTitle = document.projects
    ? (Array.isArray(document.projects) ? document.projects[0]?.title : (document.projects as Record<string, unknown>)?.title)
    : undefined;

  return {
    id: document.id,
    title: document.title,
    content: document.content,
    project_id: document.project_id,
    created_at: document.created_at,
    annotations: annotations || [],
    project_title: projectTitle,
  };
}

/**
 * Revoke a share link for a document
 * @param documentId - ID of the document
 */
export async function revokeShareLink(documentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User must be authenticated to revoke share links');
  }

  // Delete the share link
  const { error } = await supabase
    .from('share_links')
    .delete()
    .eq('document_id', documentId)
    .eq('created_by', user.id);

  if (error) {
    logError(new Error('Failed to revoke share link'), {
      documentId,
      userId: user.id,
      errorCode: error.code,
      errorMessage: error.message
    });
    throw new Error('Failed to revoke share link');
  }
}

/**
 * Increment the access count for a share link using secure function
 * @param token - The share token
 */
export async function incrementAccessCount(token: string): Promise<void> {
  const { error } = await supabase
    .rpc('increment_share_access_count', { p_token: token });

  if (error) {
    logger.warn({
      token: token.substring(0, 8) + '...',
      errorCode: error.code,
      errorMessage: error.message
    }, 'Failed to increment access count');
  }
}

/**
 * Get share link info for a document using secure function
 * @param documentId - ID of the document
 * @returns Share link data if exists
 */
export async function getShareLinkInfo(documentId: string): Promise<ShareLink | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .rpc('get_share_link_info', { p_document_id: documentId });

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0];
}
