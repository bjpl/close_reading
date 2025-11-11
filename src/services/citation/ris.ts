/**
 * RIS Citation Export Module
 * Exports citations in RIS (Research Information Systems) format
 */

import { CitationMetadata, RIS_TYPES } from './types';

/**
 * Export citations in RIS format
 */
export function exportRIS(
  citations: Array<{ text: string; note?: string }>,
  metadata: CitationMetadata[]
): string {
  const entries: string[] = [];

  citations.forEach((citation, index) => {
    const meta = metadata[index] || {};
    const fields: string[] = [];

    // Type of reference (required)
    const type = RIS_TYPES[meta.type || 'other'];
    fields.push(`TY  - ${type}`);

    // Authors (multiple AU tags if array)
    if (meta.author) {
      const authors = Array.isArray(meta.author) ? meta.author : [meta.author];
      authors.forEach(author => {
        fields.push(`AU  - ${author}`);
      });
    }

    // Editors
    if (meta.editor) {
      const editors = Array.isArray(meta.editor) ? meta.editor : [meta.editor];
      editors.forEach(editor => {
        fields.push(`ED  - ${editor}`);
      });
    }

    // Title
    if (meta.title) {
      fields.push(`TI  - ${meta.title}`);
    }

    // Journal/Publication
    if (meta.journal) {
      fields.push(`JO  - ${meta.journal}`);
    }

    // Year
    if (meta.year) {
      fields.push(`PY  - ${meta.year}`);
    }

    // Volume
    if (meta.volume) {
      fields.push(`VL  - ${meta.volume}`);
    }

    // Issue
    if (meta.issue) {
      fields.push(`IS  - ${meta.issue}`);
    }

    // Pages
    if (meta.pages) {
      const [start, end] = meta.pages.split('-');
      if (start) fields.push(`SP  - ${start}`);
      if (end) fields.push(`EP  - ${end}`);
    }

    // Publisher
    if (meta.publisher) {
      fields.push(`PB  - ${meta.publisher}`);
    }

    // Location
    if (meta.location) {
      fields.push(`CY  - ${meta.location}`);
    }

    // DOI
    if (meta.doi) {
      fields.push(`DO  - ${meta.doi}`);
    }

    // URL
    if (meta.url) {
      fields.push(`UR  - ${meta.url}`);
    }

    // Access Date
    if (meta.accessDate) {
      fields.push(`Y2  - ${meta.accessDate}`);
    }

    // ISBN
    if (meta.isbn) {
      fields.push(`SN  - ${meta.isbn}`);
    }

    // Edition
    if (meta.edition) {
      fields.push(`ET  - ${meta.edition}`);
    }

    // Notes
    if (meta.note || citation.note) {
      fields.push(`N1  - ${meta.note || citation.note}`);
    }

    // Abstract/quoted text
    if (citation.text) {
      fields.push(`AB  - ${citation.text}`);
    }

    // End of reference (required)
    fields.push('ER  - ');

    entries.push(fields.join('\n'));
  });

  return entries.join('\n\n');
}
