/**
 * DocumentParserService Tests
 *
 * Unit tests for document parsing and text structure extraction
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DocumentParserService,
  type ParsedDocument,
} from '../../src/services/DocumentParserService';

describe('DocumentParserService', () => {
  let service: DocumentParserService;

  beforeEach(() => {
    service = new DocumentParserService();
  });

  describe('Text Parsing', () => {
    it('should parse plain text into paragraphs', () => {
      const text = `First paragraph text here.

Second paragraph with multiple sentences. This is the second sentence.

Third paragraph is shorter.`;

      const result = service.parseText(text);

      expect(result.paragraphs).toHaveLength(3);
      expect(result.paragraphs[0].text).toContain('First paragraph');
      expect(result.paragraphs[1].text).toContain('Second paragraph');
      expect(result.paragraphs[2].text).toContain('Third paragraph');
    });

    it('should extract sentences from paragraphs', () => {
      const text = `This is the first sentence. This is the second sentence. And here's the third!`;

      const result = service.parseText(text);

      expect(result.sentences.length).toBeGreaterThanOrEqual(3);
      expect(result.sentences[0].text).toContain('first sentence');
    });

    it('should handle abbreviations in sentence splitting', () => {
      const text = `Dr. Smith works at the lab. Mr. Jones is his colleague.`;

      const result = service.parseText(text);

      expect(result.sentences).toHaveLength(2);
      expect(result.sentences[0].text).toContain('Dr. Smith');
      expect(result.sentences[1].text).toContain('Mr. Jones');
    });

    it('should assign sequential IDs to paragraphs', () => {
      const text = `Para 1.

Para 2.

Para 3.`;

      const result = service.parseText(text);

      expect(result.paragraphs[0].id).toBe('p-0000');
      expect(result.paragraphs[1].id).toBe('p-0001');
      expect(result.paragraphs[2].id).toBe('p-0002');
    });

    it('should assign sequential IDs to sentences', () => {
      const text = `First sentence. Second sentence.

Third sentence.`;

      const result = service.parseText(text);

      expect(result.sentences[0].id).toBe('s-000000');
      expect(result.sentences[1].id).toBe('s-000001');
      expect(result.sentences[2].id).toBe('s-000002');
    });
  });

  describe('Metadata Extraction', () => {
    it('should calculate word count', () => {
      const text = `This is a test. It has several words.`;

      const result = service.parseText(text);

      expect(result.metadata.wordCount).toBe(8);
    });

    it('should calculate character count', () => {
      const text = `Hello world`;

      const result = service.parseText(text);

      expect(result.metadata.characterCount).toBe(11);
    });

    it('should set format metadata', () => {
      const text = `Test content`;

      const result = service.parseText(text);

      expect(result.metadata.format).toBe('txt');
    });
  });

  describe('Parser Options', () => {
    it('should respect minimum paragraph length', () => {
      const text = `Short.

This is a longer paragraph with more content to meet the minimum length requirement.

Another short one.`;

      const result = service.parseText(text, { minParagraphLength: 30 });

      expect(result.paragraphs).toHaveLength(1);
      expect(result.paragraphs[0].text).toContain('longer paragraph');
    });

    it('should preserve whitespace when option is set', () => {
      const text = `Text  with    multiple   spaces`;

      const withWhitespace = service.parseText(text, { preserveWhitespace: true });
      const withoutWhitespace = service.parseText(text, { preserveWhitespace: false });

      expect(withWhitespace.rawText).toContain('  ');
      expect(withoutWhitespace.rawText).not.toContain('  ');
    });
  });

  describe('Text Structure', () => {
    it('should link sentences to their paragraphs', () => {
      const text = `First paragraph. With two sentences.

Second paragraph here.`;

      const result = service.parseText(text);

      const para1Sentences = result.sentences.filter(
        s => s.paragraphId === result.paragraphs[0].id
      );
      const para2Sentences = result.sentences.filter(
        s => s.paragraphId === result.paragraphs[1].id
      );

      expect(para1Sentences).toHaveLength(2);
      expect(para2Sentences).toHaveLength(1);
    });

    it('should maintain sentence order within paragraphs', () => {
      const text = `First. Second. Third.`;

      const result = service.parseText(text);

      expect(result.sentences[0].order).toBe(0);
      expect(result.sentences[1].order).toBe(1);
      expect(result.sentences[2].order).toBe(2);
    });

    it('should track paragraph offsets', () => {
      const text = `First paragraph.

Second paragraph.`;

      const result = service.parseText(text);

      expect(result.paragraphs[0].metadata?.startOffset).toBe(0);
      expect(result.paragraphs[0].metadata?.endOffset).toBeGreaterThan(0);
      expect(result.paragraphs[1].metadata?.startOffset).toBeGreaterThan(
        result.paragraphs[0].metadata?.endOffset
      );
    });
  });

  describe('Document Validation', () => {
    it('should validate a well-formed document', () => {
      const text = `Test paragraph.

Another paragraph.`;

      const doc = service.parseText(text);
      const validation = service.validateDocument(doc);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing paragraphs', () => {
      const doc: ParsedDocument = {
        metadata: { format: 'txt' },
        paragraphs: [],
        sentences: [],
        rawText: 'test',
      };

      const validation = service.validateDocument(doc);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No paragraphs found');
    });

    it('should detect missing sentences', () => {
      const doc: ParsedDocument = {
        metadata: { format: 'txt' },
        paragraphs: [
          {
            id: 'p-0000',
            text: 'Test',
            order: 0,
            sentences: [],
          },
        ],
        sentences: [],
        rawText: 'Test',
      };

      const validation = service.validateDocument(doc);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No sentences found');
    });

    it('should detect empty text content', () => {
      const doc: ParsedDocument = {
        metadata: { format: 'txt' },
        paragraphs: [],
        sentences: [],
        rawText: '',
      };

      const validation = service.validateDocument(doc);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No text content');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const result = service.parseText('');

      expect(result.paragraphs).toHaveLength(0);
      expect(result.sentences).toHaveLength(0);
      expect(result.rawText).toBe('');
    });

    it('should handle single sentence', () => {
      const text = 'Single sentence.';

      const result = service.parseText(text);

      expect(result.paragraphs).toHaveLength(1);
      expect(result.sentences).toHaveLength(1);
    });

    it('should handle text with no punctuation', () => {
      const text = `Paragraph without ending punctuation

Another paragraph`;

      const result = service.parseText(text);

      expect(result.paragraphs.length).toBeGreaterThan(0);
    });

    it('should normalize different line endings', () => {
      const textWithCRLF = 'Line 1\r\nLine 2\r\n';
      const textWithLF = 'Line 1\nLine 2\n';

      const result1 = service.parseText(textWithCRLF);
      const result2 = service.parseText(textWithLF);

      expect(result1.rawText).toBe(result2.rawText);
    });
  });
});
