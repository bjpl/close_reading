/**
 * Zustand store for document management
 */
import { create } from 'zustand';
import { Document, ViewMode, Annotation } from '../types';
import {
  createParagraphLinks,
  removeParagraphLink,
} from '../services/paragraphLinks';
import logger from '../lib/logger';

interface DocumentState {
  currentDocument: Document | null;
  viewMode: ViewMode;
  selectedParagraphs: string[];
  hoveredParagraph: string | null;

  // Actions
  setDocument: (document: Document) => void;
  setViewMode: (mode: ViewMode) => void;
  selectParagraph: (id: string) => void;
  deselectParagraph: (id: string) => void;
  clearSelection: () => void;
  setHoveredParagraph: (id: string | null) => void;
  addAnnotation: (paragraphId: string, annotation: Annotation) => void;
  updateAnnotation: (annotationId: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (annotationId: string) => void;
  linkParagraphs: (paragraphIds: string[]) => Promise<void>;
  unlinkParagraph: (paragraphId: string, linkedId: string) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  currentDocument: null,
  viewMode: 'original' as const,
  selectedParagraphs: [],
  hoveredParagraph: null,

  setDocument: (document) => set({ currentDocument: document }),

  setViewMode: (mode) => set({ viewMode: mode }),

  selectParagraph: (id) =>
    set((state) => ({
      selectedParagraphs: state.selectedParagraphs.includes(id)
        ? state.selectedParagraphs
        : [...state.selectedParagraphs, id],
    })),

  deselectParagraph: (id) =>
    set((state) => ({
      selectedParagraphs: state.selectedParagraphs.filter((p) => p !== id),
    })),

  clearSelection: () => set({ selectedParagraphs: [] }),

  setHoveredParagraph: (id) => set({ hoveredParagraph: id }),

  addAnnotation: (paragraphId, annotation) =>
    set((state) => {
      if (!state.currentDocument) return state;

      const updatedParagraphs = (state.currentDocument.paragraphs || []).map((p) =>
        p.id === paragraphId
          ? { ...p, annotations: [...(p.annotations || []), annotation] }
          : p
      );

      return {
        currentDocument: {
          ...state.currentDocument,
          paragraphs: updatedParagraphs,
        },
      };
    }),

  updateAnnotation: (annotationId, updates) =>
    set((state) => {
      if (!state.currentDocument) return state;

      const updatedParagraphs = (state.currentDocument.paragraphs || []).map((p) => ({
        ...p,
        annotations: (p.annotations || []).map((a) =>
          a.id === annotationId ? { ...a, ...updates } : a
        ),
      }));

      return {
        currentDocument: {
          ...state.currentDocument,
          paragraphs: updatedParagraphs,
        },
      };
    }),

  deleteAnnotation: (annotationId) =>
    set((state) => {
      if (!state.currentDocument) return state;

      const updatedParagraphs = (state.currentDocument.paragraphs || []).map((p) => ({
        ...p,
        annotations: (p.annotations || []).filter((a) => a.id !== annotationId),
      }));

      return {
        currentDocument: {
          ...state.currentDocument,
          paragraphs: updatedParagraphs,
        },
      };
    }),

  linkParagraphs: async (paragraphIds) => {
    const state = useDocumentStore.getState();
    if (!state.currentDocument) return;

    try {
      // Get user ID from current document
      const userId = state.currentDocument.userId || state.currentDocument.user_id;
      if (!userId) {
        logger.error({ message: 'No user ID found for creating paragraph links' });
        return;
      }

      // Create links in database
      await createParagraphLinks(paragraphIds, userId);
      logger.info({ message: 'Paragraph links created', count: paragraphIds.length });

      // Update local state
      set((state) => {
        if (!state.currentDocument) return state;

        const updatedParagraphs = (state.currentDocument.paragraphs || []).map((p) => {
          if (paragraphIds.includes(p.id)) {
            const newLinks = paragraphIds.filter((id) => id !== p.id);
            const uniqueLinks = Array.from(
              new Set([...(p.linkedParagraphs || []), ...newLinks])
            );
            return { ...p, linkedParagraphs: uniqueLinks };
          }
          return p;
        });

        return {
          currentDocument: {
            ...state.currentDocument,
            paragraphs: updatedParagraphs,
          },
        };
      });
    } catch (error) {
      logger.error({ message: 'Failed to create paragraph links', error });
      throw error;
    }
  },

  unlinkParagraph: async (paragraphId, linkedId) => {
    const state = useDocumentStore.getState();
    if (!state.currentDocument) return;

    try {
      // Remove link from database (bidirectional)
      await removeParagraphLink(paragraphId, linkedId);
      logger.info({ message: 'Paragraph link removed', paragraphId, linkedId });

      // Update local state
      set((state) => {
        if (!state.currentDocument) return state;

        const updatedParagraphs = (state.currentDocument.paragraphs || []).map((p) => {
          if (p.id === paragraphId) {
            return {
              ...p,
              linkedParagraphs: (p.linkedParagraphs || []).filter((id) => id !== linkedId),
            };
          }
          if (p.id === linkedId) {
            return {
              ...p,
              linkedParagraphs: (p.linkedParagraphs || []).filter(
                (id) => id !== paragraphId
              ),
            };
          }
          return p;
        });

        return {
          currentDocument: {
            ...state.currentDocument,
            paragraphs: updatedParagraphs,
          },
        };
      });
    } catch (error) {
      logger.error({ message: 'Failed to remove paragraph link', error });
      throw error;
    }
  },
}));
