/**
 * JSON Citation Export Module
 * Exports citations in JSON format
 */

import { CitationMetadata, JSONCitation, CitationExport } from './types';

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
