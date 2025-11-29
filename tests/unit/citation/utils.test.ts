/**
 * Unit tests for citation utility functions
 * Tests: generateCitationKey, formatAuthors, getMimeType, getFileExtension
 */

import { describe, it, expect } from 'vitest';
import {
  generateCitationKey,
  formatAuthors,
  getMimeType,
  getFileExtension,
} from '../../../src/services/citation/utils';
import type { CitationMetadata } from '../../../src/services/citation/types';

describe('Citation Utils', () => {
  describe('generateCitationKey', () => {
    it('should generate key from single author and year', () => {
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        year: 2023,
      };
      const key = generateCitationKey(metadata, 0);
      expect(key).toBe('smith2023');
    });

    it('should generate key from author array', () => {
      const metadata: CitationMetadata = {
        author: ['Doe, Jane', 'Smith, Bob'],
        year: 2024,
      };
      const key = generateCitationKey(metadata, 0);
      expect(key).toBe('doe2024');
    });

    it('should handle missing author', () => {
      const metadata: CitationMetadata = {
        year: 2023,
      };
      const key = generateCitationKey(metadata, 0);
      expect(key).toBe('unknown2023');
    });

    it('should handle missing year', () => {
      const metadata: CitationMetadata = {
        author: 'Smith, John',
      };
      const key = generateCitationKey(metadata, 0);
      expect(key).toBe('smithnd');
    });

    it('should add suffix for duplicate citations', () => {
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        year: 2023,
      };
      const key1 = generateCitationKey(metadata, 0);
      const key2 = generateCitationKey(metadata, 1);
      const key3 = generateCitationKey(metadata, 2);

      expect(key1).toBe('smith2023');
      expect(key2).toBe('smith2023b'); // Index 1 -> char 98 (b)
      expect(key3).toBe('smith2023c'); // Index 2 -> char 99 (c)
    });

    it('should extract last name from full name', () => {
      const metadata: CitationMetadata = {
        author: 'John Albert Smith',
        year: 2023,
      };
      const key = generateCitationKey(metadata, 0);
      expect(key).toBe('smith2023');
    });

    it('should remove special characters', () => {
      const metadata: CitationMetadata = {
        author: "O'Brien-Smith, Patrick",
        year: 2023,
      };
      const key = generateCitationKey(metadata, 0);
      expect(key).toBe('obriensmith2023');
    });

    it('should handle string year', () => {
      const metadata: CitationMetadata = {
        author: 'Smith, John',
        year: '2023',
      };
      const key = generateCitationKey(metadata, 0);
      expect(key).toBe('smith2023');
    });

    it('should be lowercase', () => {
      const metadata: CitationMetadata = {
        author: 'SMITH, JOHN',
        year: 2023,
      };
      const key = generateCitationKey(metadata, 0);
      expect(key).toBe('smith2023');
    });
  });

  describe('formatAuthors', () => {
    it('should format single author for plain text', () => {
      const result = formatAuthors('Smith, John', 'plain');
      expect(result).toBe('Smith, John');
    });

    it('should format multiple authors for plain text', () => {
      const authors = ['Smith, John', 'Doe, Jane', 'Brown, Bob'];
      const result = formatAuthors(authors, 'plain');
      expect(result).toBe('Smith, John, Doe, Jane, Brown, Bob');
    });

    it('should format multiple authors for BibTeX', () => {
      const authors = ['Smith, John', 'Doe, Jane', 'Brown, Bob'];
      const result = formatAuthors(authors, 'bibtex');
      expect(result).toBe('Smith, John and Doe, Jane and Brown, Bob');
    });

    it('should format authors for RIS (returns first author)', () => {
      const authors = ['Smith, John', 'Doe, Jane'];
      const result = formatAuthors(authors, 'ris');
      expect(result).toBe('Smith, John');
    });

    it('should handle undefined authors', () => {
      const result = formatAuthors(undefined, 'plain');
      expect(result).toBe('');
    });

    it('should handle empty author array', () => {
      const result = formatAuthors([], 'plain');
      expect(result).toBe('');
    });

    it('should convert string to array', () => {
      const result = formatAuthors('Single Author', 'plain');
      expect(result).toBe('Single Author');
    });

    it('should default to plain format', () => {
      const authors = ['Smith, John', 'Doe, Jane'];
      const result = formatAuthors(authors);
      expect(result).toBe('Smith, John, Doe, Jane');
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for BibTeX', () => {
      expect(getMimeType('bibtex')).toBe('application/x-bibtex');
    });

    it('should return correct MIME type for RIS', () => {
      expect(getMimeType('ris')).toBe('application/x-research-info-systems');
    });

    it('should return correct MIME type for JSON', () => {
      expect(getMimeType('json')).toBe('application/json');
    });

    it('should return text/plain for MLA', () => {
      expect(getMimeType('mla')).toBe('text/plain');
    });

    it('should return text/plain for APA', () => {
      expect(getMimeType('apa')).toBe('text/plain');
    });

    it('should return text/plain for Chicago', () => {
      expect(getMimeType('chicago')).toBe('text/plain');
    });
  });

  describe('getFileExtension', () => {
    it('should return correct extension for BibTeX', () => {
      expect(getFileExtension('bibtex')).toBe('bib');
    });

    it('should return correct extension for RIS', () => {
      expect(getFileExtension('ris')).toBe('ris');
    });

    it('should return correct extension for JSON', () => {
      expect(getFileExtension('json')).toBe('json');
    });

    it('should return txt for MLA', () => {
      expect(getFileExtension('mla')).toBe('txt');
    });

    it('should return txt for APA', () => {
      expect(getFileExtension('apa')).toBe('txt');
    });

    it('should return txt for Chicago', () => {
      expect(getFileExtension('chicago')).toBe('txt');
    });
  });
});
