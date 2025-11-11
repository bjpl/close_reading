/**
 * Chicago Citation Formatter
 * Formats citations according to Chicago Manual of Style (notes-bibliography)
 */

import { CitationMetadata } from '../types';
import { formatAuthors } from '../utils';

/**
 * Format citation in Chicago style (notes-bibliography)
 * Format: Number. Author, "Title," Source Volume, no. Issue (Year): pages.
 */
export function formatChicagoCitation(
  citation: { text: string; note?: string },
  metadata: CitationMetadata,
  number: number,
  documentTitle: string
): string {
  const parts: string[] = [`${number}.`];

  if (metadata.author) {
    parts.push(formatAuthors(metadata.author));
  }

  if (metadata.title) {
    parts.push(`"${metadata.title}"`);
  } else {
    parts.push(`"${citation.text.substring(0, 50)}..."`);
  }

  if (metadata.journal) {
    let journalPart = metadata.journal;
    if (metadata.volume) {
      journalPart += ` ${metadata.volume}`;
      if (metadata.issue) {
        journalPart += `, no. ${metadata.issue}`;
      }
    }
    parts.push(journalPart);
  } else {
    parts.push(documentTitle);
  }

  if (metadata.year) {
    parts.push(`(${metadata.year})`);
  }

  if (metadata.pages) {
    parts.push(metadata.pages);
  }

  if (citation.note) {
    parts.push(citation.note);
  }

  return parts.join(', ') + '.';
}
