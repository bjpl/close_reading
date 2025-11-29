/**
 * BibliographyService Tests
 *
 * Comprehensive unit tests for the bibliography management service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BibliographyService,
  type Citation,
} from '../../src/services/BibliographyService';

describe('BibliographyService', () => {
  let service: BibliographyService;

  beforeEach(() => {
    service = new BibliographyService();
  });

  describe('Entry Management', () => {
    it('should create a new citation entry', () => {
      const citation: Partial<Citation> = {
        type: 'article',
        title: 'Test Article',
        author: [{ given: 'John', family: 'Doe' }],
      };

      const entry = service.createEntry(citation, ['test'], 'Test note');

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.citation.title).toBe('Test Article');
      expect(entry.tags).toContain('test');
      expect(entry.notes).toBe('Test note');
      expect(entry.formatted).toBeDefined();
    });

    it('should update an existing entry', async () => {
      const citation: Partial<Citation> = {
        type: 'article',
        title: 'Original Title',
      };

      const entry = service.createEntry(citation);
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const updated = service.updateEntry(entry.id, {
        notes: 'Updated note',
        tags: ['new-tag'],
      });

      expect(updated).toBeDefined();
      expect(updated!.notes).toBe('Updated note');
      expect(updated!.tags).toContain('new-tag');
      expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(entry.createdAt.getTime());
    });

    it('should delete an entry', () => {
      const citation: Partial<Citation> = {
        type: 'article',
        title: 'Test Article',
      };

      const entry = service.createEntry(citation);
      const deleted = service.deleteEntry(entry.id);

      expect(deleted).toBe(true);
      expect(service.getEntry(entry.id)).toBeNull();
    });

    it('should retrieve entry by ID', () => {
      const citation: Partial<Citation> = {
        type: 'article',
        title: 'Test Article',
      };

      const created = service.createEntry(citation);
      const retrieved = service.getEntry(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.citation.title).toBe('Test Article');
    });

    it('should get all entries', () => {
      service.createEntry({ type: 'article', title: 'Article 1' });
      service.createEntry({ type: 'book', title: 'Book 1' });
      service.createEntry({ type: 'article', title: 'Article 2' });

      const all = service.getAllEntries();
      expect(all).toHaveLength(3);
    });
  });

  describe('Search and Filter', () => {
    beforeEach(() => {
      service.createEntry({
        type: 'article',
        title: 'Machine Learning Fundamentals',
        author: [{ given: 'Jane', family: 'Smith' }],
        abstract: 'An introduction to machine learning concepts',
      }, ['ml', 'ai']);

      service.createEntry({
        type: 'book',
        title: 'Deep Learning',
        author: [{ given: 'John', family: 'Doe' }],
      }, ['deep-learning', 'ai']);

      service.createEntry({
        type: 'article',
        title: 'Natural Language Processing',
        author: [{ given: 'Alice', family: 'Johnson' }],
      }, ['nlp', 'ai']);
    });

    it('should search entries by title', () => {
      const results = service.searchEntries('learning');
      expect(results).toHaveLength(2);
      expect(results.some(e => e.citation.title.includes('Machine Learning'))).toBe(true);
      expect(results.some(e => e.citation.title.includes('Deep Learning'))).toBe(true);
    });

    it('should search entries by author', () => {
      const results = service.searchEntries('Smith');
      expect(results).toHaveLength(1);
      expect(results[0].citation.author![0].family).toBe('Smith');
    });

    it('should search entries by abstract', () => {
      const results = service.searchEntries('introduction');
      expect(results).toHaveLength(1);
      expect(results[0].citation.title).toBe('Machine Learning Fundamentals');
    });

    it('should search entries by tags', () => {
      const results = service.searchEntries('nlp');
      expect(results).toHaveLength(1);
      expect(results[0].citation.title).toBe('Natural Language Processing');
    });

    it('should filter entries by tags', () => {
      const results = service.filterByTags(['ai']);
      expect(results).toHaveLength(3);

      const mlResults = service.filterByTags(['ml']);
      expect(mlResults).toHaveLength(1);
    });

    it('should filter entries by multiple tags', () => {
      const results = service.filterByTags(['ml', 'deep-learning']);
      expect(results).toHaveLength(2);
    });
  });

  describe('Citation Formatting', () => {
    const citation: Citation = {
      id: 'test-1',
      type: 'article',
      title: 'Test Article',
      author: [{ given: 'John', family: 'Doe' }],
      issued: { 'date-parts': [[2024]] },
    };

    it('should format citation in APA style', () => {
      const formatted = service.formatCitation(citation, 'apa');
      expect(formatted).toBeDefined();
      expect(formatted).toContain('Doe');
      expect(formatted).toContain('2024');
    });

    it('should format citation in MLA style', () => {
      const formatted = service.formatCitation(citation, 'mla');
      expect(formatted).toBeDefined();
      expect(formatted).toContain('Doe');
    });

    it('should generate in-text citation for APA', () => {
      const inText = service.generateInTextCitation(citation, 'apa');
      expect(inText).toContain('Doe');
      expect(inText).toContain('2024');
    });

    it('should generate in-text citation with page numbers', () => {
      const inText = service.generateInTextCitation(citation, 'apa', { page: '42' });
      expect(inText).toContain('p. 42');
    });

    it('should handle fallback formatting for errors', () => {
      const invalidCitation: Citation = {
        id: 'test',
        type: 'article',
        title: 'Test',
      };

      const formatted = service.formatCitation(invalidCitation, 'apa');
      expect(formatted).toBeDefined();
      expect(formatted).toContain('Test');
    });
  });

  describe('Import/Export', () => {
    it('should import BibTeX format', async () => {
      const bibtex = `
        @article{doe2024,
          title={Test Article},
          author={Doe, John},
          year={2024},
          journal={Test Journal}
        }
      `;

      const entries = await service.importBibliography(bibtex, 'bibtex');
      expect(entries).toHaveLength(1);
      expect(entries[0].citation.title).toBe('Test Article');
    });

    it('should export to BibTeX format', () => {
      service.createEntry({
        id: 'doe2024',
        type: 'article',
        title: 'Test Article',
        author: [{ given: 'John', family: 'Doe' }],
        issued: { 'date-parts': [[2024]] },
      });

      const entries = service.getAllEntries();
      const exported = service.exportBibliography(entries, 'bibtex');

      expect(exported).toBeDefined();
      // BibTeX format includes author and article type
      expect(exported).toContain('article');
      expect(exported).toContain('Doe');
    });

    it('should handle import errors gracefully', async () => {
      const invalidBibtex = 'not valid bibtex @@@';

      await expect(
        service.importBibliography(invalidBibtex, 'bibtex')
      ).rejects.toThrow('Failed to import bibliography');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      service.createEntry({ type: 'article', title: 'Article 1' });
      service.createEntry({ type: 'article', title: 'Article 2' });
      service.createEntry({ type: 'book', title: 'Book 1' });
      service.createEntry({ type: 'book', title: 'Book 2' });
      service.createEntry({ type: 'book', title: 'Book 3' });
    });

    it('should calculate bibliography statistics', () => {
      const stats = service.getStatistics();

      expect(stats.totalEntries).toBe(5);
      expect(stats.typeBreakdown.article).toBe(2);
      expect(stats.typeBreakdown.book).toBe(3);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });
  });

  describe('Clear', () => {
    it('should clear all entries', () => {
      service.createEntry({ type: 'article', title: 'Test 1' });
      service.createEntry({ type: 'article', title: 'Test 2' });

      expect(service.getAllEntries()).toHaveLength(2);

      service.clear();

      expect(service.getAllEntries()).toHaveLength(0);
    });
  });
});
