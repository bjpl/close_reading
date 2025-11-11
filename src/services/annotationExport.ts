/**
 * Annotation Export Service
 *
 * Handles exporting annotations in various formats.
 */
import type { Annotation } from '../types';

export interface ExportOptions {
  includeTimestamps?: boolean;
  includeColors?: boolean;
  filterByType?: string[];
  filterByColor?: string[];
}

/**
 * Export annotations as JSON
 */
export const exportAsJSON = (
  annotations: Annotation[],
  documentTitle: string,
  options: ExportOptions = {}
): string => {
  const filtered = filterAnnotations(annotations, options);

  const exportData = {
    document: documentTitle,
    exportDate: new Date().toISOString(),
    totalAnnotations: filtered.length,
    annotations: filtered.map((a) => ({
      id: a.id,
      type: a.type,
      text: a.content || a.text,
      note: a.note || a.note_text,
      color: options.includeColors ? a.color : undefined,
      position: {
        start: a.startOffset || a.start_offset,
        end: a.endOffset || a.end_offset,
      },
      created: options.includeTimestamps ? a.created_at : undefined,
    })),
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Export annotations as Markdown
 */
export const exportAsMarkdown = (
  annotations: Annotation[],
  documentTitle: string,
  options: ExportOptions = {}
): string => {
  const filtered = filterAnnotations(annotations, options);

  let markdown = `# Annotations for "${documentTitle}"\n\n`;
  markdown += `**Exported:** ${new Date().toLocaleDateString()}\n`;
  markdown += `**Total Annotations:** ${filtered.length}\n\n`;

  // Group by type
  const byType = filtered.reduce((acc, annotation) => {
    if (!acc[annotation.type]) {
      acc[annotation.type] = [];
    }
    acc[annotation.type].push(annotation);
    return acc;
  }, {} as Record<string, Annotation[]>);

  // Generate markdown for each type
  Object.entries(byType).forEach(([type, annotations]) => {
    markdown += `## ${type.charAt(0).toUpperCase() + type.slice(1)}s (${annotations.length})\n\n`;

    annotations.forEach((annotation, index) => {
      markdown += `### ${index + 1}. ${annotation.content || annotation.text}\n\n`;

      if (annotation.note || annotation.note_text) {
        markdown += `**Note:** ${annotation.note || annotation.note_text}\n\n`;
      }

      if (options.includeColors && annotation.color) {
        markdown += `**Color:** ${annotation.color}\n\n`;
      }

      if (options.includeTimestamps) {
        markdown += `**Created:** ${new Date(annotation.created_at).toLocaleString()}\n\n`;
      }

      markdown += '---\n\n';
    });
  });

  return markdown;
};

/**
 * Export annotations as CSV
 */
export const exportAsCSV = (
  annotations: Annotation[],
  _documentTitle: string,
  options: ExportOptions = {}
): string => {
  const filtered = filterAnnotations(annotations, options);

  // CSV headers
  const headers = [
    'Type',
    'Text',
    'Note',
    options.includeColors ? 'Color' : null,
    'Start Position',
    'End Position',
    options.includeTimestamps ? 'Created' : null,
  ].filter(Boolean);

  let csv = headers.join(',') + '\n';

  // CSV rows
  filtered.forEach((annotation) => {
    const row = [
      annotation.type,
      `"${(annotation.content || annotation.text || '').replace(/"/g, '""')}"`,
      `"${(annotation.note || annotation.note_text || '').replace(/"/g, '""')}"`,
      options.includeColors ? annotation.color || '' : null,
      annotation.startOffset || annotation.start_offset,
      annotation.endOffset || annotation.end_offset,
      options.includeTimestamps
        ? new Date(annotation.created_at).toISOString()
        : null,
    ].filter((v) => v !== null);

    csv += row.join(',') + '\n';
  });

  return csv;
};

/**
 * Filter annotations based on options
 */
const filterAnnotations = (
  annotations: Annotation[],
  options: ExportOptions
): Annotation[] => {
  let filtered = [...annotations];

  if (options.filterByType && options.filterByType.length > 0) {
    filtered = filtered.filter((a) => options.filterByType!.includes(a.type));
  }

  if (options.filterByColor && options.filterByColor.length > 0) {
    filtered = filtered.filter(
      (a) => a.color && options.filterByColor!.includes(a.color)
    );
  }

  return filtered;
};

/**
 * Download exported data as file
 */
export const downloadFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Get annotation statistics
 */
export const getAnnotationStatistics = (annotations: Annotation[]) => {
  const stats = {
    total: annotations.length,
    byType: {} as Record<string, number>,
    byColor: {} as Record<string, number>,
    withNotes: 0,
    mostUsedColor: null as string | null,
  };

  annotations.forEach((annotation) => {
    // Count by type
    stats.byType[annotation.type] = (stats.byType[annotation.type] || 0) + 1;

    // Count by color
    if (annotation.color) {
      stats.byColor[annotation.color] =
        (stats.byColor[annotation.color] || 0) + 1;
    }

    // Count notes
    if (annotation.note || annotation.note_text) {
      stats.withNotes++;
    }
  });

  // Find most used color
  if (Object.keys(stats.byColor).length > 0) {
    stats.mostUsedColor = Object.entries(stats.byColor).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];
  }

  return stats;
};
