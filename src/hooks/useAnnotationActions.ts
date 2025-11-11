/**
 * useAnnotationActions Hook
 *
 * Provides handlers for annotation operations: delete, update, and jump-to.
 * Manages both local store updates and database persistence.
 */
import { useCallback } from 'react';
import { toaster } from '@chakra-ui/react';
import type { Annotation } from '../types';

interface UseAnnotationActionsOptions {
  deleteAnnotation: (annotationId: string) => void;
  updateAnnotation: (annotationId: string, updates: Partial<Annotation>) => void;
  deleteAnnotationDB: (annotationId: string) => Promise<void>;
  updateAnnotationDB: (annotationId: string, updates: Partial<Annotation>) => Promise<void>;
}

/**
 * Provides annotation action handlers with error handling
 * @param options - Configuration including store and database functions
 * @returns Object containing handleDelete, handleUpdate, and handleJumpTo functions
 */
export const useAnnotationActions = ({
  deleteAnnotation,
  updateAnnotation,
  deleteAnnotationDB,
  updateAnnotationDB,
}: UseAnnotationActionsOptions) => {
  /**
   * Deletes an annotation from both store and database
   */
  const handleDelete = useCallback(
    async (annotationId: string) => {
      try {
        console.log('🗑️ Deleting annotation:', annotationId);

        // Delete from Zustand store (immediate UI update)
        deleteAnnotation(annotationId);

        // Delete from database (persistence)
        await deleteAnnotationDB(annotationId);

        console.log('✅ Annotation deleted successfully');
      } catch (error) {
        console.error('❌ Failed to delete annotation:', error);
        toaster.create({
          title: 'Failed to delete annotation',
          description: error instanceof Error ? error.message : 'Unknown error',
          type: 'error',
          duration: 3000,
        });
      }
    },
    [deleteAnnotation, deleteAnnotationDB]
  );

  /**
   * Updates an annotation in both store and database
   */
  const handleUpdate = useCallback(
    async (annotationId: string, updates: Partial<Annotation>) => {
      try {
        console.log('✏️ Updating annotation:', annotationId, updates);

        // Update in Zustand store (immediate UI update)
        updateAnnotation(annotationId, updates);

        // Update in database (persistence)
        await updateAnnotationDB(annotationId, updates);

        console.log('✅ Annotation updated successfully');
      } catch (error) {
        console.error('❌ Failed to update annotation:', error);
        toaster.create({
          title: 'Failed to update annotation',
          description: error instanceof Error ? error.message : 'Unknown error',
          type: 'error',
          duration: 3000,
        });
      }
    },
    [updateAnnotation, updateAnnotationDB]
  );

  /**
   * Scrolls to and highlights the paragraph containing the annotation
   */
  const handleJumpTo = useCallback((paragraphId: string) => {
    const element = document.querySelector(
      `[data-paragraph-id="${paragraphId}"]`
    );
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Briefly highlight the paragraph
      element.classList.add('highlight-animation');
      setTimeout(() => {
        element.classList.remove('highlight-animation');
      }, 2000);
    }
  }, []);

  return {
    handleDelete,
    handleUpdate,
    handleJumpTo,
  };
};
