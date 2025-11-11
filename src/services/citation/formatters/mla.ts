/**
 * MLA Citation Formatter
 * Formats citations according to MLA (Modern Language Association) style
 */

import { CitationMetadata } from '../types';
import { formatAuthors } from '../utils';

/**
 * Format citation in MLA style
 * Format: Author. "Title." Source, Year, pp. pages.
 */
export function formatMLACitation(
  citation: { text: string; note?: string },
  metadata: CitationMetadata,
  documentTitle: string
): string {
  const parts: string[] = [];

  if (metadata.author) {
    parts.push(formatAuthors(metadata.author));
  }

  if (metadata.title) {
    parts.push(`"${metadata.title}"`);
  } else {
    parts.push(`"${citation.text.substring(0, 50)}..."`);
  }

  if (metadata.journal) {
    parts.push(metadata.journal);
  } else {
    parts.push(documentTitle);
  }

  if (metadata.year) {
    parts.push(String(metadata.year));
  }

  if (metadata.pages) {
    parts.push(`pp. ${metadata.pages}`);
  }

  if (citation.note) {
    parts.push(citation.note);
  }

  return parts.join(', ') + '.';
}
