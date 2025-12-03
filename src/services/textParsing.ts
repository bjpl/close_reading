import { supabase } from '../lib/supabase';
import type { Paragraph, Sentence } from '../types';
import logger from '../lib/logger';

export interface ParsedDocument {
  paragraphs: ParsedParagraph[];
  totalParagraphs: number;
  totalSentences: number;
}

export interface ParsedParagraph {
  content: string;
  position: number;
  sentences: ParsedSentence[];
}

export interface ParsedSentence {
  content: string;
  position: number;
}

export interface ParsingResult {
  success: boolean;
  parsed?: ParsedDocument;
  error?: string;
}

export interface StorageResult {
  success: boolean;
  paragraphs?: Paragraph[];
  sentences?: Sentence[];
  error?: string;
}

/**
 * Parse text into paragraphs (split by double newlines or single newlines)
 */
export function parseParagraphs(text: string): string[] {
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n');

  // Split by double newlines first (standard paragraph separation)
  let paragraphs = normalized.split(/\n\s*\n/);

  // If no double newlines found, split by single newlines
  if (paragraphs.length === 1 && paragraphs[0].length > 200) {
    paragraphs = normalized.split(/\n/);
  }

  // Filter out empty paragraphs and trim
  return paragraphs
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Parse paragraph into sentences using regex
 */
export function parseSentences(paragraph: string): string[] {
  // Match sentences ending with . ! ? followed by space or end of string
  // Also handles abbreviations like Dr. Mrs. etc.
  const sentenceRegex = /[^.!?]+[.!?]+(?=\s+[A-Z]|$)/g;

  const sentences = paragraph.match(sentenceRegex);

  if (!sentences || sentences.length === 0) {
    // If regex fails, treat whole paragraph as one sentence
    return [paragraph.trim()];
  }

  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Parse full document into structured format
 */
export function parseDocument(text: string): ParsingResult {
  try {
    const paragraphTexts = parseParagraphs(text);
    const paragraphs: ParsedParagraph[] = [];
    let totalSentences = 0;

    paragraphTexts.forEach((paragraphText, paragraphIndex) => {
      const sentenceTexts = parseSentences(paragraphText);
      const sentences: ParsedSentence[] = sentenceTexts.map((sentenceText, sentenceIndex) => ({
        content: sentenceText,
        position: sentenceIndex
      }));

      paragraphs.push({
        content: paragraphText,
        position: paragraphIndex,
        sentences
      });

      totalSentences += sentences.length;
    });

    return {
      success: true,
      parsed: {
        paragraphs,
        totalParagraphs: paragraphs.length,
        totalSentences
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Parsing failed'
    };
  }
}

/**
 * Store parsed paragraphs in database
 */
export async function storeParagraphs(
  documentId: string,
  userId: string,
  paragraphs: ParsedParagraph[]
): Promise<{ success: boolean; paragraphs?: Paragraph[]; error?: string }> {
  try {
    const paragraphRecords = paragraphs.map(p => ({
      document_id: documentId,
      user_id: userId,
      content: p.content,
      position: p.position
    }));

    logger.debug({ documentId, userId, recordCount: paragraphRecords.length }, '💾 Storing paragraphs with documentId and userId');
    logger.debug({ firstRecord: paragraphRecords[0] }, '💾 First paragraph record');

    const { data, error } = await supabase
      .from('paragraphs')
      .insert(paragraphRecords)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, paragraphs: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store paragraphs'
    };
  }
}

/**
 * Store parsed sentences in database
 */
export async function storeSentences(
  paragraphsData: { parsed: ParsedParagraph; stored: Paragraph }[]
): Promise<{ success: boolean; sentences?: Sentence[]; error?: string }> {
  try {
    // Type for sentence insert records - matches database schema
    interface SentenceInsert {
      document_id: string;
      paragraph_id: string;
      user_id: string;
      content: string;
      position: number;
      start_offset: number;
      end_offset: number;
    }

    const sentenceRecords: SentenceInsert[] = [];

    paragraphsData.forEach(({ parsed, stored }) => {
      parsed.sentences.forEach(sentence => {
        sentenceRecords.push({
          document_id: stored.document_id,
          paragraph_id: stored.id,
          user_id: stored.user_id,
          content: sentence.content,
          position: sentence.position,
          start_offset: 0, // TODO: Calculate actual offsets from text content
          end_offset: sentence.content.length
        });
      });
    });

    logger.debug({ firstRecord: sentenceRecords[0] }, '💾 Storing sentences, first record');

    const { data, error } = await supabase
      .from('sentences')
      .insert(sentenceRecords)
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, sentences: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store sentences'
    };
  }
}

/**
 * Store complete parsed document in database
 */
export async function storeParseDocument(
  documentId: string,
  userId: string,
  parsed: ParsedDocument
): Promise<StorageResult> {
  try {
    // Store paragraphs
    const paragraphResult = await storeParagraphs(documentId, userId, parsed.paragraphs);
    if (!paragraphResult.success || !paragraphResult.paragraphs) {
      return { success: false, error: paragraphResult.error };
    }

    // Map parsed paragraphs to stored paragraphs
    const paragraphsData = parsed.paragraphs.map((parsedPara, index) => ({
      parsed: parsedPara,
      stored: paragraphResult.paragraphs![index]
    }));

    // Store sentences
    const sentenceResult = await storeSentences(paragraphsData);
    if (!sentenceResult.success) {
      return { success: false, error: sentenceResult.error };
    }

    return {
      success: true,
      paragraphs: paragraphResult.paragraphs,
      sentences: sentenceResult.sentences
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store parsed document'
    };
  }
}
