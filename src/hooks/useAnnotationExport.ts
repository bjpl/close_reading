/**
 * useAnnotationExport Hook
 *
 * Provides annotation export functionality in multiple formats (JSON, Markdown, CSV).
 * Handles file generation and download with toast notifications.
 */
import { useCallback } from 'react';
import { toaster } from '@chakra-ui/react';
import type { Annotation } from '../types';
import type { AnnotationFilters } from './useAnnotationFilters';
import {
  exportAsJSON,
  exportAsMarkdown,
  exportAsCSV,
  downloadFile,
} from '../services/annotationExport';

export type ExportFormat = 'json' | 'markdown' | 'csv';

interface UseAnnotationExportOptions {
  annotations: Annotation[];
  documentTitle: string;
  activeFilters: AnnotationFilters;
}

/**
 * Provides export functionality for annotations in multiple formats
 * @param options - Configuration including annotations, document title, and filters
 * @returns handleExport function that exports annotations in the specified format
 */
export const useAnnotationExport = ({
  annotations,
  documentTitle,
  activeFilters,
}: UseAnnotationExportOptions) => {
  /**
   * Exports annotations in the specified format and triggers download
   */
  const handleExport = useCallback(
    (format: ExportFormat) => {
      const exportOptions = {
        includeTimestamps: true,
        includeColors: true,
        filterByType: activeFilters.types.length > 0 ? activeFilters.types : undefined,
        filterByColor: activeFilters.colors.length > 0 ? activeFilters.colors : undefined,
      };

      let content = '';
      let filename = '';

      if (format === 'json') {
        content = exportAsJSON(annotations, documentTitle, exportOptions);
        filename = `${documentTitle}-annotations.json`;
      } else if (format === 'markdown') {
        content = exportAsMarkdown(annotations, documentTitle, exportOptions);
        filename = `${documentTitle}-annotations.md`;
      } else if (format === 'csv') {
        content = exportAsCSV(annotations, documentTitle, exportOptions);
        filename = `${documentTitle}-annotations.csv`;
      }

      downloadFile(content, filename);

      toaster.create({
        title: 'Annotations exported',
        description: `Exported as ${format.toUpperCase()}`,
        type: 'success',
        duration: 2000,
      });
    },
    [annotations, documentTitle, activeFilters]
  );

  return { handleExport };
};
