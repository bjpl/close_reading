/**
 * Unit tests for plain text citation formatters (MLA, APA, Chicago)
 */

import { describe, it, expect } from 'vitest';
import { formatMLACitation } from '../../../src/services/citation/formatters/mla';
import { formatAPACitation } from '../../../src/services/citation/formatters/apa';
import { formatChicagoCitation } from '../../../src/services/citation/formatters/chicago';
import type { CitationMetadata } from '../../../src/services/citation/types';

describe('Citation Formatters', () => {
  describe('MLA Formatter', () => {
    it('should format basic MLA citation', () => {
      const citation = { text: 'This is a quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Test Article',
        journal: 'Test Journal',
        year: 2023,
      };

      const result = formatMLACitation(citation, metadata, 'Document Title');

      expect(result).toContain('Smith, John');
      expect(result).toContain('"Test Article"');
      expect(result).toContain('Test Journal');
      expect(result).toContain('2023');
      expect(result[result.length - 1]).toBe('.');
    });

    it('should include pages with pp. prefix', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article',
        year: 2023,
        pages: '123-145',
      };

      const result = formatMLACitation(citation, metadata, 'Document');

      expect(result).toContain('pp. 123-145');
    });

    it('should use document title when journal missing', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article',
        year: 2023,
      };

      const result = formatMLACitation(citation, metadata, 'My Document');

      expect(result).toContain('My Document');
    });

    it('should use truncated quote as title when title missing', () => {
      const citation = { text: 'This is a very long quote that should be truncated to 50 characters' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        year: 2023,
      };

      const result = formatMLACitation(citation, metadata, 'Document');

      expect(result).toContain('"This is a very long quote that should be truncated..."');
    });

    it('should include citation note at the end', () => {
      const citation = { text: 'Quote', note: 'Important annotation' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article',
        year: 2023,
      };

      const result = formatMLACitation(citation, metadata, 'Document');

      expect(result).toContain('Important annotation');
    });

    it('should handle multiple authors', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        author: ['Smith, John', 'Doe, Jane', 'Brown, Bob'],
        title: 'Article',
        year: 2023,
      };

      const result = formatMLACitation(citation, metadata, 'Document');

      expect(result).toContain('Smith, John, Doe, Jane, Brown, Bob');
    });

    it('should handle minimal metadata', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {};

      const result = formatMLACitation(citation, metadata, 'Document');

      expect(result).toContain('"Quote..."');
      expect(result).toContain('Document');
    });
  });

  describe('APA Formatter', () => {
    it('should format basic APA citation', () => {
      const citation = { text: 'This is a quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Test Article',
        journal: 'Test Journal',
        year: 2023,
      };

      const result = formatAPACitation(citation, metadata, 'Document Title');

      expect(result).toContain('Smith, John');
      expect(result).toContain('(2023)');
      expect(result).toContain('Test Article');
      expect(result).toContain('Test Journal');
      expect(result[result.length - 1]).toBe('.');
    });

    it('should format journal with volume and issue', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article',
        journal: 'Journal',
        year: 2023,
        volume: 10,
        issue: 3,
        pages: '123-145',
      };

      const result = formatAPACitation(citation, metadata, 'Document');

      expect(result).toContain('Journal, 10(3), 123-145');
    });

    it('should format journal with volume only', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        journal: 'Journal',
        volume: 10,
      };

      const result = formatAPACitation(citation, metadata, 'Document');

      expect(result).toContain('Journal, 10');
    });

    it('should include DOI link', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article',
        year: 2023,
        doi: '10.1234/test.2023.001',
      };

      const result = formatAPACitation(citation, metadata, 'Document');

      expect(result).toContain('https://doi.org/10.1234/test.2023.001');
    });

    it('should use URL if DOI missing', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article',
        year: 2023,
        url: 'https://example.com/article',
      };

      const result = formatAPACitation(citation, metadata, 'Document');

      expect(result).toContain('https://example.com/article');
      expect(result).not.toContain('doi.org');
    });

    it('should use document title when journal missing', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article',
        year: 2023,
      };

      const result = formatAPACitation(citation, metadata, 'My Document');

      expect(result).toContain('My Document');
    });

    it('should use truncated quote as title when title missing', () => {
      const citation = { text: 'This is a very long quote that should be truncated' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        year: 2023,
      };

      const result = formatAPACitation(citation, metadata, 'Document');

      expect(result).toContain('"This is a very long quote that should be truncated..."');
    });

    it('should include citation note', () => {
      const citation = { text: 'Quote', note: 'Important note' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article',
        year: 2023,
      };

      const result = formatAPACitation(citation, metadata, 'Document');

      expect(result).toContain('Important note');
    });
  });

  describe('Chicago Formatter', () => {
    it('should format basic Chicago citation', () => {
      const citation = { text: 'This is a quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Test Article',
        journal: 'Test Journal',
        year: 2023,
      };

      const result = formatChicagoCitation(citation, metadata, 1, 'Document');

      expect(result.startsWith('1.')).toBe(true);
      expect(result).toContain('Smith, John');
      expect(result).toContain('"Test Article"');
      expect(result).toContain('Test Journal');
      expect(result).toContain('(2023)');
      expect(result[result.length - 1]).toBe('.');
    });

    it('should include note number', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article',
        year: 2023,
      };

      const result1 = formatChicagoCitation(citation, metadata, 1, 'Document');
      const result2 = formatChicagoCitation(citation, metadata, 5, 'Document');
      const result3 = formatChicagoCitation(citation, metadata, 42, 'Document');

      expect(result1.startsWith('1.')).toBe(true);
      expect(result2.startsWith('5.')).toBe(true);
      expect(result3.startsWith('42.')).toBe(true);
    });

    it('should format journal with volume and issue', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article',
        journal: 'Journal',
        year: 2023,
        volume: 10,
        issue: 3,
        pages: '123-145',
      };

      const result = formatChicagoCitation(citation, metadata, 1, 'Document');

      expect(result).toContain('Journal 10, no. 3');
      expect(result).toContain('(2023)');
      expect(result).toContain('123-145');
    });

    it('should format journal with volume only', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        journal: 'Journal',
        volume: 10,
      };

      const result = formatChicagoCitation(citation, metadata, 1, 'Document');

      expect(result).toContain('Journal 10');
    });

    it('should use document title when journal missing', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article',
        year: 2023,
      };

      const result = formatChicagoCitation(citation, metadata, 1, 'My Document');

      expect(result).toContain('My Document');
    });

    it('should use truncated quote as title when title missing', () => {
      const citation = { text: 'This is a very long quote that should be truncated' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        year: 2023,
      };

      const result = formatChicagoCitation(citation, metadata, 1, 'Document');

      expect(result).toContain('"This is a very long quote that should be truncated..."');
    });

    it('should include citation note', () => {
      const citation = { text: 'Quote', note: 'See also Chapter 5' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article',
        year: 2023,
      };

      const result = formatChicagoCitation(citation, metadata, 1, 'Document');

      expect(result).toContain('See also Chapter 5');
    });

    it('should handle pages without journal', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article',
        year: 2023,
        pages: '42',
      };

      const result = formatChicagoCitation(citation, metadata, 1, 'Document');

      expect(result).toContain('42');
    });
  });

  describe('Formatter Comparisons', () => {
    it('should format same citation differently in each style', () => {
      const citation = { text: 'Quote' };
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        title: 'Article Title',
        journal: 'Journal Name',
        year: 2023,
        pages: '100-110',
      };

      const mla = formatMLACitation(citation, metadata, 'Document');
      const apa = formatAPACitation(citation, metadata, 'Document');
      const chicago = formatChicagoCitation(citation, metadata, 1, 'Document');

      // MLA uses "pp."
      expect(mla).toContain('pp. 100-110');
      expect(apa).not.toContain('pp.');
      expect(chicago).not.toContain('pp.');

      // APA uses parentheses for year
      expect(apa).toContain('(2023)');
      expect(mla).not.toContain('(2023)');
      expect(chicago).toContain('(2023)');

      // Chicago has note number
      expect(chicago.startsWith('1.')).toBe(true);
      expect(mla.startsWith('1.')).toBe(false);
      expect(apa.startsWith('1.')).toBe(false);

      // All should end with period
      expect(mla[mla.length - 1]).toBe('.');
      expect(apa[apa.length - 1]).toBe('.');
      expect(chicago[chicago.length - 1]).toBe('.');
    });
  });

  describe('Special Characters', () => {
    it('should handle special characters in all formatters', () => {
      const citation = { text: 'Quote with & special chars' };
      const metadata: CitationMetadata = {
        author: 'Müller, Hans',
        title: 'Title & Subtitle: A Study',
        year: 2023,
      };

      const mla = formatMLACitation(citation, metadata, 'Document');
      const apa = formatAPACitation(citation, metadata, 'Document');
      const chicago = formatChicagoCitation(citation, metadata, 1, 'Document');

      expect(mla).toContain('Müller, Hans');
      expect(mla).toContain('Title & Subtitle: A Study');

      expect(apa).toContain('Müller, Hans');
      expect(apa).toContain('Title & Subtitle: A Study');

      expect(chicago).toContain('Müller, Hans');
      expect(chicago).toContain('Title & Subtitle: A Study');
    });
  });
});
