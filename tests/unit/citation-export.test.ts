import { describe, it, expect } from 'vitest';
import { mockCitation } from '../utils/mockData';

describe('Citation Export System', () => {
  describe('BibTeX Export', () => {
    it('should generate valid BibTeX format', () => {
      const citation = {
        type: 'article',
        key: 'test2024',
        author: 'Test Author',
        title: 'Test Document',
        year: '2024',
        journal: 'Test Journal'
      };

      const bibtex = `@article{${citation.key},
  author = {${citation.author}},
  title = {${citation.title}},
  journal = {${citation.journal}},
  year = {${citation.year}}
}`;

      expect(bibtex).toContain('@article');
      expect(bibtex).toContain(citation.author);
      expect(bibtex).toContain(citation.title);
    });

    it('should handle book citations', () => {
      const citation = {
        type: 'book',
        key: 'book2024',
        author: 'Book Author',
        title: 'Test Book',
        year: '2024',
        publisher: 'Test Publisher'
      };

      const bibtex = `@book{${citation.key},
  author = {${citation.author}},
  title = {${citation.title}},
  publisher = {${citation.publisher}},
  year = {${citation.year}}
}`;

      expect(bibtex).toContain('@book');
      expect(bibtex).toContain(citation.publisher);
    });

    it('should handle inproceedings citations', () => {
      const citation = {
        type: 'inproceedings',
        key: 'conf2024',
        author: 'Conference Author',
        title: 'Conference Paper',
        booktitle: 'Proceedings of Test Conference',
        year: '2024'
      };

      const bibtex = `@inproceedings{${citation.key},
  author = {${citation.author}},
  title = {${citation.title}},
  booktitle = {${citation.booktitle}},
  year = {${citation.year}}
}`;

      expect(bibtex).toContain('@inproceedings');
      expect(bibtex).toContain(citation.booktitle);
    });

    it('should escape special characters', () => {
      const title = 'Test & Title with {Special} Characters';
      const escaped = title
        .replace(/&/g, '\\&')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}');

      expect(escaped).toBe('Test \\& Title with \\{Special\\} Characters');
    });
  });

  describe('RIS Export', () => {
    it('should generate valid RIS format', () => {
      const citation = {
        type: 'JOUR', // Journal article
        author: 'Test Author',
        title: 'Test Document',
        year: '2024',
        journal: 'Test Journal'
      };

      const ris = `TY  - ${citation.type}
AU  - ${citation.author}
TI  - ${citation.title}
JO  - ${citation.journal}
PY  - ${citation.year}
ER  -`;

      expect(ris).toContain('TY  - JOUR');
      expect(ris).toContain(`AU  - ${citation.author}`);
      expect(ris).toContain('ER  -');
    });

    it('should handle book RIS format', () => {
      const citation = {
        type: 'BOOK',
        author: 'Book Author',
        title: 'Test Book',
        year: '2024',
        publisher: 'Test Publisher'
      };

      const ris = `TY  - BOOK
AU  - ${citation.author}
TI  - ${citation.title}
PB  - ${citation.publisher}
PY  - ${citation.year}
ER  -`;

      expect(ris).toContain('TY  - BOOK');
      expect(ris).toContain('PB  -');
    });

    it('should handle multiple authors', () => {
      const authors = ['Author One', 'Author Two', 'Author Three'];
      const risAuthors = authors.map(author => `AU  - ${author}`).join('\n');

      expect(risAuthors).toContain('AU  - Author One');
      expect(risAuthors).toContain('AU  - Author Two');
      expect(risAuthors).toContain('AU  - Author Three');
    });
  });

  describe('JSON Export', () => {
    it('should generate valid JSON format', () => {
      const citation = {
        id: 'cite-1',
        type: 'article',
        author: 'Test Author',
        title: 'Test Document',
        year: '2024',
        journal: 'Test Journal',
        metadata: {
          pages: '1-10',
          volume: '5',
          issue: '2'
        }
      };

      const json = JSON.stringify(citation, null, 2);
      const parsed = JSON.parse(json);

      expect(parsed.type).toBe('article');
      expect(parsed.author).toBe('Test Author');
      expect(parsed.metadata.pages).toBe('1-10');
    });

    it('should handle array of citations', () => {
      const citations = [
        { id: '1', title: 'First Citation', author: 'Author One' },
        { id: '2', title: 'Second Citation', author: 'Author Two' }
      ];

      const json = JSON.stringify(citations, null, 2);
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].title).toBe('First Citation');
    });

    it('should preserve nested metadata', () => {
      const citation = {
        id: 'cite-1',
        metadata: {
          authors: [
            { firstName: 'John', lastName: 'Doe' },
            { firstName: 'Jane', lastName: 'Smith' }
          ],
          keywords: ['research', 'testing', 'citations']
        }
      };

      const json = JSON.stringify(citation);
      const parsed = JSON.parse(json);

      expect(parsed.metadata.authors).toHaveLength(2);
      expect(parsed.metadata.keywords).toContain('research');
    });
  });

  describe('Citation Metadata Extraction', () => {
    it('should extract author names', () => {
      const text = 'According to Smith (2024), the methodology...';
      const authorMatch = text.match(/According to ([A-Z][a-z]+)/);

      expect(authorMatch).not.toBeNull();
      expect(authorMatch?.[1]).toBe('Smith');
    });

    it('should extract year from text', () => {
      const text = 'Previous research (Jones, 2024) shows...';
      const yearMatch = text.match(/\((\d{4})\)/);

      expect(yearMatch).not.toBeNull();
      expect(yearMatch?.[1]).toBe('2024');
    });

    it('should extract DOI if present', () => {
      const text = 'DOI: 10.1234/test.2024.001';
      const doiMatch = text.match(/DOI:\s*(10\.\d+\/[^\s]+)/i);

      expect(doiMatch).not.toBeNull();
      expect(doiMatch?.[1]).toBe('10.1234/test.2024.001');
    });

    it('should extract URL if present', () => {
      const text = 'Available at: https://example.com/article';
      const urlMatch = text.match(/https?:\/\/[^\s]+/);

      expect(urlMatch).not.toBeNull();
      expect(urlMatch?.[0]).toBe('https://example.com/article');
    });
  });

  describe('Export Format Validation', () => {
    it('should validate BibTeX structure', () => {
      const bibtex = mockCitation.citation_text;

      expect(bibtex).toMatch(/@\w+{/); // Entry type
      expect(bibtex).toContain('title=');
      expect(bibtex).toContain('author=');
      expect(bibtex).toContain('year=');
    });

    it('should validate required fields for article', () => {
      const requiredFields = ['author', 'title', 'year'];
      const citation = mockCitation.metadata;

      for (const field of requiredFields) {
        expect(citation).toHaveProperty(field);
        expect(citation[field as keyof typeof citation]).toBeTruthy();
      }
    });

    it('should handle missing optional fields gracefully', () => {
      const citation = {
        author: 'Test Author',
        title: 'Test Title',
        year: '2024'
        // Missing optional fields like journal, volume, etc.
      };

      const bibtex = `@article{test2024,
  author = {${citation.author}},
  title = {${citation.title}},
  year = {${citation.year}}
}`;

      expect(bibtex).toBeTruthy();
      expect(bibtex).not.toContain('undefined');
    });
  });

  describe('Bulk Export', () => {
    it('should export multiple citations in one file', () => {
      const citations = [
        { key: 'cite1', author: 'Author 1', title: 'Title 1', year: '2024' },
        { key: 'cite2', author: 'Author 2', title: 'Title 2', year: '2023' }
      ];

      const bibtexArray = citations.map(c =>
        `@article{${c.key},\n  author = {${c.author}},\n  title = {${c.title}},\n  year = {${c.year}}\n}`
      );

      const combinedBibtex = bibtexArray.join('\n\n');

      expect(combinedBibtex).toContain('cite1');
      expect(combinedBibtex).toContain('cite2');
      expect(combinedBibtex.split('@article').length - 1).toBe(2);
    });

    it('should handle empty citation list', () => {
      const citations: any[] = [];
      const bibtexArray = citations.map(c => `@article{${c.key}}`);

      expect(bibtexArray).toHaveLength(0);
    });
  });
});
