/**
 * Unit tests for JSON citation export
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { exportJSON } from '../../../src/services/citation/json';
import type { CitationMetadata, CitationExport } from '../../../src/services/citation/types';

describe('JSON Export', () => {
  let mockDate: Date;

  beforeEach(() => {
    mockDate = new Date('2024-11-10T12:00:00Z');
    vi.setSystemTime(mockDate);
  });

  describe('Basic Export', () => {
    it('should export single citation', () => {
      const citations = [{ text: 'This is a quote', note: 'My note' }];
      const metadata: CitationMetadata[] = [
        {
          type: 'article',
          author: 'Smith, John',
          title: 'Test Article',
          year: 2023,
          journal: 'Test Journal',
        },
      ];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed.format).toBe('json');
      expect(parsed.citations).toHaveLength(1);
      expect(parsed.citations[0].type).toBe('article');
      expect(parsed.citations[0].metadata.author).toBe('Smith, John');
      expect(parsed.citations[0].text).toBe('This is a quote');
      expect(parsed.citations[0].note).toBe('My note');
    });

    it('should export multiple citations', () => {
      const citations = [
        { text: 'Quote 1', note: 'Note 1' },
        { text: 'Quote 2', note: 'Note 2' },
        { text: 'Quote 3' },
      ];
      const metadata: CitationMetadata[] = [
        { type: 'article', title: 'Article 1', year: 2023 },
        { type: 'book', title: 'Book 1', year: 2024 },
        { type: 'website', title: 'Website 1', year: 2025 },
      ];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed.citations).toHaveLength(3);
      expect(parsed.citations[0].type).toBe('article');
      expect(parsed.citations[1].type).toBe('book');
      expect(parsed.citations[2].type).toBe('website');
    });
  });

  describe('Document Info', () => {
    it('should include document info when provided', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [{ title: 'Article' }];
      const documentInfo = {
        title: 'My Document',
        author: 'Document Author',
        date: '2024-11-10',
      };

      const result = exportJSON(citations, metadata, documentInfo);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed.source.title).toBe('My Document');
      expect(parsed.source.author).toBe('Document Author');
      expect(parsed.source.date).toBe('2024-11-10');
    });

    it('should use default title when document info missing', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [{ title: 'Article' }];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed.source.title).toBe('Untitled Document');
      expect(parsed.source.author).toBeUndefined();
    });
  });

  describe('Metadata Fields', () => {
    it('should include export metadata', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [{ title: 'Article' }];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed.metadata.exportDate).toBe(mockDate.toISOString());
      expect(parsed.metadata.citationCount).toBe(1);
      expect(parsed.metadata.version).toBe('1.0');
    });

    it('should have correct citation count for multiple citations', () => {
      const citations = [{ text: 'Q1' }, { text: 'Q2' }, { text: 'Q3' }];
      const metadata: CitationMetadata[] = [{}, {}, {}];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed.metadata.citationCount).toBe(3);
    });
  });

  describe('Citation Metadata', () => {
    it('should include all metadata fields', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          type: 'article',
          title: 'Test Article',
          author: ['Smith, John', 'Doe, Jane'],
          editor: ['Editor, First'],
          year: 2023,
          journal: 'Journal Name',
          volume: 10,
          issue: 3,
          pages: '123-145',
          publisher: 'Publisher',
          location: 'New York',
          doi: '10.1234/test',
          url: 'https://example.com',
          accessDate: '2024-11-10',
          isbn: '978-3-16-148410-0',
          edition: '2nd',
          note: 'Additional note',
        },
      ];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);
      const citation = parsed.citations[0].metadata;

      expect(citation.title).toBe('Test Article');
      expect(citation.author).toEqual(['Smith, John', 'Doe, Jane']);
      expect(citation.editor).toEqual(['Editor, First']);
      expect(citation.year).toBe(2023);
      expect(citation.journal).toBe('Journal Name');
      expect(citation.volume).toBe(10);
      expect(citation.issue).toBe(3);
      expect(citation.pages).toBe('123-145');
      expect(citation.publisher).toBe('Publisher');
      expect(citation.location).toBe('New York');
      expect(citation.doi).toBe('10.1234/test');
      expect(citation.url).toBe('https://example.com');
      expect(citation.accessDate).toBe('2024-11-10');
      expect(citation.isbn).toBe('978-3-16-148410-0');
      expect(citation.edition).toBe('2nd');
      expect(citation.note).toBe('Additional note');
    });

    it('should handle minimal metadata', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [{ title: 'Just Title' }];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed.citations[0].metadata.title).toBe('Just Title');
      expect(parsed.citations[0].metadata.author).toBeUndefined();
    });

    it('should use default metadata for missing data', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed.citations[0].type).toBe('other');
      expect(parsed.citations[0].metadata.title).toBe('Untitled');
    });
  });

  describe('JSON Structure', () => {
    it('should be valid JSON', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [{ title: 'Article' }];

      const result = exportJSON(citations, metadata);

      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should be pretty-printed with indentation', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [{ title: 'Article' }];

      const result = exportJSON(citations, metadata);

      expect(result).toContain('\n  ');
      expect(result).toContain('\n    ');
    });

    it('should have correct top-level structure', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [{ title: 'Article' }];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed).toHaveProperty('format');
      expect(parsed).toHaveProperty('source');
      expect(parsed).toHaveProperty('citations');
      expect(parsed).toHaveProperty('metadata');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty citations array', () => {
      const citations: Array<{ text: string; note?: string }> = [];
      const metadata: CitationMetadata[] = [];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed.citations).toHaveLength(0);
      expect(parsed.metadata.citationCount).toBe(0);
    });

    it('should handle citations without notes', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [{ title: 'Article' }];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed.citations[0].note).toBeUndefined();
    });

    it('should handle special characters in text', () => {
      const citations = [{ text: 'Quote with "quotes" and \\backslash' }];
      const metadata: CitationMetadata[] = [{ title: 'Article' }];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed.citations[0].text).toBe('Quote with "quotes" and \\backslash');
    });

    it('should handle unicode characters', () => {
      const citations = [{ text: 'Quote with émojis 🎉 and ümlaut' }];
      const metadata: CitationMetadata[] = [
        {
          author: 'Müller, Hans',
          title: 'Über die Théorie',
        },
      ];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed.citations[0].text).toBe('Quote with émojis 🎉 and ümlaut');
      expect(parsed.citations[0].metadata.author).toBe('Müller, Hans');
    });
  });

  describe('Type Safety', () => {
    it('should export correct citation types', () => {
      const citations = [
        { text: 'Q1' },
        { text: 'Q2' },
        { text: 'Q3' },
        { text: 'Q4' },
        { text: 'Q5' },
        { text: 'Q6' },
        { text: 'Q7' },
      ];
      const metadata: CitationMetadata[] = [
        { type: 'article' },
        { type: 'book' },
        { type: 'chapter' },
        { type: 'conference' },
        { type: 'thesis' },
        { type: 'website' },
        { type: 'other' },
      ];

      const result = exportJSON(citations, metadata);
      const parsed: CitationExport = JSON.parse(result);

      expect(parsed.citations[0].type).toBe('article');
      expect(parsed.citations[1].type).toBe('book');
      expect(parsed.citations[2].type).toBe('chapter');
      expect(parsed.citations[3].type).toBe('conference');
      expect(parsed.citations[4].type).toBe('thesis');
      expect(parsed.citations[5].type).toBe('website');
      expect(parsed.citations[6].type).toBe('other');
    });
  });
});
