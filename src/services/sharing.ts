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

export interface SharedDocument {
  id: string;
  title: string;
  content: string;
  project_id: string;
  created_at: string;
  annotations: any[];
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
  const { data: shareLink, error } = await supabase
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
    console.error('Error creating share link:', error);
    throw new Error('Failed to create share link');
  }

  // Generate full URL
  const baseUrl = window.location.origin;
  const link = `${baseUrl}/shared/${token}`;

  return { link, token };
}

/**
 * Validate a share token
 * @param token - The share token to validate
 * @returns True if valid and not expired, false otherwise
 */
export async function validateShareToken(token: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('share_links')
    .select('id, expires_at')
    .eq('token', token)
    .single();

  if (error || !data) {
    return false;
  }

  // Check if expired
  if (data.expires_at) {
    const expiryDate = new Date(data.expires_at);
    if (expiryDate < new Date()) {
      return false;
    }
  }

  return true;
}

/**
 * Get a shared document by token
 * @param token - The share token
 * @returns The document data with annotations
 */
export async function getSharedDocument(token: string): Promise<SharedDocument | null> {
  // First validate the token
  const isValid = await validateShareToken(token);
  if (!isValid) {
    return null;
  }

  // Get the share link
  const { data: shareLink, error: shareLinkError } = await supabase
    .from('share_links')
    .select('document_id, id')
    .eq('token', token)
    .single();

  if (shareLinkError || !shareLink) {
    return null;
  }

  // Increment access count
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
    .eq('id', shareLink.document_id)
    .single();

  if (docError || !document) {
    return null;
  }

  // Get annotations for the document
  const { data: annotations, error: annotError } = await supabase
    .from('annotations')
    .select('*')
    .eq('document_id', shareLink.document_id)
    .order('created_at', { ascending: true });

  return {
    id: document.id,
    title: document.title,
    content: document.content,
    project_id: document.project_id,
    created_at: document.created_at,
    annotations: annotations || [],
    project_title: document.projects?.title,
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
    console.error('Error revoking share link:', error);
    throw new Error('Failed to revoke share link');
  }
}

/**
 * Increment the access count for a share link
 * @param token - The share token
 */
export async function incrementAccessCount(token: string): Promise<void> {
  // Get current count
  const { data: shareLink, error: fetchError } = await supabase
    .from('share_links')
    .select('access_count')
    .eq('token', token)
    .single();

  if (fetchError || !shareLink) {
    return;
  }

  // Increment count
  const { error: updateError } = await supabase
    .from('share_links')
    .update({ access_count: shareLink.access_count + 1 })
    .eq('token', token);

  if (updateError) {
    console.error('Error incrementing access count:', updateError);
  }
}

/**
 * Get share link info for a document
 * @param documentId - ID of the document
 * @returns Share link data if exists
 */
export async function getShareLinkInfo(documentId: string): Promise<ShareLink | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('document_id', documentId)
    .eq('created_by', user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}
