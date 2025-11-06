/**
 * Zustand store for annotation management
 */
import { create } from 'zustand';
import { AnnotationType, AnnotationColor } from '../types';

interface AnnotationState {
  activeToolType: AnnotationType | null;
  activeColor: AnnotationColor;
  selectedText: string | null;
  selectionRange: { start: number; end: number } | null;

  // Actions
  setActiveToolType: (type: AnnotationType | null) => void;
  setActiveColor: (color: AnnotationColor) => void;
  setSelectedText: (text: string | null) => void;
  setSelectionRange: (range: { start: number; end: number } | null) => void;
  clearSelection: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  activeToolType: null,
  activeColor: 'yellow',
  selectedText: null,
  selectionRange: null,

  setActiveToolType: (type) => set({ activeToolType: type }),

  setActiveColor: (color) => set({ activeColor: color }),

  setSelectedText: (text) => set({ selectedText: text }),

  setSelectionRange: (range) => set({ selectionRange: range }),

  clearSelection: () =>
    set({
      selectedText: null,
      selectionRange: null,
      activeToolType: null,
    }),
}));
