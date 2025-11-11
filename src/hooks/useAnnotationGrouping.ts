/**
 * useAnnotationGrouping Hook
 *
 * Groups annotations by type, color, or date.
 * Returns a record mapping group keys to annotation arrays.
 */
import { useMemo } from 'react';
import type { Annotation } from '../types';
import { formatSimpleDate } from '../utils/dateUtils';

export type GroupByOption = 'type' | 'color' | 'date';

/**
 * Groups annotations based on the specified criteria
 * @param annotations - Annotations to group
 * @param groupBy - Grouping criteria (type, color, or date)
 * @returns Record mapping group keys to annotation arrays
 */
export const useAnnotationGrouping = (
  annotations: Annotation[],
  groupBy: GroupByOption
) => {
  const groupedAnnotations = useMemo(() => {
    const groups: Record<string, Annotation[]> = {};

    annotations.forEach((annotation) => {
      let key = '';

      if (groupBy === 'type') {
        key = annotation.type;
      } else if (groupBy === 'color') {
        key = annotation.color || 'no-color';
      } else if (groupBy === 'date') {
        key = formatSimpleDate(annotation.created_at);
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(annotation);
    });

    return groups;
  }, [annotations, groupBy]);

  return groupedAnnotations;
};
