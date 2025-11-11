/**
 * Paragraph Component
 *
 * Renders a single paragraph with annotations and linking support.
 * Refactored to use extracted components and custom hooks.
 */
import React, { useState } from 'react';
import { Box, useDisclosure } from '@chakra-ui/react';
import { Paragraph as ParagraphType } from '../types';
import { useDocumentStore } from '../stores/documentStore';
import { useParagraphAnnotations } from '../hooks/useParagraphAnnotations';
import { useParagraphLinks } from '../hooks/useParagraphLinks';
import { AnnotatedText } from './AnnotatedText';
import { AnnotationDialog } from './AnnotationDialog';
import { ParagraphActions } from './ParagraphActions';

interface ParagraphProps {
  paragraph: ParagraphType;
}

/**
 * Main Paragraph component - orchestrates rendering and interactions
 */
export const Paragraph: React.FC<ParagraphProps> = ({ paragraph }) => {
  const {
    selectedParagraphs,
    hoveredParagraph,
    selectParagraph,
    deselectParagraph,
    setHoveredParagraph,
  } = useDocumentStore();

  // Custom hooks
  const { handleDeleteAnnotation, handleEditAnnotation } = useParagraphAnnotations();
  const { hasLinks, linkCount } = useParagraphLinks(paragraph);

  // Local state
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editedNote, setEditedNote] = useState('');
  const [annotationToDelete, setAnnotationToDelete] = useState<string | null>(null);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement | null>(null);

  // Computed values
  const isSelected = selectedParagraphs.includes(paragraph.id);
  const isHovered = hoveredParagraph === paragraph.id;

  /**
   * Handle paragraph selection with Shift+Click
   */
  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      if (isSelected) {
        deselectParagraph(paragraph.id);
      } else {
        selectParagraph(paragraph.id);
      }
    }
  };

  /**
   * Open delete confirmation dialog
   */
  const openDeleteDialog = (annotationId: string) => {
    setAnnotationToDelete(annotationId);
    onDeleteOpen();
  };

  /**
   * Confirm and execute annotation deletion
   */
  const confirmDelete = async () => {
    if (!annotationToDelete) return;

    await handleDeleteAnnotation(annotationToDelete);
    onDeleteClose();
    setAnnotationToDelete(null);
  };

  /**
   * Open edit dialog with annotation data
   */
  const openEditDialog = (annotationId: string) => {
    const annotation = (paragraph.annotations || []).find((a) => a.id === annotationId);
    if (annotation) {
      setEditingAnnotationId(annotationId);
      setEditedNote(annotation.note || annotation.content || '');
      onEditOpen();
    }
  };

  /**
   * Confirm and execute annotation edit
   */
  const confirmEdit = async () => {
    if (!editingAnnotationId) return;

    await handleEditAnnotation(editingAnnotationId, editedNote);
    onEditClose();
    setEditingAnnotationId(null);
    setEditedNote('');
  };

  return (
    <Box
      position="relative"
      p={4}
      borderWidth={1}
      borderRadius="md"
      borderColor={isSelected ? 'blue.400' : isHovered ? 'gray.300' : 'gray.200'}
      bg={isSelected ? 'blue.50' : isHovered ? 'gray.50' : 'white'}
      transition="all 0.2s"
      onClick={handleClick}
      onMouseEnter={() => setHoveredParagraph(paragraph.id)}
      onMouseLeave={() => setHoveredParagraph(null)}
      cursor={isSelected ? 'pointer' : 'default'}
      data-paragraph-id={paragraph.id}
    >
      {/* Action indicators */}
      <ParagraphActions isSelected={isSelected} hasLinks={hasLinks} linkCount={linkCount} />

      {/* Paragraph content with annotations */}
      <AnnotatedText
        content={paragraph.content}
        annotations={paragraph.annotations || []}
        onDeleteAnnotation={openDeleteDialog}
        onEditAnnotation={openEditDialog}
      />

      {/* Delete confirmation dialog */}
      <AnnotationDialog
        type="delete"
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={confirmDelete}
        cancelRef={cancelRef}
      />

      {/* Edit annotation dialog */}
      <AnnotationDialog
        type="edit"
        isOpen={isEditOpen}
        onClose={onEditClose}
        onConfirm={confirmEdit}
        cancelRef={cancelRef}
        editValue={editedNote}
        onEditValueChange={setEditedNote}
      />
    </Box>
  );
};
