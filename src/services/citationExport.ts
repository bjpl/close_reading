/**
 * Citation Export Service - Legacy Entry Point
 *
 * This file now serves as a backwards-compatible re-export layer.
 * All implementation has been moved to modular files in ./citation/
 *
 * Provides functionality to export citations in multiple formats:
 * - BibTeX (.bib)
 * - RIS (.ris)
 * - JSON (.json)
 * - Plain text (MLA, APA, Chicago)
 */

// Re-export everything from the new modular structure
export {
  exportCitations,
  exportBibTeX,
  exportRIS,
  exportJSON,
  exportPlainText,
  formatMLACitation,
  formatAPACitation,
  formatChicagoCitation,
  generateCitationKey,
  formatAuthors,
  getMimeType,
  getFileExtension,
} from './citation';

// Re-export types for convenience
export type {
  CitationFormat,
  CitationExportFormat,
  CitationData,
  CitationExportOptions,
  CitationMetadata,
  JSONCitation,
  CitationExport,
} from './citation';

export { RIS_TYPES, BIBTEX_TYPES } from './citation';
