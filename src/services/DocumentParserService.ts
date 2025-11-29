/**
 * Document Parser Service
 *
 * Handles parsing of various document formats (PDF, DOCX, TXT, MD) into structured text.
 * Extracts paragraphs, sentences, and metadata for research analysis.
 *
 * @module services/DocumentParserService
 */

import mammoth from 'mammoth';
import DOMPurify from 'dompurify';
// Logger available if needed: import logger from '@/lib/logger';

/**
 * Supported document formats
 */
export type DocumentFormat = 'pdf' | 'docx' | 'txt' | 'md' | 'html';

/**
 * Parsed paragraph structure
 */
export interface ParsedParagraph {
  id: string;
  text: string;
  order: number;
  sentences: ParsedSentence[];
  metadata?: {
    startOffset: number;
    endOffset: number;
    heading?: string;
    style?: string;
  };
}

/**
 * Parsed sentence structure
 */
export interface ParsedSentence {
  id: string;
  text: string;
  paragraphId: string;
  order: number;
  startOffset: number;
  endOffset: number;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdDate?: Date;
  modifiedDate?: Date;
  pageCount?: number;
  wordCount?: number;
  characterCount?: number;
  language?: string;
  format: DocumentFormat;
}

/**
 * Complete parsed document
 */
export interface ParsedDocument {
  metadata: DocumentMetadata;
  paragraphs: ParsedParagraph[];
  sentences: ParsedSentence[];
  rawText: string;
}

/**
 * Parser options
 */
export interface ParserOptions {
  minParagraphLength?: number;
  minSentenceLength?: number;
  preserveWhitespace?: boolean;
  extractMetadata?: boolean;
  sanitizeHTML?: boolean;
}

/**
 * Document parsing service
 *
 * @example
 * ```typescript
 * const parser = new DocumentParserService();
 *
 * // Parse a DOCX file
 * const file = new File([blob], 'document.docx');
 * const parsed = await parser.parseDocument(file);
 *
 * // Access paragraphs and sentences
 * console.log(parsed.paragraphs.length);
 * console.log(parsed.sentences.length);
 * ```
 */
export class DocumentParserService {
  private readonly defaultOptions: ParserOptions = {
    minParagraphLength: 10,
    minSentenceLength: 5,
    preserveWhitespace: false,
    extractMetadata: true,
    sanitizeHTML: true,
  };

  /**
   * Parse a document file
   *
   * @param file - File to parse
   * @param options - Parsing options
   * @returns Parsed document structure
   * @throws Error if parsing fails
   */
  async parseDocument(
    file: File,
    options?: Partial<ParserOptions>
  ): Promise<ParsedDocument> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const format = this.detectFormat(file);

    let rawText: string;
    let metadata: DocumentMetadata = {
      title: file.name,
      format,
    };

