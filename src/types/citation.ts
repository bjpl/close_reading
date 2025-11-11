/**
 * Citation Type Definitions
 * Extended to support author field and export functionality
 */

export type CitationFormat = 'bibtex' | 'ris' | 'json' | 'mla' | 'apa' | 'chicago';

// Alias for backwards compatibility
export type CitationExportFormat = CitationFormat;

export interface CitationData {
  title: string;
  author: string;
  year?: string;
  url?: string;
  accessDate?: string;
  annotations?: Array<{
    text: string;
    type: string;
    note?: string;
  }>;
}

export interface CitationExportOptions {
  format: CitationFormat;
  includeAnnotations: boolean;
}

/**
 * Citation metadata for export
 */
export interface CitationMetadata {
  type?: 'article' | 'book' | 'chapter' | 'conference' | 'thesis' | 'website' | 'other';
  title?: string;
  author?: string | string[];
  editor?: string | string[];
  year?: string | number;
  journal?: string;
  volume?: string | number;
  issue?: string | number;
  pages?: string;
  publisher?: string;
  location?: string;
  doi?: string;
  url?: string;
  accessDate?: string;
  isbn?: string;
  edition?: string;
  note?: string;
}

/**
 * JSON citation format
 */
export interface JSONCitation {
  type: string;
  metadata: CitationMetadata;
  text: string;
  note?: string;
}

/**
 * Citation export data structure
 */
export interface CitationExport {
  format: string;
  source: {
    title: string;
    author?: string;
    date?: string;
  };
  citations: JSONCitation[];
  metadata: {
    exportDate: string;
    citationCount: number;
    version: string;
  };
}

/**
 * RIS type mappings
 */
export const RIS_TYPES: Record<string, string> = {
  article: 'JOUR',
  book: 'BOOK',
  chapter: 'CHAP',
  conference: 'CONF',
  thesis: 'THES',
  website: 'ELEC',
  other: 'GEN',
};

/**
 * BibTeX type mappings
 */
export const BIBTEX_TYPES: Record<string, string> = {
  article: 'article',
  book: 'book',
  chapter: 'inbook',
  conference: 'inproceedings',
  thesis: 'phdthesis',
  website: 'misc',
  other: 'misc',
};
