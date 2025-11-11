/**
 * BibTeX Citation Export Module
 * Exports citations in BibTeX format
 */

import { CitationMetadata, BIBTEX_TYPES } from './types';
import { generateCitationKey, formatAuthors } from './utils';

/**
 * Export citations in BibTeX format
 */
export function exportBibTeX(
  citations: Array<{ text: string; note?: string }>,
  metadata: CitationMetadata[]
): string {
  const entries: string[] = [];

  citations.forEach((citation, index) => {
    const meta = metadata[index] || {};
    const type = BIBTEX_TYPES[meta.type || 'other'];
    const key = generateCitationKey(meta, index);

    const fields: string[] = [];

    // Required and optional fields based on entry type
    if (meta.author) {
      fields.push(`  author = {${formatAuthors(meta.author, 'bibtex')}}`);
    }
    if (meta.title) {
      fields.push(`  title = {${meta.title}}`);
    }
    if (meta.year) {
      fields.push(`  year = {${meta.year}}`);
    }
    if (meta.journal) {
      fields.push(`  journal = {${meta.journal}}`);
    }
    if (meta.volume) {
      fields.push(`  volume = {${meta.volume}}`);
    }
    if (meta.issue) {
      fields.push(`  number = {${meta.issue}}`);
    }
    if (meta.pages) {
      fields.push(`  pages = {${meta.pages}}`);
    }
    if (meta.publisher) {
      fields.push(`  publisher = {${meta.publisher}}`);
    }
    if (meta.location) {
      fields.push(`  address = {${meta.location}}`);
    }
    if (meta.doi) {
      fields.push(`  doi = {${meta.doi}}`);
    }
    if (meta.url) {
      fields.push(`  url = {${meta.url}}`);
    }
    if (meta.isbn) {
      fields.push(`  isbn = {${meta.isbn}}`);
    }
    if (meta.edition) {
      fields.push(`  edition = {${meta.edition}}`);
    }
    if (meta.editor) {
      fields.push(`  editor = {${formatAuthors(meta.editor, 'bibtex')}}`);
    }
    if (meta.note || citation.note) {
      fields.push(`  note = {${meta.note || citation.note}}`);
    }

    entries.push(`@${type}{${key},\n${fields.join(',\n')}\n}`);
  });

  return entries.join('\n\n');
}
