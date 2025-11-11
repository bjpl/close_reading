/**
 * Plain Text Citation Export Module
 * Exports citations in plain text formats (MLA, APA, Chicago)
 */

import { CitationMetadata } from './types';
import { formatMLACitation } from './formatters/mla';
import { formatAPACitation } from './formatters/apa';
import { formatChicagoCitation } from './formatters/chicago';

/**
 * Export citations in plain text format (MLA, APA, Chicago)
 */
export function exportPlainText(
  citations: Array<{ text: string; note?: string }>,
  metadata: CitationMetadata[],
  format: 'mla' | 'apa' | 'chicago',
  documentTitle: string = 'Untitled Document'
): string {
  return citations
    .map((citation, index) => {
      const meta = metadata[index] || {};

      switch (format) {
        case 'mla':
          return formatMLACitation(citation, meta, documentTitle);
        case 'apa':
          return formatAPACitation(citation, meta, documentTitle);
        case 'chicago':
          return formatChicagoCitation(citation, meta, index + 1, documentTitle);
        default:
          return citation.text;
      }
    })
    .join('\n\n');
}

// Re-export formatter functions
export { formatMLACitation } from './formatters/mla';
export { formatAPACitation } from './formatters/apa';
export { formatChicagoCitation } from './formatters/chicago';
