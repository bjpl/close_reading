/**
 * Citation Utility Functions
 * Helper functions for citation generation
 */

import { CitationMetadata, CitationExportFormat } from './types';

/**
 * Generate a citation key from metadata
 * Format: firstauthor_year (e.g., smith2023)
 */
export function generateCitationKey(metadata: CitationMetadata, index: number): string {
  const author = Array.isArray(metadata.author)
    ? metadata.author[0]
    : metadata.author || 'unknown';

  const lastName = author.split(',')[0].split(' ').pop()?.toLowerCase() || 'unknown';
  const year = metadata.year || 'n.d.';

  // Add index suffix if provided to ensure uniqueness
  const suffix = index > 0 ? String.fromCharCode(97 + index) : '';

  return `${lastName}${year}${suffix}`.replace(/[^a-z0-9]/g, '');
}

/**
 * Format author names for different citation styles
 */
export function formatAuthors(
  authors: string | string[] | undefined,
  format: 'bibtex' | 'ris' | 'plain' = 'plain'
): string {
  if (!authors) return '';

  const authorArray = Array.isArray(authors) ? authors : [authors];

  switch (format) {
    case 'bibtex':
      // BibTeX: "Last, First and Last, First"
      return authorArray.join(' and ');
    case 'ris':
      // RIS: One author per line
      return authorArray[0]; // RIS uses multiple AU tags
    case 'plain':
    default:
      return authorArray.join(', ');
  }
}

/**
 * Get MIME type for export format
 */
export function getMimeType(format: CitationExportFormat): string {
  switch (format) {
    case 'bibtex':
      return 'application/x-bibtex';
    case 'ris':
      return 'application/x-research-info-systems';
    case 'json':
      return 'application/json';
    case 'mla':
    case 'apa':
    case 'chicago':
    default:
      return 'text/plain';
  }
}

/**
 * Get file extension for export format
 */
export function getFileExtension(format: CitationExportFormat): string {
  switch (format) {
    case 'bibtex':
      return 'bib';
    case 'ris':
      return 'ris';
    case 'json':
      return 'json';
    case 'mla':
    case 'apa':
    case 'chicago':
    default:
      return 'txt';
  }
}
