/**
 * useParagraphLinks Hook
 *
 * Manages paragraph linking functionality.
 * Note: This is a placeholder for future linking features.
 */
import { Paragraph } from '../types';

interface UseParagraphLinksReturn {
  hasLinks: boolean;
  linkCount: number;
}

/**
 * Hook for managing paragraph links
 */
export const useParagraphLinks = (paragraph: Paragraph): UseParagraphLinksReturn => {
  const hasLinks = (paragraph.linkedParagraphs || []).length > 0;
  const linkCount = (paragraph.linkedParagraphs || []).length;

  return {
    hasLinks,
    linkCount,
  };
};
