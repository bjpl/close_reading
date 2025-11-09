/**
 * Zustand store for document management
 */
import { create } from 'zustand';
import { Document, ViewMode, Annotation } from '../types';

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
  linkParagraphs: (paragraphIds: string[]) => void;
  unlinkParagraph: (paragraphId: string, linkedId: string) => void;
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

  linkParagraphs: (paragraphIds) =>
    set((state) => {
      if (!state.currentDocument) return state;

      const updatedParagraphs = (state.currentDocument.paragraphs || []).map((p) => {
        if (paragraphIds.includes(p.id)) {
          const newLinks = paragraphIds.filter((id) => id !== p.id);
          const uniqueLinks = Array.from(new Set([...(p.linkedParagraphs || []), ...newLinks]));
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
    }),

  unlinkParagraph: (paragraphId, linkedId) =>
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
            linkedParagraphs: (p.linkedParagraphs || []).filter((id) => id !== paragraphId),
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
    }),
}));
