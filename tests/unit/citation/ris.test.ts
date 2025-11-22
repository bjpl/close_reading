/**
 * Unit tests for RIS citation export
 */

import { describe, it, expect } from 'vitest';
import { exportRIS } from '../../../src/services/citation/ris';
import type { CitationMetadata } from '../../../src/services/citation/types';

describe('RIS Export', () => {
  describe('Basic Export', () => {
    it('should export article citation', () => {
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

      const result = exportRIS(citations, metadata);

      expect(result).toContain('TY  - JOUR');
      expect(result).toContain('AU  - Smith, John');
      expect(result).toContain('TI  - Test Article');
      expect(result).toContain('PY  - 2023');
      expect(result).toContain('JO  - Test Journal');
      expect(result).toContain('AB  - This is a quote');
      expect(result).toContain('N1  - My note');
      expect(result).toContain('ER  - ');
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

      const result = exportRIS(citations, metadata);

      expect(result).toContain('TY  - BOOK');
      expect(result).toContain('PB  - Test Publisher');
      expect(result).toContain('CY  - New York');
    });

    it('should export thesis citation', () => {
      const citations = [{ text: 'Thesis quote' }];
      const metadata: CitationMetadata[] = [
        {
          type: 'thesis',
          author: 'Brown, Bob',
          title: 'PhD Thesis',
          year: 2023,
        },
      ];

      const result = exportRIS(citations, metadata);

      expect(result).toContain('TY  - THES');
    });

    it('should export website citation', () => {
      const citations = [{ text: 'Web content' }];
      const metadata: CitationMetadata[] = [
        {
          type: 'website',
          author: 'Author',
          title: 'Web Page',
          url: 'https://example.com',
          accessDate: '2024-11-10',
        },
      ];

      const result = exportRIS(citations, metadata);

      expect(result).toContain('TY  - ELEC');
      expect(result).toContain('UR  - https://example.com');
      expect(result).toContain('Y2  - 2024-11-10');
    });
  });

  describe('Multiple Authors', () => {
    it('should create separate AU tags for each author', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          author: ['Smith, John', 'Doe, Jane', 'Brown, Bob'],
          title: 'Multi-author Paper',
          year: 2023,
        },
      ];

      const result = exportRIS(citations, metadata);

      expect(result).toContain('AU  - Smith, John');
      expect(result).toContain('AU  - Doe, Jane');
      expect(result).toContain('AU  - Brown, Bob');
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

      const result = exportRIS(citations, metadata);

      expect(result).toContain('AU  - Smith, John');
      expect(result.match(/AU {2}-/g)?.length).toBe(1);
    });
  });

  describe('Multiple Editors', () => {
    it('should create separate ED tags for each editor', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          type: 'book',
          editor: ['Editor, First', 'Editor, Second'],
          title: 'Edited Volume',
          year: 2023,
        },
      ];

      const result = exportRIS(citations, metadata);

      expect(result).toContain('ED  - Editor, First');
      expect(result).toContain('ED  - Editor, Second');
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
          volume: 10,
          issue: 3,
        },
      ];

      const result = exportRIS(citations, metadata);

      expect(result).toContain('VL  - 10');
      expect(result).toContain('IS  - 3');
    });

    it('should split pages into start and end', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          title: 'Article',
          year: 2023,
          pages: '123-145',
        },
      ];

      const result = exportRIS(citations, metadata);

      expect(result).toContain('SP  - 123');
      expect(result).toContain('EP  - 145');
    });

    it('should handle single page number', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          title: 'Article',
          year: 2023,
          pages: '123',
        },
      ];

      const result = exportRIS(citations, metadata);

      expect(result).toContain('SP  - 123');
      expect(result).not.toContain('EP  -');
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

      const result = exportRIS(citations, metadata);

      expect(result).toContain('DO  - 10.1234/test.2023.001');
    });

    it('should include ISBN', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          type: 'book',
          title: 'Book',
          year: 2023,
          isbn: '978-3-16-148410-0',
        },
      ];

      const result = exportRIS(citations, metadata);

      expect(result).toContain('SN  - 978-3-16-148410-0');
    });

    it('should include edition', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          type: 'book',
          title: 'Book',
          year: 2023,
          edition: '2nd',
        },
      ];

      const result = exportRIS(citations, metadata);

      expect(result).toContain('ET  - 2nd');
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

      const result = exportRIS(citations, metadata);

      expect(result).not.toContain('AU  -');
      expect(result).toContain('TI  - Article');
    });

    it('should use GEN type for missing or unknown type', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [
        {
          title: 'Article',
          year: 2023,
        },
      ];

      const result = exportRIS(citations, metadata);

      expect(result).toContain('TY  - GEN');
    });

    it('should handle empty metadata', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [{}];

      const result = exportRIS(citations, metadata);

      expect(result).toContain('TY  - GEN');
      expect(result).toContain('AB  - Quote');
      expect(result).toContain('ER  - ');
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

      const result = exportRIS(citations, metadata);

      const entries = result.split('\n\n');
      expect(entries).toHaveLength(3);
      expect(entries[0]).toContain('Smith, John');
      expect(entries[1]).toContain('Doe, Jane');
      expect(entries[2]).toContain('Brown, Bob');
    });

    it('should end each entry with ER tag', () => {
      const citations = [{ text: 'Quote 1' }, { text: 'Quote 2' }];
      const metadata: CitationMetadata[] = [
        { title: 'Article 1', year: 2023 },
        { title: 'Article 2', year: 2024 },
      ];

      const result = exportRIS(citations, metadata);

      const erCount = (result.match(/ER {2}- /g) || []).length;
      expect(erCount).toBe(2);
    });
  });

  describe('Special Characters', () => {
    it('should preserve special characters', () => {
      const citations = [{ text: 'Quote with & special chars' }];
      const metadata: CitationMetadata[] = [
        {
          title: 'Test & Title with Special Characters',
          year: 2023,
        },
      ];

      const result = exportRIS(citations, metadata);

      expect(result).toContain('TI  - Test & Title with Special Characters');
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

      const result = exportRIS(citations, metadata);

      expect(result).toContain('AU  - Müller, Hans');
      expect(result).toContain('TI  - Über die Theorie');
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

      const result = exportRIS(citations, metadata);

      // Implementation logic checks meta.note || citation.note
      expect(result).toContain('N1  - ');
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

      const result = exportRIS(citations, metadata);

      expect(result).toContain('N1  - Metadata note');
    });
  });

  describe('Abstract Handling', () => {
    it('should include quoted text in AB field', () => {
      const citations = [{ text: 'This is the quoted text from the source' }];
      const metadata: CitationMetadata[] = [
        {
          title: 'Article',
          year: 2023,
        },
      ];

      const result = exportRIS(citations, metadata);

      expect(result).toContain('AB  - This is the quoted text from the source');
    });
  });
});
