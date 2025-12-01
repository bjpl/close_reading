/**
 * Ruvector Adapters
 *
 * Backward compatibility adapters that allow Ruvector services to work
 * with existing Close Reading codebase APIs.
 */

export { SimilarityAdapter } from './SimilarityAdapter';
export type {
  SimilarityConfig,
  SimilarParagraph,
  SimilarityPair,
  SimilarityCluster
} from './SimilarityAdapter';

export { ParagraphLinksAdapter } from './ParagraphLinksAdapter';
export type {
  ParagraphLink,
  LinkConfig,
  ParagraphGraph
} from './ParagraphLinksAdapter';
