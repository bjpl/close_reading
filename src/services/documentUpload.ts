import { supabase } from '../lib/supabase';
import type { Document } from '../types';

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  document?: Document;
  error?: string;
}

export interface DocumentMetadata {
  title: string;
  projectId: string;
  fileType: 'txt' | 'md' | 'docx' | 'pdf';
  fileSize: number;
}

const ALLOWED_FILE_TYPES = ['txt', 'md', 'docx', 'pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates file type and size
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (!extension || !ALLOWED_FILE_TYPES.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    };
  }

  return { valid: true };
}

/**
 * Uploads file to Supabase Storage
 */
export async function uploadFileToStorage(
  file: File,
  projectId: string
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop();
    // Use browser-compatible UUID generation
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `${projectId}/${Date.now()}_${randomId}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path);

    return {
      success: true,
      fileUrl: urlData.publicUrl
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Creates document metadata record in database
 */
export async function createDocumentRecord(
  metadata: DocumentMetadata,
  fileUrl: string,
  content: string
): Promise<{ success: boolean; document?: Document; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        project_id: metadata.projectId,
        title: metadata.title,
        file_type: metadata.fileType,
        file_url: fileUrl,
        content: content
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, document: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database insert failed'
    };
  }
}

/**
 * Main upload function that orchestrates validation and storage
 */
export async function uploadDocument(
  file: File,
  projectId: string
): Promise<UploadResult> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Upload to storage
  const uploadResult = await uploadFileToStorage(file, projectId);
  if (!uploadResult.success) {
    return { success: false, error: uploadResult.error };
  }

  return {
    success: true,
    fileUrl: uploadResult.fileUrl
  };
}
