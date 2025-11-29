/**
 * Annotation Service
 *
 * Comprehensive annotation and highlighting system for research documents.
 * Supports multiple annotation types, colors, tags, and hierarchical notes.
 *
 * @module services/AnnotationService
 */

/**
 * Annotation types
 */
export type AnnotationType =
  | 'highlight'
  | 'note'
  | 'main_idea'
  | 'citation'
  | 'question'
  | 'critical'
  | 'definition'
  | 'example'
  | 'summary';

/**
 * Highlight colors
 */
export type HighlightColor =
  | 'yellow'
  | 'green'
  | 'blue'
  | 'pink'
  | 'orange'
  | 'purple'
  | 'red'
  | 'gray';

/**
 * Text selection range
 */
export interface SelectionRange {
  startOffset: number;
  endOffset: number;
  selectedText: string;
}

/**
 * Annotation target (what is being annotated)
 */
export interface AnnotationTarget {
  type: 'paragraph' | 'sentence' | 'range';
  id: string; // paragraph or sentence ID
  range?: SelectionRange;
}

/**
 * Annotation interface
 */
export interface Annotation {
  id: string;
  documentId: string;
  userId: string;
  target: AnnotationTarget;
  type: AnnotationType;
  content?: string; // Note text
  color: HighlightColor;
  tags: string[];
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    citationId?: string; // Link to bibliography entry
    importance?: 1 | 2 | 3 | 4 | 5; // Rating
    reviewed?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Annotation filter options
 */
export interface AnnotationFilter {
  types?: AnnotationType[];
  colors?: HighlightColor[];
  tags?: string[];
  userId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  importance?: number[];
  reviewed?: boolean;
}

/**
 * Annotation statistics
 */
export interface AnnotationStatistics {
  total: number;
  byType: Record<AnnotationType, number>;
  byColor: Record<HighlightColor, number>;
  byTag: Record<string, number>;
  averagePerParagraph: number;
  mostAnnotatedParagraphs: Array<{ paragraphId: string; count: number }>;
}

/**
 * Annotation group for related annotations
 */
export interface AnnotationGroup {
  id: string;
  name: string;
  description?: string;
  annotationIds: string[];
  color?: HighlightColor;
  createdAt: Date;
}

/**
 * Annotation service for managing document annotations
 *
 * @example
 * ```typescript
 * const annotationService = new AnnotationService();
 *
 * // Create highlight annotation
 * const annotation = annotationService.createAnnotation({
 *   documentId: 'doc-1',
 *   userId: 'user-1',
 *   target: { type: 'paragraph', id: 'p-0001' },
 *   type: 'highlight',
 *   color: 'yellow',
 * });
 *
 * // Search annotations
 * const results = annotationService.searchAnnotations('important concept');
 * ```
 */
export class AnnotationService {
  private annotations: Map<string, Annotation>;
  private groups: Map<string, AnnotationGroup>;
  private documentIndex: Map<string, Set<string>>; // documentId -> annotationIds
  private paragraphIndex: Map<string, Set<string>>; // paragraphId -> annotationIds

  constructor() {
    this.annotations = new Map();
    this.groups = new Map();
    this.documentIndex = new Map();
    this.paragraphIndex = new Map();
  }

