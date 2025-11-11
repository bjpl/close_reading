import { uploadDocument, createDocumentRecord } from './documentUpload';
import { extractText } from './textExtraction';
import { parseDocument, storeParseDocument } from './textParsing';
import type { Document, Paragraph, Sentence } from '../types';
import logger, { logError, logPerformance } from '../lib/logger';

export interface ProcessingProgress {
  stage: 'uploading' | 'extracting' | 'parsing' | 'storing' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface ProcessingResult {
  success: boolean;
  document?: Document;
  paragraphs?: Paragraph[];
  sentences?: Sentence[];
  error?: string;
}

export type ProgressCallback = (progress: ProcessingProgress) => void;

/**
 * Complete document processing pipeline
 * Orchestrates: upload → extract → parse → store
 */
export async function processDocument(
  file: File,
  projectId: string,
  onProgress?: ProgressCallback
): Promise<ProcessingResult> {
  try {
    // Stage 1: Upload file to storage
    onProgress?.({
      stage: 'uploading',
      progress: 10,
      message: 'Uploading document to storage...'
    });

    const uploadResult = await uploadDocument(file, projectId);
    if (!uploadResult.success || !uploadResult.fileUrl) {
      return {
        success: false,
        error: uploadResult.error || 'Upload failed'
      };
    }

    onProgress?.({
      stage: 'uploading',
      progress: 30,
      message: 'Upload complete'
    });

    // Stage 2: Extract text from file
    onProgress?.({
      stage: 'extracting',
      progress: 40,
      message: 'Extracting text from document...'
    });

    const extractionResult = await extractText(file);
    if (!extractionResult.success || !extractionResult.text) {
      return {
        success: false,
        error: extractionResult.error || 'Text extraction failed'
      };
    }

    onProgress?.({
      stage: 'extracting',
      progress: 60,
      message: `Text extracted using ${extractionResult.method}`
    });

    // Stage 3: Parse text into paragraphs and sentences
    onProgress?.({
      stage: 'parsing',
      progress: 70,
      message: 'Parsing document structure...'
    });

    const parseResult = parseDocument(extractionResult.text);
    if (!parseResult.success || !parseResult.parsed) {
      return {
        success: false,
        error: parseResult.error || 'Parsing failed'
      };
    }

    onProgress?.({
      stage: 'parsing',
      progress: 80,
      message: `Parsed ${parseResult.parsed.totalParagraphs} paragraphs, ${parseResult.parsed.totalSentences} sentences`
    });

    // Stage 4: Create document record
    onProgress?.({
      stage: 'storing',
      progress: 85,
      message: 'Creating document record...'
    });

    const fileType = file.name.split('.').pop()?.toLowerCase() as 'txt' | 'md' | 'docx' | 'pdf';
    const documentRecord = await createDocumentRecord(
      {
        title: file.name,
        projectId,
        fileType,
        fileSize: file.size
      },
      uploadResult.fileUrl,
      extractionResult.text
    );

    if (!documentRecord.success || !documentRecord.document) {
      return {
        success: false,
        error: documentRecord.error || 'Failed to create document record'
      };
    }

    onProgress?.({
      stage: 'storing',
      progress: 90,
      message: 'Storing paragraphs and sentences...'
    });

    // Stage 5: Store parsed structure
    logger.debug({
      documentId: documentRecord.document.id,
      paragraphCount: parseResult.parsed.totalParagraphs,
      sentenceCount: parseResult.parsed.totalSentences
    }, 'Storing parsed document structure');
    const storageResult = await storeParseDocument(
      documentRecord.document.id,
      parseResult.parsed
    );

    if (!storageResult.success) {
      return {
        success: false,
        error: storageResult.error || 'Failed to store document structure'
      };
    }

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Document processing complete!'
    });

    return {
      success: true,
      document: documentRecord.document,
      paragraphs: storageResult.paragraphs,
      sentences: storageResult.sentences
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    onProgress?.({
      stage: 'error',
      progress: 0,
      message: 'Processing failed',
      error: errorMessage
    });

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Process document with retry logic for error recovery
 */
export async function processDocumentWithRetry(
  file: File,
  projectId: string,
  onProgress?: ProgressCallback,
  maxRetries: number = 3
): Promise<ProcessingResult> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (attempt > 1) {
      onProgress?.({
        stage: 'uploading',
        progress: 0,
        message: `Retry attempt ${attempt} of ${maxRetries}...`
      });

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }

    const result = await processDocument(file, projectId, onProgress);

    if (result.success) {
      return result;
    }

    lastError = result.error;
  }

  return {
    success: false,
    error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`
  };
}

/**
 * Batch process multiple documents
 */
export async function processDocumentBatch(
  files: File[],
  projectId: string,
  onProgress?: (fileIndex: number, progress: ProcessingProgress) => void
): Promise<ProcessingResult[]> {
  const results: ProcessingResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const result = await processDocument(
      files[i],
      projectId,
      (progress) => onProgress?.(i, progress)
    );
    results.push(result);
  }

  return results;
}

/**
 * Get processing statistics
 */
export function getProcessingStats(results: ProcessingResult[]) {
  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = total - successful;
  const totalParagraphs = results.reduce((sum, r) => sum + (r.paragraphs?.length || 0), 0);
  const totalSentences = results.reduce((sum, r) => sum + (r.sentences?.length || 0), 0);

  return {
    total,
    successful,
    failed,
    successRate: (successful / total) * 100,
    totalParagraphs,
    totalSentences
  };
}