    try {
      switch (format) {
        case 'docx':
          ({ text: rawText, metadata } = await this.parseDOCX(file, mergedOptions));
          break;
        case 'pdf':
          ({ text: rawText, metadata } = await this.parsePDF(file, mergedOptions));
          break;
        case 'txt':
          rawText = await this.parseTextFile(file);
          break;
        case 'md':
          rawText = await this.parseMarkdown(file, mergedOptions);
          break;
        case 'html':
          rawText = await this.parseHTML(file, mergedOptions);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Parse structure
      const paragraphs = this.extractParagraphs(rawText, mergedOptions);
      const sentences = this.extractSentences(paragraphs);

      // Update metadata with counts
      metadata.wordCount = this.countWords(rawText);
      metadata.characterCount = rawText.length;

      return {
        metadata,
        paragraphs,
        sentences,
        rawText,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Format-specific parsers

  private async parseDOCX(
    file: File,
    options: ParserOptions
  ): Promise<{ text: string; metadata: DocumentMetadata }> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });

      const text = options.preserveWhitespace
        ? result.value
        : this.normalizeWhitespace(result.value);

      const metadata: DocumentMetadata = {
        title: file.name.replace('.docx', ''),
        format: 'docx',
        modifiedDate: new Date(file.lastModified),
      };

      return { text, metadata };
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parsePDF(
    file: File,
    options: ParserOptions
  ): Promise<{ text: string; metadata: DocumentMetadata }> {
    // Note: pdf-parse is already in package.json
    // For now, we'll use a placeholder. In production, implement with pdf-parse
    try {
      // Import dynamically to avoid issues if pdf-parse has native dependencies
      // @ts-ignore - no types available
      const pdfParse = await import('pdf-parse/lib/pdf-parse.js');
      const arrayBuffer = await file.arrayBuffer();
      const data = await pdfParse.default(Buffer.from(arrayBuffer));

      const text = options.preserveWhitespace
        ? data.text
        : this.normalizeWhitespace(data.text);

      const metadata: DocumentMetadata = {
        title: file.name.replace('.pdf', ''),
        format: 'pdf',
        pageCount: data.numpages,
        modifiedDate: new Date(file.lastModified),
      };

      return { text, metadata };
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseTextFile(file: File): Promise<string> {
    return await file.text();
  }

  private async parseMarkdown(
    file: File,
    options: ParserOptions
  ): Promise<string> {
    const text = await file.text();

    // Basic markdown to plain text conversion
    const cleaned = text
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic
      .replace(/`(.+?)`/g, '$1') // Inline code
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
      .replace(/^[-*+]\s+/gm, '') // Lists
      .replace(/^\d+\.\s+/gm, ''); // Numbered lists

    return options.preserveWhitespace ? cleaned : this.normalizeWhitespace(cleaned);
  }

  private async parseHTML(
    file: File,
    options: ParserOptions
  ): Promise<string> {
    const html = await file.text();

    // Sanitize HTML
    const clean = options.sanitizeHTML
      ? DOMPurify.sanitize(html, { ALLOWED_TAGS: [] })
      : html.replace(/<[^>]*>/g, '');

    return options.preserveWhitespace ? clean : this.normalizeWhitespace(clean);
  }

  // Text structure extraction

  private extractParagraphs(
    text: string,
    options: ParserOptions
  ): ParsedParagraph[] {
    const minLength = options.minParagraphLength || 10;

    // Split by double newlines or paragraph boundaries
    const rawParagraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length >= minLength);

    let currentOffset = 0;

    return rawParagraphs.map((text, index) => {
      const id = this.generateParagraphId(index);
      const startOffset = currentOffset;
      const endOffset = startOffset + text.length;

      currentOffset = endOffset + 2; // Account for paragraph separator

      return {
        id,
        text,
        order: index,
        sentences: [], // Will be populated by extractSentences
        metadata: {
          startOffset,
          endOffset,
        },
      };
    });
  }

  private extractSentences(paragraphs: ParsedParagraph[]): ParsedSentence[] {
    const allSentences: ParsedSentence[] = [];
    let globalSentenceIndex = 0;

    paragraphs.forEach((paragraph) => {
      const sentences = this.splitIntoSentences(paragraph.text);
      let localOffset = 0;

      sentences.forEach((sentenceText, localIndex) => {
        const id = this.generateSentenceId(globalSentenceIndex);
        const startOffset = localOffset;
        const endOffset = startOffset + sentenceText.length;

        const sentence: ParsedSentence = {
          id,
          text: sentenceText,
          paragraphId: paragraph.id,
          order: localIndex,
          startOffset: paragraph.metadata!.startOffset + startOffset,
          endOffset: paragraph.metadata!.startOffset + endOffset,
        };

        paragraph.sentences.push(sentence);
        allSentences.push(sentence);

        localOffset = endOffset + 1;
        globalSentenceIndex++;
      });
    });

    return allSentences;
  }

  private splitIntoSentences(text: string): string[] {
    // Enhanced sentence splitting with abbreviation handling
    const abbrevPattern = /\b(?:Dr|Mr|Mrs|Ms|Prof|Sr|Jr|etc|vs|i\.e|e\.g)\./gi;

    // Replace abbreviations temporarily
    const protectedText = text.replace(abbrevPattern, (match) => match.replace('.', '|||'));

    // Split on sentence boundaries
    const sentences = protectedText
      .split(/[.!?]+\s+/)
      .map((s) => s.replace(/\|\|\|/g, '.').trim())
      .filter((s) => s.length > 0);

    return sentences;
  }

  // Utility methods

  private detectFormat(file: File): DocumentFormat {
    const ext = file.name.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'pdf':
        return 'pdf';
      case 'docx':
      case 'doc':
        return 'docx';
      case 'txt':
        return 'txt';
      case 'md':
      case 'markdown':
        return 'md';
      case 'html':
      case 'htm':
        return 'html';
      default:
        throw new Error(`Unknown file extension: ${ext}`);
    }
  }

  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\t/g, ' ') // Replace tabs with spaces
      .replace(/ +/g, ' ') // Collapse multiple spaces
      .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
      .trim();
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  private generateParagraphId(index: number): string {
    return `p-${index.toString().padStart(4, '0')}`;
  }

  private generateSentenceId(index: number): string {
    return `s-${index.toString().padStart(6, '0')}`;
  }

  /**
   * Parse raw text into structured document
   *
   * @param text - Raw text to parse
   * @param options - Parsing options
   * @returns Parsed document structure
   */
  parseText(
    text: string,
    options?: Partial<ParserOptions>
  ): ParsedDocument {
    // Use lower minParagraphLength for raw text unless explicitly specified
    const textDefaults = { ...this.defaultOptions, minParagraphLength: 1 };
    const mergedOptions = { ...textDefaults, ...options };

    // Normalize text
    const rawText = mergedOptions.preserveWhitespace
      ? text.replace(/\r\n/g, '\n')
      : this.normalizeWhitespace(text);

    // Parse structure
    const paragraphs = this.extractParagraphs(rawText, mergedOptions);
    const sentences = this.extractSentences(paragraphs);

    const metadata: DocumentMetadata = {
      format: 'txt',
      wordCount: this.countWords(rawText),
      characterCount: rawText.length,
    };

    return {
      metadata,
      paragraphs,
      sentences,
      rawText,
    };
  }

  /**
   * Validate a parsed document
   *
   * @param document - Document to validate
   * @returns Validation result
   */
  validateDocument(document: ParsedDocument): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!document.paragraphs || document.paragraphs.length === 0) {
      errors.push('No paragraphs found');
    }

    if (!document.sentences || document.sentences.length === 0) {
      errors.push('No sentences found');
    }

    if (!document.rawText || document.rawText.trim().length === 0) {
      errors.push('No text content');
    }

    // Validate paragraph IDs are unique
    const paragraphIds = new Set(document.paragraphs.map((p) => p.id));
    if (paragraphIds.size !== document.paragraphs.length) {
      errors.push('Duplicate paragraph IDs found');
    }

    // Validate sentence IDs are unique
    const sentenceIds = new Set(document.sentences.map((s) => s.id));
    if (sentenceIds.size !== document.sentences.length) {
      errors.push('Duplicate sentence IDs found');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Singleton instance for global access
 */
export const documentParserService = new DocumentParserService();