  /**
   * Create a new annotation
   *
   * @param data - Annotation data
   * @returns Created annotation
   */
  createAnnotation(
    data: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>
  ): Annotation {
    const id = this.generateId();
    const annotation: Annotation = {
      ...data,
      id,
      tags: data.tags || [],
      isPrivate: data.isPrivate ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.annotations.set(id, annotation);
    this.updateIndices(annotation);

    return annotation;
  }

  /**
   * Update an existing annotation
   *
   * @param id - Annotation ID
   * @param updates - Partial updates
   * @returns Updated annotation or null
   */
  updateAnnotation(
    id: string,
    updates: Partial<Omit<Annotation, 'id' | 'createdAt'>>
  ): Annotation | null {
    const annotation = this.annotations.get(id);
    if (!annotation) return null;

    const updated: Annotation = {
      ...annotation,
      ...updates,
      updatedAt: new Date(),
    };

    this.annotations.set(id, updated);
    this.updateIndices(updated);

    return updated;
  }

  /**
   * Delete an annotation
   *
   * @param id - Annotation ID
   * @returns True if deleted
   */
  deleteAnnotation(id: string): boolean {
    const annotation = this.annotations.get(id);
    if (!annotation) return false;

    this.removeFromIndices(annotation);
    return this.annotations.delete(id);
  }

  /**
   * Get annotation by ID
   *
   * @param id - Annotation ID
   * @returns Annotation or null
   */
  getAnnotation(id: string): Annotation | null {
    return this.annotations.get(id) || null;
  }

  /**
   * Get all annotations for a document
   *
   * @param documentId - Document ID
   * @param filter - Optional filter
   * @returns Array of annotations
   */
  getDocumentAnnotations(
    documentId: string,
    filter?: AnnotationFilter
  ): Annotation[] {
    const ids = this.documentIndex.get(documentId) || new Set();
    const annotations = Array.from(ids)
      .map((id) => this.annotations.get(id))
      .filter((a): a is Annotation => a !== undefined);

    return filter ? this.applyFilter(annotations, filter) : annotations;
  }

  /**
   * Get annotations for a specific paragraph
   *
   * @param paragraphId - Paragraph ID
   * @returns Array of annotations
   */
  getParagraphAnnotations(paragraphId: string): Annotation[] {
    const ids = this.paragraphIndex.get(paragraphId) || new Set();
    return Array.from(ids)
      .map((id) => this.annotations.get(id))
      .filter((a): a is Annotation => a !== undefined);
  }

  /**
   * Search annotations by content
   *
   * @param query - Search query
   * @param documentId - Optional document filter
   * @returns Matching annotations
   */
  searchAnnotations(query: string, documentId?: string): Annotation[] {
    const lowerQuery = query.toLowerCase();
    let annotations = Array.from(this.annotations.values());

    if (documentId) {
      const ids = this.documentIndex.get(documentId) || new Set();
      annotations = annotations.filter((a) => ids.has(a.id));
    }

    return annotations.filter((annotation) => {
      if (annotation.content?.toLowerCase().includes(lowerQuery)) return true;
      if (annotation.target.range?.selectedText.toLowerCase().includes(lowerQuery)) return true;
      if (annotation.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))) return true;
      return false;
    });
  }

