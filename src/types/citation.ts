/**
 * Citation Types
 *
 * Type definitions for citation export functionality including
 * BibTeX, RIS, JSON, and plain text formats.
 */

/**
 * Supported citation export formats
 */
export type CitationExportFormat =
  | 'mla'
  | 'apa'
  | 'chicago'
  | 'bibtex'
  | 'ris'
  | 'json';

/**
 * Citation metadata for export
 */
export interface CitationMetadata {
  /** Primary author(s) - can be single string or array */
  author?: string | string[];
  /** Publication year */
  year?: number | string;
  /** Work title */
  title: string;
  /** Journal/publication name */
  journal?: string;
  /** Volume number */
  volume?: string | number;
  /** Issue number */
  issue?: string | number;
  /** Page numbers (e.g., "123-145") */
  pages?: string;
  /** Digital Object Identifier */
  doi?: string;
  /** URL/web address */
  url?: string;
  /** Publisher name */
  publisher?: string;
  /** Publication location/city */
  location?: string;
  /** ISBN for books */
  isbn?: string;
  /** Type of work (article, book, website, etc.) */
  type?: CitationType;
  /** Access date for web sources */
  accessDate?: string;
  /** Edition (for books) */
  edition?: string;
  /** Editor(s) */
  editor?: string | string[];
  /** Additional notes */
  note?: string;
}

/**
 * Types of citeable works
 */
export type CitationType =
  | 'article'
  | 'book'
  | 'website'
  | 'chapter'
  | 'conference'
  | 'thesis'
  | 'report'
  | 'other';

/**
 * BibTeX entry structure
 */
export interface BibTeXEntry {
  /** Entry type (article, book, inproceedings, etc.) */
  type: string;
  /** Citation key/identifier */
  key: string;
  /** Entry fields */
  fields: Record<string, string | number>;
}

/**
 * RIS (Research Information Systems) entry
 */
export interface RISEntry {
  /** Type of reference (TY) */
  type: string;
  /** Fields as key-value pairs */
  fields: Array<{ tag: string; value: string }>;
}

/**
 * JSON citation format
 */
export interface JSONCitation {
  /** Citation type */
  type: CitationType;
  /** All metadata fields */
  metadata: CitationMetadata;
  /** Original quoted text */
  text: string;
  /** Additional notes or context */
  note?: string;
}

/**
 * Complete citation export container
 */
export interface CitationExport {
  /** Export format */
  format: CitationExportFormat;
  /** Document/source information */
  source: {
    title: string;
    author?: string;
    date?: string;
  };
  /** List of citations */
  citations: JSONCitation[];
  /** Export metadata */
  metadata: {
    exportDate: string;
    citationCount: number;
    version: string;
  };
}

/**
 * RIS reference type mappings
 */
export const RIS_TYPES: Record<CitationType, string> = {
  article: 'JOUR',      // Journal Article
  book: 'BOOK',         // Book
  website: 'ELEC',      // Electronic Source
  chapter: 'CHAP',      // Book Chapter
  conference: 'CONF',   // Conference Proceeding
  thesis: 'THES',       // Thesis
  report: 'RPRT',       // Report
  other: 'GEN',         // Generic
};

/**
 * BibTeX entry type mappings
 */
export const BIBTEX_TYPES: Record<CitationType, string> = {
  article: 'article',
  book: 'book',
  website: 'misc',
  chapter: 'inbook',
  conference: 'inproceedings',
  thesis: 'phdthesis',
  report: 'techreport',
  other: 'misc',
};
