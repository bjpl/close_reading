/**
 * Citation Export Service
 *
 * Provides functionality to export citations in multiple formats:
 * - BibTeX (.bib)
 * - RIS (.ris)
 * - JSON (.json)
 * - Plain text (MLA, APA, Chicago)
 */

import {
  CitationMetadata,
  CitationExportFormat,
  JSONCitation,
  CitationExport,
  RIS_TYPES,
  BIBTEX_TYPES,
} from '../types/citation';

/**
 * Generate a citation key from metadata
 * Format: firstauthor_year (e.g., smith2023)
 */
function generateCitationKey(metadata: CitationMetadata, index: number): string {
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
function formatAuthors(
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

/**
 * Export citations in JSON format
 */
export function exportJSON(
  citations: Array<{ text: string; note?: string }>,
  metadata: CitationMetadata[],
  documentInfo?: { title: string; author?: string; date?: string }
): string {
  const jsonCitations: JSONCitation[] = citations.map((citation, index) => ({
    type: metadata[index]?.type || 'other',
    metadata: metadata[index] || { title: 'Untitled' },
    text: citation.text,
    note: citation.note,
  }));

  const exportData: CitationExport = {
    format: 'json',
    source: documentInfo || {
      title: 'Untitled Document',
    },
    citations: jsonCitations,
    metadata: {
      exportDate: new Date().toISOString(),
      citationCount: citations.length,
      version: '1.0',
    },
  };

  return JSON.stringify(exportData, null, 2);
}

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
          // MLA: Author. "Title." Source, Year.
          return formatMLACitation(citation, meta, documentTitle);

        case 'apa':
          // APA: Author. (Year). Title. Source.
          return formatAPACitation(citation, meta, documentTitle);

        case 'chicago':
          // Chicago: Numbered footnote style
          return formatChicagoCitation(citation, meta, index + 1, documentTitle);

        default:
          return citation.text;
      }
    })
    .join('\n\n');
}

/**
 * Format citation in MLA style
 */
function formatMLACitation(
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

/**
 * Format citation in APA style
 */
function formatAPACitation(
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

/**
 * Format citation in Chicago style (notes-bibliography)
 */
function formatChicagoCitation(
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

/**
 * Main export function that handles all formats
 */
export function exportCitations(
  citations: Array<{ text: string; note?: string }>,
  metadata: CitationMetadata[],
  format: CitationExportFormat,
  documentInfo?: { title: string; author?: string; date?: string }
): string {
  const docTitle = documentInfo?.title || 'Untitled Document';

  switch (format) {
    case 'bibtex':
      return exportBibTeX(citations, metadata);
    case 'ris':
      return exportRIS(citations, metadata);
    case 'json':
      return exportJSON(citations, metadata, documentInfo);
    case 'mla':
    case 'apa':
    case 'chicago':
      return exportPlainText(citations, metadata, format, docTitle);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
