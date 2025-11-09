import mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';

// Import pdf-parse using namespace import for CommonJS compatibility
import * as PdfParseModule from 'pdf-parse';
const PdfParse = (PdfParseModule as any).default || PdfParseModule;

export interface ExtractionResult {
  success: boolean;
  text?: string;
  error?: string;
  method?: 'direct' | 'mammoth' | 'pdf-parse' | 'tesseract';
}

/**
 * Extract text from .txt or .md files
 */
export async function extractPlainText(file: File): Promise<ExtractionResult> {
  try {
    const text = await file.text();
    return {
      success: true,
      text,
      method: 'direct'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read plain text'
    };
  }
}

/**
 * Extract text from .docx files using mammoth
 */
export async function extractDocxText(file: File): Promise<ExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    return {
      success: true,
      text: result.value,
      method: 'mammoth'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract DOCX text'
    };
  }
}

/**
 * Extract text from PDF using pdf-parse
 */
export async function extractPdfText(file: File): Promise<ExtractionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await PdfParse(buffer);

    if (data.text && data.text.trim().length > 0) {
      return {
        success: true,
        text: data.text,
        method: 'pdf-parse'
      };
    }

    // If no text extracted, fall back to OCR
    return await extractPdfTextWithOCR(file);
  } catch (error) {
    // Try OCR fallback
    return await extractPdfTextWithOCR(file);
  }
}

/**
 * Extract text from PDF using Tesseract OCR (fallback for scanned PDFs)
 */
export async function extractPdfTextWithOCR(file: File): Promise<ExtractionResult> {
  try {
    const worker = await createWorker('eng');

    // Convert PDF to images would require additional library (pdf.js)
    // For now, we'll convert the file to blob URL for Tesseract
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    const url = URL.createObjectURL(blob);

    const { data: { text } } = await worker.recognize(url);
    await worker.terminate();

    URL.revokeObjectURL(url);

    return {
      success: true,
      text,
      method: 'tesseract'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OCR extraction failed'
    };
  }
}

/**
 * Main extraction function that routes to appropriate extractor
 */
export async function extractText(file: File): Promise<ExtractionResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'txt':
    case 'md':
      return extractPlainText(file);

    case 'docx':
      return extractDocxText(file);

    case 'pdf':
      return extractPdfText(file);

    default:
      return {
        success: false,
        error: `Unsupported file type: ${extension}`
      };
  }
}

/**
 * Extract text from buffer (useful for already uploaded files)
 */
export async function extractTextFromBuffer(
  buffer: ArrayBuffer,
  fileType: 'txt' | 'md' | 'docx' | 'pdf'
): Promise<ExtractionResult> {
  try {
    switch (fileType) {
      case 'txt':
      case 'md': {
        const decoder = new TextDecoder();
        const text = decoder.decode(buffer);
        return { success: true, text, method: 'direct' };
      }

      case 'docx': {
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        return { success: true, text: result.value, method: 'mammoth' };
      }

      case 'pdf': {
        const pdfBuffer = Buffer.from(buffer);
        const data = await PdfParse(pdfBuffer);
        return { success: true, text: data.text, method: 'pdf-parse' };
      }

      default:
        return {
          success: false,
          error: `Unsupported file type: ${fileType}`
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Text extraction failed'
    };
  }
}
