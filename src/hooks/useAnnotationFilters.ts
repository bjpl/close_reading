/**
 * useAnnotationFilters Hook
 *
 * Manages annotation filtering logic by type and color.
 * Returns filtered annotations based on active filter criteria.
 */
import { useMemo } from 'react';
import type { Annotation, AnnotationType, AnnotationColor } from '../types';

export interface AnnotationFilters {
  types: AnnotationType[];
  colors: AnnotationColor[];
}

/**
 * Filters annotations based on type and color criteria
 * @param annotations - All annotations to filter
 * @param activeFilters - Current filter settings
 * @returns Filtered annotations array
 */
export const useAnnotationFilters = (
  annotations: Annotation[],
  activeFilters: AnnotationFilters
) => {
  const filteredAnnotations = useMemo(() => {
    let filtered = [...annotations];

    if (activeFilters.types.length > 0) {
      filtered = filtered.filter((a) => activeFilters.types.includes(a.type));
    }

    if (activeFilters.colors.length > 0) {
      filtered = filtered.filter(
        (a) => a.color && activeFilters.colors.includes(a.color)
      );
    }

    return filtered;
  }, [annotations, activeFilters]);

  return filteredAnnotations;
};
