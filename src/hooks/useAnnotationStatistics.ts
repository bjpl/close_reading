/**
 * useAnnotationStatistics Hook
 *
 * Calculates annotation statistics including counts by type and overall stats.
 * Returns annotation counts and detailed statistics.
 */
import { useMemo } from 'react';
import type { Annotation } from '../types';
import { getAnnotationStatistics } from '../services/annotationExport';

/**
 * Calculates annotation counts by type
 * @param annotations - All annotations to count
 * @returns Record mapping annotation types to counts
 */
const useAnnotationCounts = (annotations: Annotation[]) => {
  return useMemo(() => {
    const counts: Record<string, number> = {
      highlight: 0,
      note: 0,
      main_idea: 0,
      citation: 0,
      question: 0,
    };

    annotations.forEach((annotation) => {
      counts[annotation.type] = (counts[annotation.type] || 0) + 1;
    });

    return counts;
  }, [annotations]);
};

/**
 * Calculates detailed annotation statistics
 * @param annotations - All annotations to analyze
 * @returns Object containing counts and comprehensive statistics
 */
export const useAnnotationStatistics = (annotations: Annotation[]) => {
  const annotationCounts = useAnnotationCounts(annotations);

  const statistics = useMemo(
    () => getAnnotationStatistics(annotations),
    [annotations]
  );

  return { annotationCounts, statistics };
};