  /**
   * Filter annotations
   *
   * @param annotations - Annotations to filter
   * @param filter - Filter criteria
   * @returns Filtered annotations
   */
  applyFilter(annotations: Annotation[], filter: AnnotationFilter): Annotation[] {
    return annotations.filter((annotation) => {
      if (filter.types && !filter.types.includes(annotation.type)) return false;
      if (filter.colors && !filter.colors.includes(annotation.color)) return false;
      if (filter.userId && annotation.userId !== filter.userId) return false;
      if (filter.reviewed !== undefined && annotation.metadata?.reviewed !== filter.reviewed) return false;

      if (filter.tags && filter.tags.length > 0) {
        const hasTag = filter.tags.some((tag) => annotation.tags.includes(tag));
        if (!hasTag) return false;
      }

      if (filter.importance && filter.importance.length > 0) {
        const importance = annotation.metadata?.importance;
        if (!importance || !filter.importance.includes(importance)) return false;
      }

      if (filter.dateRange) {
        const created = annotation.createdAt;
        if (created < filter.dateRange.start || created > filter.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get annotation statistics
   *
   * @param documentId - Optional document filter
   * @returns Statistics object
   */
  getStatistics(documentId?: string): AnnotationStatistics {
    let annotations = Array.from(this.annotations.values());

    if (documentId) {
      const ids = this.documentIndex.get(documentId) || new Set();
      annotations = annotations.filter((a) => ids.has(a.id));
    }

    const byType: Partial<Record<AnnotationType, number>> = {};
    const byColor: Partial<Record<HighlightColor, number>> = {};
    const byTag: Record<string, number> = {};
    const paragraphCounts: Record<string, number> = {};

    annotations.forEach((annotation) => {
      // Type counts
      byType[annotation.type] = (byType[annotation.type] || 0) + 1;

      // Color counts
      byColor[annotation.color] = (byColor[annotation.color] || 0) + 1;

      // Tag counts
      annotation.tags.forEach((tag) => {
        byTag[tag] = (byTag[tag] || 0) + 1;
      });

      // Paragraph counts
      const targetId = annotation.target.id;
      paragraphCounts[targetId] = (paragraphCounts[targetId] || 0) + 1;
    });

    const mostAnnotated = Object.entries(paragraphCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([paragraphId, count]) => ({ paragraphId, count }));

    const uniqueParagraphs = Object.keys(paragraphCounts).length;

    return {
      total: annotations.length,
      byType: byType as Record<AnnotationType, number>,
      byColor: byColor as Record<HighlightColor, number>,
      byTag,
      averagePerParagraph: uniqueParagraphs > 0 ? annotations.length / uniqueParagraphs : 0,
      mostAnnotatedParagraphs: mostAnnotated,
    };
  }

  /**
   * Create annotation group
   *
   * @param name - Group name
   * @param annotationIds - Annotation IDs to include
   * @param options - Additional options
   * @returns Created group
   */
  createGroup(
    name: string,
    annotationIds: string[],
    options?: { description?: string; color?: HighlightColor }
  ): AnnotationGroup {
    const id = this.generateId('group');
    const group: AnnotationGroup = {
      id,
      name,
      description: options?.description,
      annotationIds,
      color: options?.color,
      createdAt: new Date(),
    };

    this.groups.set(id, group);
    return group;
  }

  /**
   * Get all groups
   *
   * @returns Array of annotation groups
   */
  getAllGroups(): AnnotationGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Add tags to annotation
   *
   * @param id - Annotation ID
   * @param tags - Tags to add
   * @returns Updated annotation
   */
  addTags(id: string, tags: string[]): Annotation | null {
    const annotation = this.annotations.get(id);
    if (!annotation) return null;

    const newTags = Array.from(new Set([...annotation.tags, ...tags]));
    return this.updateAnnotation(id, { tags: newTags });
  }

  /**
   * Remove tags from annotation
   *
   * @param id - Annotation ID
   * @param tags - Tags to remove
   * @returns Updated annotation
   */
  removeTags(id: string, tags: string[]): Annotation | null {
    const annotation = this.annotations.get(id);
    if (!annotation) return null;

    const newTags = annotation.tags.filter((tag) => !tags.includes(tag));
    return this.updateAnnotation(id, { tags: newTags });
  }

  /**
   * Export annotations to JSON
   *
   * @param documentId - Optional document filter
   * @returns JSON string
   */
  exportToJSON(documentId?: string): string {
    const annotations = documentId
      ? this.getDocumentAnnotations(documentId)
      : Array.from(this.annotations.values());

    return JSON.stringify(annotations, null, 2);
  }

  /**
   * Import annotations from JSON
   *
   * @param json - JSON string
   * @returns Number of imported annotations
   */
  importFromJSON(json: string): number {
    try {
      const annotations = JSON.parse(json) as Annotation[];
      let count = 0;

      annotations.forEach((annotation) => {
        // Convert date strings back to Date objects
        annotation.createdAt = new Date(annotation.createdAt);
        annotation.updatedAt = new Date(annotation.updatedAt);

        this.annotations.set(annotation.id, annotation);
        this.updateIndices(annotation);
        count++;
      });

      return count;
    } catch (error) {
      throw new Error(`Failed to import annotations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all annotations
   */
  clear(): void {
    this.annotations.clear();
    this.groups.clear();
    this.documentIndex.clear();
    this.paragraphIndex.clear();
  }

  // Private helper methods

  private generateId(prefix = 'ann'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateIndices(annotation: Annotation): void {
    // Document index
    if (!this.documentIndex.has(annotation.documentId)) {
      this.documentIndex.set(annotation.documentId, new Set());
    }
    this.documentIndex.get(annotation.documentId)!.add(annotation.id);

    // Paragraph index
    const targetId = annotation.target.id;
    if (!this.paragraphIndex.has(targetId)) {
      this.paragraphIndex.set(targetId, new Set());
    }
    this.paragraphIndex.get(targetId)!.add(annotation.id);
  }

  private removeFromIndices(annotation: Annotation): void {
    // Document index
    this.documentIndex.get(annotation.documentId)?.delete(annotation.id);

    // Paragraph index
    const targetId = annotation.target.id;
    this.paragraphIndex.get(targetId)?.delete(annotation.id);
  }
}

/**
 * Singleton instance for global access
 */
export const annotationService = new AnnotationService();
