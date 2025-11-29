/**
 * AnnotationService Tests
 *
 * Unit tests for the annotation and highlighting system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AnnotationService,
  type AnnotationFilter,
} from '../../src/services/AnnotationService';

describe('AnnotationService', () => {
  let service: AnnotationService;

  beforeEach(() => {
    service = new AnnotationService();
  });

  describe('Annotation CRUD Operations', () => {
    it('should create a new annotation', () => {
      const annotation = service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: {
          type: 'paragraph',
          id: 'p-0001',
        },
        type: 'highlight',
        color: 'yellow',
        tags: ['important'],
        isPrivate: false,
      });

      expect(annotation).toBeDefined();
      expect(annotation.id).toBeDefined();
      expect(annotation.type).toBe('highlight');
      expect(annotation.color).toBe('yellow');
      expect(annotation.tags).toContain('important');
      expect(annotation.createdAt).toBeInstanceOf(Date);
    });

    it('should create annotation with range selection', () => {
      const annotation = service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: {
          type: 'range',
          id: 'p-0001',
          range: {
            startOffset: 10,
            endOffset: 50,
            selectedText: 'This is the selected text for annotation.',
          },
        },
        type: 'note',
        color: 'blue',
        content: 'This is an important passage.',
        tags: [],
        isPrivate: false,
      });

      expect(annotation.target.range).toBeDefined();
      expect(annotation.target.range?.selectedText).toBe('This is the selected text for annotation.');
      expect(annotation.content).toBe('This is an important passage.');
    });

    it('should update an annotation', () => {
      const created = service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'highlight',
        color: 'yellow',
        tags: [],
        isPrivate: false,
      });

      const updated = service.updateAnnotation(created.id, {
        content: 'Added a note',
        color: 'green',
        tags: ['reviewed'],
      });

      expect(updated).toBeDefined();
      expect(updated!.content).toBe('Added a note');
      expect(updated!.color).toBe('green');
      expect(updated!.tags).toContain('reviewed');
      // Note: Using >= because operations can complete within same millisecond
      expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(created.createdAt.getTime());
    });

    it('should delete an annotation', () => {
      const annotation = service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'highlight',
        color: 'yellow',
        tags: [],
        isPrivate: false,
      });

      const deleted = service.deleteAnnotation(annotation.id);
      expect(deleted).toBe(true);
      expect(service.getAnnotation(annotation.id)).toBeNull();
    });

    it('should retrieve annotation by ID', () => {
      const created = service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'highlight',
        color: 'yellow',
        tags: [],
        isPrivate: false,
      });

      const retrieved = service.getAnnotation(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
    });
  });

  describe('Querying Annotations', () => {
    beforeEach(() => {
      // Create test annotations
      service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'highlight',
        color: 'yellow',
        content: 'Important concept',
        tags: ['key-point'],
        isPrivate: false,
      });

      service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-2',
        target: { type: 'paragraph', id: 'p-0002' },
        type: 'note',
        color: 'blue',
        content: 'Needs clarification',
        tags: ['question'],
        isPrivate: false,
      });

      service.createAnnotation({
        documentId: 'doc-2',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'citation',
        color: 'green',
        tags: ['reference'],
        isPrivate: false,
      });
    });

    it('should get all annotations for a document', () => {
      const annotations = service.getDocumentAnnotations('doc-1');
      expect(annotations).toHaveLength(2);
    });

    it('should get annotations for a specific paragraph', () => {
      const annotations = service.getParagraphAnnotations('p-0001');
      expect(annotations).toHaveLength(2);
    });

    it('should filter annotations by type', () => {
      const filter: AnnotationFilter = {
        types: ['highlight'],
      };

      const annotations = service.getDocumentAnnotations('doc-1', filter);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].type).toBe('highlight');
    });

    it('should filter annotations by color', () => {
      const filter: AnnotationFilter = {
        colors: ['blue'],
      };

      const annotations = service.getDocumentAnnotations('doc-1', filter);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].color).toBe('blue');
    });

    it('should filter annotations by tags', () => {
      const filter: AnnotationFilter = {
        tags: ['key-point'],
      };

      const annotations = service.getDocumentAnnotations('doc-1', filter);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].tags).toContain('key-point');
    });

    it('should filter annotations by user', () => {
      const filter: AnnotationFilter = {
        userId: 'user-1',
      };

      const annotations = service.getDocumentAnnotations('doc-1', filter);
      expect(annotations).toHaveLength(1);
      expect(annotations[0].userId).toBe('user-1');
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: {
          type: 'range',
          id: 'p-0001',
          range: {
            startOffset: 0,
            endOffset: 20,
            selectedText: 'machine learning basics',
          },
        },
        type: 'highlight',
        color: 'yellow',
        content: 'Fundamental concepts of ML',
        tags: ['ml', 'fundamentals'],
        isPrivate: false,
      });

      service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0002' },
        type: 'note',
        color: 'blue',
        content: 'Deep learning is a subset of machine learning',
        tags: ['deep-learning'],
        isPrivate: false,
      });
    });

    it('should search annotations by content', () => {
      const results = service.searchAnnotations('machine learning');
      expect(results).toHaveLength(2);
    });

    it('should search annotations by selected text', () => {
      const results = service.searchAnnotations('basics');
      expect(results).toHaveLength(1);
      expect(results[0].target.range?.selectedText).toContain('basics');
    });

    it('should search annotations by tags', () => {
      const results = service.searchAnnotations('fundamentals');
      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('fundamentals');
    });

    it('should search within specific document', () => {
      const results = service.searchAnnotations('learning', 'doc-1');
      expect(results).toHaveLength(2);
      expect(results.every(a => a.documentId === 'doc-1')).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Create diverse annotations
      service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'highlight',
        color: 'yellow',
        tags: [],
        isPrivate: false,
      });

      service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'note',
        color: 'blue',
        tags: ['important'],
        isPrivate: false,
      });

      service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0002' },
        type: 'highlight',
        color: 'yellow',
        tags: ['key-point'],
        isPrivate: false,
      });
    });

    it('should calculate annotation statistics', () => {
      const stats = service.getStatistics('doc-1');

      expect(stats.total).toBe(3);
      expect(stats.byType.highlight).toBe(2);
      expect(stats.byType.note).toBe(1);
      expect(stats.byColor.yellow).toBe(2);
      expect(stats.byColor.blue).toBe(1);
    });

    it('should track tag usage', () => {
      const stats = service.getStatistics('doc-1');

      expect(stats.byTag.important).toBe(1);
      expect(stats.byTag['key-point']).toBe(1);
    });

    it('should identify most annotated paragraphs', () => {
      const stats = service.getStatistics('doc-1');

      expect(stats.mostAnnotatedParagraphs).toHaveLength(2);
      expect(stats.mostAnnotatedParagraphs[0].paragraphId).toBe('p-0001');
      expect(stats.mostAnnotatedParagraphs[0].count).toBe(2);
    });
  });

  describe('Tag Management', () => {
    it('should add tags to annotation', () => {
      const annotation = service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'highlight',
        color: 'yellow',
        tags: ['initial'],
        isPrivate: false,
      });

      const updated = service.addTags(annotation.id, ['new', 'added']);

      expect(updated).toBeDefined();
      expect(updated!.tags).toContain('initial');
      expect(updated!.tags).toContain('new');
      expect(updated!.tags).toContain('added');
    });

    it('should remove tags from annotation', () => {
      const annotation = service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'highlight',
        color: 'yellow',
        tags: ['tag1', 'tag2', 'tag3'],
        isPrivate: false,
      });

      const updated = service.removeTags(annotation.id, ['tag2']);

      expect(updated).toBeDefined();
      expect(updated!.tags).toContain('tag1');
      expect(updated!.tags).toContain('tag3');
      expect(updated!.tags).not.toContain('tag2');
    });
  });

  describe('Annotation Groups', () => {
    it('should create annotation group', () => {
      const ann1 = service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'highlight',
        color: 'yellow',
        tags: [],
        isPrivate: false,
      });

      const ann2 = service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0002' },
        type: 'highlight',
        color: 'yellow',
        tags: [],
        isPrivate: false,
      });

      const group = service.createGroup(
        'Related Concepts',
        [ann1.id, ann2.id],
        { description: 'Two related annotations', color: 'yellow' }
      );

      expect(group).toBeDefined();
      expect(group.name).toBe('Related Concepts');
      expect(group.annotationIds).toHaveLength(2);
      expect(group.color).toBe('yellow');
    });

    it('should retrieve all groups', () => {
      const ann1 = service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'highlight',
        color: 'yellow',
        tags: [],
        isPrivate: false,
      });

      service.createGroup('Group 1', [ann1.id]);
      service.createGroup('Group 2', [ann1.id]);

      const groups = service.getAllGroups();
      expect(groups).toHaveLength(2);
    });
  });

  describe('Import/Export', () => {
    beforeEach(() => {
      service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'highlight',
        color: 'yellow',
        tags: ['test'],
        isPrivate: false,
      });
    });

    it('should export annotations to JSON', () => {
      const json = service.exportToJSON('doc-1');

      expect(json).toBeDefined();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });

    it('should import annotations from JSON', () => {
      const exported = service.exportToJSON();
      service.clear();

      const count = service.importFromJSON(exported);

      expect(count).toBe(1);
      expect(service.getDocumentAnnotations('doc-1')).toHaveLength(1);
    });
  });

  describe('Clear Functionality', () => {
    it('should clear all annotations and groups', () => {
      service.createAnnotation({
        documentId: 'doc-1',
        userId: 'user-1',
        target: { type: 'paragraph', id: 'p-0001' },
        type: 'highlight',
        color: 'yellow',
        tags: [],
        isPrivate: false,
      });

      service.createGroup('Test Group', []);

      service.clear();

      expect(service.getDocumentAnnotations('doc-1')).toHaveLength(0);
      expect(service.getAllGroups()).toHaveLength(0);
    });
  });
});
