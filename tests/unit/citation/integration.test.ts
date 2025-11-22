/**
 * Integration tests for complete citation export workflows
 * Tests the main exportCitations function and end-to-end scenarios
 */

import { describe, it, expect } from 'vitest';
import {
  exportCitations,
  exportPlainText,
  getMimeType,
  getFileExtension,
} from '../../../src/services/citation';
import type { CitationMetadata, CitationExportFormat } from '../../../src/services/citation/types';

describe('Citation Export Integration', () => {
  const sampleCitations = [
    { text: 'First quote from the document', note: 'Important point' },
    { text: 'Second quote about methodology', note: 'See also chapter 3' },
    { text: 'Third quote with findings' },
  ];

  const sampleMetadata: CitationMetadata[] = [
    {
      type: 'article',
      author: ['Smith, John', 'Doe, Jane'],
      title: 'Research Methods in Digital Humanities',
      journal: 'Digital Studies',
      year: 2023,
      volume: 15,
      issue: 2,
      pages: '123-145',
      doi: '10.1234/ds.2023.001',
    },
    {
      type: 'book',
      author: 'Brown, Bob',
      title: 'Advanced Text Analysis',
      publisher: 'Academic Press',
      location: 'New York',
      year: 2024,
      edition: '3rd',
      isbn: '978-3-16-148410-0',
    },
    {
      type: 'website',
      author: 'Green, Alice',
      title: 'Introduction to Close Reading',
      url: 'https://example.com/close-reading',
      accessDate: '2024-11-10',
      year: 2024,
    },
  ];

  describe('Main Export Function', () => {
    it('should export to BibTeX format', () => {
      const result = exportCitations(sampleCitations, sampleMetadata, 'bibtex');

      expect(result).toContain('@article{smith2023,');
      expect(result).toContain('@book{brown2024'); // May have suffix
      expect(result).toContain('@misc{green2024'); // May have suffix
      expect(result).toContain('Smith, John and Doe, Jane');
    });

    it('should export to RIS format', () => {
      const result = exportCitations(sampleCitations, sampleMetadata, 'ris');

      expect(result).toContain('TY  - JOUR');
      expect(result).toContain('TY  - BOOK');
      expect(result).toContain('TY  - ELEC');
      expect(result).toContain('ER  - ');
    });

    it('should export to JSON format', () => {
      const result = exportCitations(sampleCitations, sampleMetadata, 'json');
      const parsed = JSON.parse(result);

      expect(parsed.format).toBe('json');
      expect(parsed.citations).toHaveLength(3);
      expect(parsed.metadata.citationCount).toBe(3);
    });

    it('should export to MLA format', () => {
      const result = exportCitations(sampleCitations, sampleMetadata, 'mla');

      expect(result).toContain('Smith, John, Doe, Jane');
      expect(result).toContain('"Research Methods in Digital Humanities"');
      expect(result).toContain('pp. 123-145');
    });

    it('should export to APA format', () => {
      const result = exportCitations(sampleCitations, sampleMetadata, 'apa');

      expect(result).toContain('(2023)');
      expect(result).toContain('https://doi.org/10.1234/ds.2023.001');
    });

    it('should export to Chicago format', () => {
      const result = exportCitations(sampleCitations, sampleMetadata, 'chicago');

      expect(result).toContain('1.');
      expect(result).toContain('2.');
      expect(result).toContain('3.');
      expect(result).toContain('no. 2');
    });

    it('should throw error for unsupported format', () => {
      expect(() => {
        exportCitations(sampleCitations, sampleMetadata, 'invalid' as CitationExportFormat);
      }).toThrow('Unsupported export format: invalid');
    });
  });

  describe('Document Info Handling', () => {
    it('should include document info in JSON export', () => {
      const documentInfo = {
        title: 'My Research Document',
        author: 'Researcher Name',
        date: '2024-11-10',
      };

      const result = exportCitations(sampleCitations, sampleMetadata, 'json', documentInfo);
      const parsed = JSON.parse(result);

      expect(parsed.source.title).toBe('My Research Document');
      expect(parsed.source.author).toBe('Researcher Name');
      expect(parsed.source.date).toBe('2024-11-10');
    });

    it('should use document title in plain text formats', () => {
      const documentInfo = { title: 'Digital Humanities Reader' };

      const mla = exportCitations(sampleCitations, [{}], 'mla', documentInfo);
      const apa = exportCitations(sampleCitations, [{}], 'apa', documentInfo);
      const chicago = exportCitations(sampleCitations, [{}], 'chicago', documentInfo);

      expect(mla).toContain('Digital Humanities Reader');
      expect(apa).toContain('Digital Humanities Reader');
      expect(chicago).toContain('Digital Humanities Reader');
    });
  });

  describe('Plain Text Export Function', () => {
    it('should export MLA through exportPlainText', () => {
      const result = exportPlainText(sampleCitations, sampleMetadata, 'mla', 'Test Document');

      expect(result).toContain('Smith, John, Doe, Jane');
      expect(result).toContain('"Research Methods in Digital Humanities"');
    });

    it('should export APA through exportPlainText', () => {
      const result = exportPlainText(sampleCitations, sampleMetadata, 'apa', 'Test Document');

      expect(result).toContain('(2023)');
      expect(result).toContain('(2024)');
    });

    it('should export Chicago through exportPlainText', () => {
      const result = exportPlainText(sampleCitations, sampleMetadata, 'chicago', 'Test Document');

      expect(result).toContain('1.');
      expect(result).toContain('2.');
      expect(result).toContain('3.');
    });

    it('should separate multiple citations with blank lines', () => {
      const result = exportPlainText(sampleCitations, sampleMetadata, 'mla', 'Document');

      const sections = result.split('\n\n');
      expect(sections).toHaveLength(3);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed citation types correctly', () => {
      const citations = [
        { text: 'Article quote' },
        { text: 'Book quote' },
        { text: 'Conference quote' },
        { text: 'Thesis quote' },
        { text: 'Web quote' },
      ];

      const metadata: CitationMetadata[] = [
        { type: 'article', title: 'Article', author: 'Author A', year: 2023 },
        { type: 'book', title: 'Book', author: 'Author B', year: 2023 },
        { type: 'conference', title: 'Paper', author: 'Author C', year: 2023 },
        { type: 'thesis', title: 'Thesis', author: 'Author D', year: 2023 },
        { type: 'website', title: 'Site', author: 'Author E', year: 2023 },
      ];

      const bibtex = exportCitations(citations, metadata, 'bibtex');
      expect(bibtex).toContain('@article');
      expect(bibtex).toContain('@book');
      expect(bibtex).toContain('@inproceedings');
      expect(bibtex).toContain('@phdthesis');
      expect(bibtex).toContain('@misc');

      const ris = exportCitations(citations, metadata, 'ris');
      expect(ris).toContain('TY  - JOUR');
      expect(ris).toContain('TY  - BOOK');
      expect(ris).toContain('TY  - CONF');
      expect(ris).toContain('TY  - THES');
      expect(ris).toContain('TY  - ELEC');
    });

    it('should handle large number of citations', () => {
      const manyCitations = Array.from({ length: 100 }, (_, i) => ({
        text: `Quote ${i + 1}`,
      }));

      const manyMetadata: CitationMetadata[] = Array.from({ length: 100 }, (_, i) => ({
        type: 'article' as const,
        author: `Author ${i + 1}`,
        title: `Article ${i + 1}`,
        year: 2023,
      }));

      const bibtex = exportCitations(manyCitations, manyMetadata, 'bibtex');
      const ris = exportCitations(manyCitations, manyMetadata, 'ris');
      const json = exportCitations(manyCitations, manyMetadata, 'json');

      // Count entries
      const bibtexEntries = (bibtex.match(/@article/g) || []).length;
      const risEntries = (ris.match(/ER {2}- /g) || []).length;
      const jsonData = JSON.parse(json);

      expect(bibtexEntries).toBe(100);
      expect(risEntries).toBe(100);
      expect(jsonData.citations).toHaveLength(100);
    });

    it('should preserve all metadata through export cycle', () => {
      const fullMetadata: CitationMetadata = {
        type: 'article',
        title: 'Complete Article',
        author: ['Smith, John', 'Doe, Jane'],
        editor: ['Editor, First'],
        year: 2023,
        journal: 'Journal Name',
        volume: 10,
        issue: 3,
        pages: '100-120',
        publisher: 'Publisher',
        location: 'Location',
        doi: '10.1234/test',
        url: 'https://example.com',
        accessDate: '2024-11-10',
        isbn: '978-3-16-148410-0',
        edition: '2nd',
        note: 'Additional note',
      };

      const citations = [{ text: 'Quote', note: 'Citation note' }];

      // Test JSON preserves everything
      const json = exportCitations(citations, [fullMetadata], 'json');
      const parsed = JSON.parse(json);
      const exportedMeta = parsed.citations[0].metadata;

      expect(exportedMeta.title).toBe('Complete Article');
      expect(exportedMeta.author).toEqual(['Smith, John', 'Doe, Jane']);
      expect(exportedMeta.editor).toEqual(['Editor, First']);
      expect(exportedMeta.year).toBe(2023);
      expect(exportedMeta.journal).toBe('Journal Name');
      expect(exportedMeta.volume).toBe(10);
      expect(exportedMeta.issue).toBe(3);
      expect(exportedMeta.pages).toBe('100-120');
      expect(exportedMeta.doi).toBe('10.1234/test');
    });
  });

  describe('Format Utilities', () => {
    it('should return correct MIME types for all formats', () => {
      expect(getMimeType('bibtex')).toBe('application/x-bibtex');
      expect(getMimeType('ris')).toBe('application/x-research-info-systems');
      expect(getMimeType('json')).toBe('application/json');
      expect(getMimeType('mla')).toBe('text/plain');
      expect(getMimeType('apa')).toBe('text/plain');
      expect(getMimeType('chicago')).toBe('text/plain');
    });

    it('should return correct file extensions for all formats', () => {
      expect(getFileExtension('bibtex')).toBe('bib');
      expect(getFileExtension('ris')).toBe('ris');
      expect(getFileExtension('json')).toBe('json');
      expect(getFileExtension('mla')).toBe('txt');
      expect(getFileExtension('apa')).toBe('txt');
      expect(getFileExtension('chicago')).toBe('txt');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty citations array', () => {
      const bibtex = exportCitations([], [], 'bibtex');
      const ris = exportCitations([], [], 'ris');
      const json = exportCitations([], [], 'json');

      expect(bibtex).toBe('');
      expect(ris).toBe('');

      const parsed = JSON.parse(json);
      expect(parsed.citations).toHaveLength(0);
    });

    it('should handle citations with no metadata', () => {
      const citations = [{ text: 'Quote 1' }, { text: 'Quote 2' }];

      const bibtex = exportCitations(citations, [], 'bibtex');
      const ris = exportCitations(citations, [], 'ris');
      const mla = exportCitations(citations, [], 'mla');

      expect(bibtex).toContain('@misc{unknownnd,');
      expect(ris).toContain('TY  - GEN');
      expect(mla).toContain('"Quote 1...');
    });

    it('should handle citations with partial metadata', () => {
      const citations = [{ text: 'Quote' }];
      const metadata: CitationMetadata[] = [{ author: 'Smith, John' }];

      const bibtex = exportCitations(citations, metadata, 'bibtex');
      const ris = exportCitations(citations, metadata, 'ris');

      expect(bibtex).toContain('author = {Smith, John}');
      expect(bibtex).not.toContain('title =');

      expect(ris).toContain('AU  - Smith, John');
      expect(ris).not.toContain('TI  -');
    });

    it('should handle very long text fields', () => {
      const longText = 'A'.repeat(10000);
      const citations = [{ text: longText, note: longText }];
      const metadata: CitationMetadata[] = [
        {
          title: longText,
          author: longText,
        },
      ];

      // Should not throw
      expect(() => {
        exportCitations(citations, metadata, 'bibtex');
        exportCitations(citations, metadata, 'ris');
        exportCitations(citations, metadata, 'json');
      }).not.toThrow();
    });

    it('should handle special unicode characters in all formats', () => {
      const citations = [{ text: 'Quote with émojis 🎉📚 and symbols ©®™' }];
      const metadata: CitationMetadata[] = [
        {
          author: 'Müller, François',
          title: 'Étude sur les caractères spéciaux',
          year: 2023,
        },
      ];

      const bibtex = exportCitations(citations, metadata, 'bibtex');
      const ris = exportCitations(citations, metadata, 'ris');
      const json = exportCitations(citations, metadata, 'json');

      expect(bibtex).toContain('Müller, François');
      expect(ris).toContain('Étude sur les caractères spéciaux');

      const parsed = JSON.parse(json);
      expect(parsed.citations[0].text).toContain('🎉📚');
    });
  });
});
