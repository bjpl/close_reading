/**
 * APA Citation Formatter
 * Formats citations according to APA (American Psychological Association) style
 */

import { CitationMetadata } from '../types';
import { formatAuthors } from '../utils';

/**
 * Format citation in APA style
 * Format: Author. (Year). Title. Source, Volume(Issue), pages. DOI/URL
 */
export function formatAPACitation(
  citation: { text: string; note?: string },
  metadata: CitationMetadata,
  documentTitle: string
): string {
  const parts: string[] = [];

  if (metadata.author) {
    parts.push(formatAuthors(metadata.author));
  }

  if (metadata.year) {
    parts.push(`(${metadata.year})`);
  }

  if (metadata.title) {
    parts.push(metadata.title);
  } else {
    parts.push(`"${citation.text.substring(0, 50)}..."`);
  }

  if (metadata.journal) {
    let journalPart = metadata.journal;
    if (metadata.volume) {
      journalPart += `, ${metadata.volume}`;
      if (metadata.issue) {
        journalPart += `(${metadata.issue})`;
      }
    }
    if (metadata.pages) {
      journalPart += `, ${metadata.pages}`;
    }
    parts.push(journalPart);
  } else {
    parts.push(documentTitle);
  }

  if (metadata.doi) {
    parts.push(`https://doi.org/${metadata.doi}`);
  } else if (metadata.url) {
    parts.push(metadata.url);
  }

  if (citation.note) {
    parts.push(citation.note);
  }

  return parts.join('. ') + '.';
}
