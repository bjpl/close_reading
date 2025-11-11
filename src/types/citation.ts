/**
 * Citation Type Definitions
 * Extended to support author field
 */

export type CitationFormat = 'bibtex' | 'ris' | 'json' | 'mla' | 'apa' | 'chicago';

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
