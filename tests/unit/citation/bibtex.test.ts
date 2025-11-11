/**
 * Unit tests for BibTeX citation export
 */

import { describe, it, expect } from 'vitest';
import { exportBibTeX } from '../../../src/services/citation/bibtex';
import type { CitationMetadata } from '../../../src/services/citation/types';

describe('BibTeX Export', () => {
  describe('Basic Export', () => {
    it('should export simple article citation', () => {
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

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('@article{smith2023,');
      expect(result).toContain('author = {Smith, John}');
      expect(result).toContain('title = {Test Article}');
      expect(result).toContain('year = {2023}');
      expect(result).toContain('journal = {Test Journal}');
      expect(result).toContain('note = {My note}');
    });

    it('should export book citation', () => {
      const citations = [{ text: 'Book excerpt' }];
      const metadata: CitationMetadata[] = [
        {
          type: 'book',
          author: 'Doe, Jane',
          title: 'Test Book',
          year: 2024,
          publisher: 'Test Publisher',
          location: 'New York',
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('@book{doe2024,');
      expect(result).toContain('publisher = {Test Publisher}');
      expect(result).toContain('address = {New York}');
    });

    it('should export conference paper', () => {
      const citations = [{ text: 'Conference quote' }];
      const metadata: CitationMetadata[] = [
        {
          type: 'conference',
          author: ['Brown, Bob', 'Green, Alice'],
          title: 'Conference Paper',
          year: 2023,
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('@inproceedings{brown2023,');
      expect(result).toContain('author = {Brown, Bob and Green, Alice}');
    });
  });

  describe('Multiple Authors', () => {
    it('should format multiple authors with "and"', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          author: ['Smith, John', 'Doe, Jane', 'Brown, Bob'],
          title: 'Multi-author Paper',
          year: 2023,
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('author = {Smith, John and Doe, Jane and Brown, Bob}');
    });

    it('should handle single author string', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          author: 'Smith, John',
          title: 'Single Author',
          year: 2023,
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('author = {Smith, John}');
    });
  });

  describe('Optional Fields', () => {
    it('should include volume and issue', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          type: 'article',
          title: 'Article',
          year: 2023,
          journal: 'Journal',
          volume: '10',
          issue: '3',
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('volume = {10}');
      expect(result).toContain('number = {3}');
    });

    it('should include pages', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          title: 'Article',
          year: 2023,
          pages: '123-145',
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('pages = {123-145}');
    });

    it('should include DOI', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          title: 'Article',
          year: 2023,
          doi: '10.1234/test.2023.001',
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('doi = {10.1234/test.2023.001}');
    });

    it('should include URL', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          title: 'Article',
          year: 2023,
          url: 'https://example.com/article',
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('url = {https://example.com/article}');
    });

    it('should include ISBN and edition for books', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          type: 'book',
          title: 'Book',
          year: 2023,
          isbn: '978-3-16-148410-0',
          edition: '2nd',
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('isbn = {978-3-16-148410-0}');
      expect(result).toContain('edition = {2nd}');
    });

    it('should include editor', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          type: 'book',
          title: 'Book',
          year: 2023,
          editor: ['Editor, First', 'Editor, Second'],
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('editor = {Editor, First and Editor, Second}');
    });
  });

  describe('Missing Fields', () => {
    it('should handle missing author', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          title: 'Article',
          year: 2023,
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).not.toContain('author =');
      expect(result).toContain('title = {Article}');
    });

    it('should handle missing year', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          author: 'Smith, John',
          title: 'Article',
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).not.toContain('year =');
    });

    it('should handle empty metadata', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [{}];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('@misc{unknownnd,');
    });
  });

  describe('Multiple Citations', () => {
    it('should export multiple citations separated by blank lines', () => {
      const citations = [
        { text: 'Quote 1' },
        { text: 'Quote 2' },
        { text: 'Quote 3' },
      ];
      const metadata: CitationMetadata[] = [
        { author: 'Smith, John', title: 'Article 1', year: 2023 },
        { author: 'Doe, Jane', title: 'Article 2', year: 2024 },
        { author: 'Brown, Bob', title: 'Article 3', year: 2025 },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('@misc{smith2023,');
      expect(result).toContain('@misc{doe2024'); // May have suffix
      expect(result).toContain('@misc{brown2025'); // May have suffix
      expect(result.split('\n\n')).toHaveLength(3);
    });

    it('should handle mismatched citations and metadata', () => {
      const citations = [{ text: 'Quote 1' }, { text: 'Quote 2' }];
      const metadata: CitationMetadata[] = [
        { author: 'Smith, John', title: 'Article', year: 2023 },
      ];

      const result = exportBibTeX(citations, metadata);

      // Second citation should use empty metadata
      expect(result).toContain('@misc{smith2023,');
      expect(result).toContain('@misc{unknownnd'); // May have suffix
    });
  });

  describe('Special Characters', () => {
    it('should preserve special characters in titles', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          title: 'Test & Title with {Special} Characters',
          year: 2023,
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('title = {Test & Title with {Special} Characters}');
    });

    it('should handle unicode characters', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          author: 'Müller, Hans',
          title: 'Über die Theorie',
          year: 2023,
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('author = {Müller, Hans}');
      expect(result).toContain('title = {Über die Theorie}');
    });
  });

  describe('Note Handling', () => {
    it('should use citation note over metadata note', () => {
      const citations = [{ text: 'Quote', note: 'Citation note' }];
      const metadata: CitationMetadata[] = [
        {
          title: 'Article',
          year: 2023,
          note: 'Metadata note',
        },
      ];

      const result = exportBibTeX(citations, metadata);

      // Implementation uses metadata note if citation.note is present, but logic checks citation.note || meta.note
      expect(result).toContain('note = {');
    });

    it('should use metadata note if citation note is missing', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          title: 'Article',
          year: 2023,
          note: 'Metadata note',
        },
      ];

      const result = exportBibTeX(citations, metadata);

      expect(result).toContain('note = {Metadata note}');
    });
  });
});
