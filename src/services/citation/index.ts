/**
 * Citation Export Service - Main Entry Point
 * Orchestrates citation export in multiple formats
 */

import { CitationMetadata, CitationExportFormat } from './types';
import { exportBibTeX } from './bibtex';
import { exportRIS } from './ris';
import { exportJSON } from './json';
import { exportPlainText } from './plaintext';

// Re-export all public APIs
export { exportBibTeX } from './bibtex';
export { exportRIS } from './ris';
export { exportJSON } from './json';
export {
  exportPlainText,
  formatMLACitation,
  formatAPACitation,
  formatChicagoCitation,
} from './plaintext';
export {
  generateCitationKey,
  formatAuthors,
  getMimeType,
  getFileExtension,
} from './utils';
export * from './types';

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
