/**
 * useParagraphAnnotations Hook
 *
 * Manages annotation CRUD operations for paragraphs.
 * Handles both local state updates and database persistence.
 */
import { useState } from 'react';
import { createToaster } from '@chakra-ui/react';

const toaster = createToaster({ placement: 'top-end' });
import { useDocumentStore } from '../stores/documentStore';
import { useAnnotations } from './useAnnotations';
import { useAuth } from './useAuth';

interface UseParagraphAnnotationsReturn {
  handleDeleteAnnotation: (annotationId: string) => Promise<void>;
  handleEditAnnotation: (annotationId: string, newContent: string) => Promise<void>;
  isDeleting: boolean;
  isEditing: boolean;
}

/**
 * Hook for managing paragraph annotations
 */
export const useParagraphAnnotations = (): UseParagraphAnnotationsReturn => {
  const { user } = useAuth();
  const { deleteAnnotation, updateAnnotation, currentDocument } = useDocumentStore();
  const { deleteAnnotation: deleteAnnotationDB, updateAnnotation: updateAnnotationDB } =
    useAnnotations(currentDocument?.id, user?.id);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  /**
   * Delete an annotation from store and database
   */
  const handleDeleteAnnotation = async (annotationId: string): Promise<void> => {
    setIsDeleting(true);
    try {
      console.log('🗑️ Deleting annotation:', annotationId);

      // Delete from Zustand store (immediate UI update)
      deleteAnnotation(annotationId);

      // Delete from database (persistence)
      await deleteAnnotationDB(annotationId);

      toaster.create({
        title: 'Annotation deleted',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('❌ Failed to delete annotation:', error);
      toaster.create({
        title: 'Failed to delete annotation',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
        duration: 3000,
      });
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Update an annotation's note
   */
  const handleEditAnnotation = async (
    annotationId: string,
    newNote: string
  ): Promise<void> => {
    setIsEditing(true);
    try {
      console.log('✏️ Updating annotation note:', annotationId);

      const updates = { note: newNote };

      // Update in Zustand store (immediate UI update)
      updateAnnotation(annotationId, updates as any);

      // Update in database (persistence)
      await updateAnnotationDB(annotationId, updates as any);

      toaster.create({
        title: 'Note updated',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('❌ Failed to update annotation:', error);
      toaster.create({
        title: 'Failed to update note',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
        duration: 3000,
      });
      throw error;
    } finally {
      setIsEditing(false);
    }
  };

  return {
    handleDeleteAnnotation,
    handleEditAnnotation,
    isDeleting,
    isEditing,
  };
};
