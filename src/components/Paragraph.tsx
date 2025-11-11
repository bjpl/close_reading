/**
 * Paragraph Component
 *
 * Renders a single paragraph with annotations and linking support.
 */
import React, { useState } from 'react';
import {
  Box,
  Text,
  Badge,
  HStack,
  useToast,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  Input,
} from '@chakra-ui/react';
import { Paragraph as ParagraphType } from '../types';
import { useDocumentStore } from '../stores/documentStore';
import { useAnnotations } from '../hooks/useAnnotations';
import { useAuth } from '../hooks/useAuth';
import { FiLink } from 'react-icons/fi';
import { AnnotationActions } from './AnnotationActions';

interface ParagraphProps {
  paragraph: ParagraphType;
}

export const Paragraph: React.FC<ParagraphProps> = ({ paragraph }) => {
  const { user } = useAuth();
  const toast = useToast();
  const {
    selectedParagraphs,
    hoveredParagraph,
    selectParagraph,
    deselectParagraph,
    setHoveredParagraph,
    deleteAnnotation,
    updateAnnotation,
    currentDocument,
  } = useDocumentStore();

  const { deleteAnnotation: deleteAnnotationDB, updateAnnotation: updateAnnotationDB } =
    useAnnotations(currentDocument?.id, user?.id);

  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editedNote, setEditedNote] = useState('');
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const [annotationToDelete, setAnnotationToDelete] = useState<string | null>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const isSelected = selectedParagraphs.includes(paragraph.id);
  const isHovered = hoveredParagraph === paragraph.id;
  const hasLinks = (paragraph.linkedParagraphs || []).length > 0;

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      if (isSelected) {
        deselectParagraph(paragraph.id);
      } else {
        selectParagraph(paragraph.id);
      }
    }
  };

  // Handle annotation deletion
  const handleDeleteAnnotation = async (annotationId: string) => {
    setAnnotationToDelete(annotationId);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    if (!annotationToDelete) return;

    try {
      console.log('🗑️ Deleting annotation:', annotationToDelete);

      // Delete from Zustand store (immediate UI update)
      deleteAnnotation(annotationToDelete);

      // Delete from database (persistence)
      await deleteAnnotationDB(annotationToDelete);

      toast({
        title: 'Annotation deleted',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      onDeleteClose();
      setAnnotationToDelete(null);
    } catch (error) {
      console.error('❌ Failed to delete annotation:', error);
      toast({
        title: 'Failed to delete annotation',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle annotation editing
  const handleEditAnnotation = (annotationId: string) => {
    const annotation = (paragraph.annotations || []).find((a) => a.id === annotationId);
    if (annotation) {
      setEditingAnnotationId(annotationId);
      setEditedNote(annotation.note || annotation.content || '');
      onEditOpen();
    }
  };

  const confirmEdit = async () => {
    if (!editingAnnotationId) return;

    try {
      console.log('✏️ Updating annotation:', editingAnnotationId);

      const updates = { content: editedNote };

      // Update in Zustand store (immediate UI update)
      updateAnnotation(editingAnnotationId, updates);

      // Update in database (persistence)
      await updateAnnotationDB(editingAnnotationId, updates);

      toast({
        title: 'Note updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      onEditClose();
      setEditingAnnotationId(null);
      setEditedNote('');
    } catch (error) {
      console.error('❌ Failed to update annotation:', error);
      toast({
        title: 'Failed to update note',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Render text with annotations
  const renderAnnotatedText = () => {
    if ((paragraph.annotations || []).length === 0) {
      return <Text>{paragraph.content}</Text>;
    }

    // Sort annotations by start offset
    const sortedAnnotations = [...(paragraph.annotations || [])].sort(
      (a, b) => a.startOffset - b.startOffset
    );

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedAnnotations.forEach((annotation, idx) => {
      // Add text before annotation
      if (annotation.startOffset > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {paragraph.content.slice(lastIndex, annotation.startOffset)}
          </span>
        );
      }

      // Add annotated text
      const annotatedText = paragraph.content.slice(
        annotation.startOffset,
        annotation.endOffset
      );

      const bgColor = {
        yellow: 'yellow.100',
        green: 'green.100',
        blue: 'blue.100',
        pink: 'pink.100',
        purple: 'purple.100',
      }[annotation.color || 'yellow'];

      // Different styling for each annotation type with hover support
      if (annotation.type === 'main_idea') {
        parts.push(
          <Box
            as="mark"
            key={`annotation-${annotation.id}`}
            bg="transparent"
            borderBottom="3px solid"
            borderColor="orange.500"
            px={0.5}
            fontWeight="bold"
            title={annotation.note || 'Main Idea'}
            cursor="pointer"
            position="relative"
            onMouseEnter={() => setHoveredAnnotation(annotation.id)}
            onMouseLeave={() => setHoveredAnnotation(null)}
          >
            {annotatedText}
            {hoveredAnnotation === annotation.id && (
              <AnnotationActions
                annotation={annotation}
                onDelete={handleDeleteAnnotation}
                onEdit={handleEditAnnotation}
              />
            )}
          </Box>
        );
      } else if (annotation.type === 'citation') {
        parts.push(
          <Box
            as="mark"
            key={`annotation-${annotation.id}`}
            bg="blue.50"
            borderLeft="3px solid"
            borderColor="blue.500"
            px={1}
            fontStyle="italic"
            title={annotation.note || 'Citation'}
            cursor="pointer"
            position="relative"
            onMouseEnter={() => setHoveredAnnotation(annotation.id)}
            onMouseLeave={() => setHoveredAnnotation(null)}
          >
            {annotatedText}
            {hoveredAnnotation === annotation.id && (
              <AnnotationActions
                annotation={annotation}
                onDelete={handleDeleteAnnotation}
                onEdit={handleEditAnnotation}
              />
            )}
          </Box>
        );
      } else if (annotation.type === 'question') {
        parts.push(
          <Box
            as="mark"
            key={`annotation-${annotation.id}`}
            bg="purple.50"
            borderBottom="2px dotted"
            borderColor="purple.500"
            px={0.5}
            title={annotation.note || 'Question'}
            cursor="help"
            position="relative"
            onMouseEnter={() => setHoveredAnnotation(annotation.id)}
            onMouseLeave={() => setHoveredAnnotation(null)}
          >
            {annotatedText}
            {hoveredAnnotation === annotation.id && (
              <AnnotationActions
                annotation={annotation}
                onDelete={handleDeleteAnnotation}
                onEdit={handleEditAnnotation}
              />
            )}
          </Box>
        );
      } else if (annotation.type === 'note') {
        parts.push(
          <Box
            as="mark"
            key={`annotation-${annotation.id}`}
            bg={bgColor}
            borderTop="2px solid"
            borderColor="gray.600"
            px={0.5}
            borderRadius="sm"
            title={annotation.note || 'Note'}
            cursor="pointer"
            position="relative"
            onMouseEnter={() => setHoveredAnnotation(annotation.id)}
            onMouseLeave={() => setHoveredAnnotation(null)}
          >
            {annotatedText}
            {hoveredAnnotation === annotation.id && (
              <AnnotationActions
                annotation={annotation}
                onDelete={handleDeleteAnnotation}
                onEdit={handleEditAnnotation}
              />
            )}
          </Box>
        );
      } else {
        // Regular highlight
        parts.push(
          <Box
            as="mark"
            key={`annotation-${annotation.id}`}
            bg={bgColor}
            px={0.5}
            borderRadius="sm"
            title={annotation.note}
            cursor="pointer"
            position="relative"
            onMouseEnter={() => setHoveredAnnotation(annotation.id)}
            onMouseLeave={() => setHoveredAnnotation(null)}
          >
            {annotatedText}
            {hoveredAnnotation === annotation.id && (
              <AnnotationActions
                annotation={annotation}
                onDelete={handleDeleteAnnotation}
                onEdit={handleEditAnnotation}
              />
            )}
          </Box>
        );
      }

      lastIndex = annotation.endOffset;
    });

    // Add remaining text
    if (lastIndex < paragraph.content.length) {
      parts.push(
        <span key="text-end">{paragraph.content.slice(lastIndex)}</span>
      );
    }

    return <Text>{parts}</Text>;
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
      {/* Link indicator */}
      {hasLinks && (
        <HStack position="absolute" top={2} right={2} spacing={1}>
          <FiLink size={14} />
          <Badge colorScheme="blue" fontSize="xs">
            {(paragraph.linkedParagraphs || []).length}
          </Badge>
        </HStack>
      )}

      {/* Paragraph content with annotations */}
      {renderAnnotatedText()}

      {/* Selection hint */}
      {isSelected && (
        <Text fontSize="xs" color="blue.600" mt={2}>
          Shift+Click to deselect
        </Text>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Annotation
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this annotation? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Edit note dialog */}
      <AlertDialog
        isOpen={isEditOpen}
        leastDestructiveRef={cancelRef}
        onClose={onEditClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Edit Note
            </AlertDialogHeader>

            <AlertDialogBody>
              <Input
                value={editedNote}
                onChange={(e) => setEditedNote(e.target.value)}
                placeholder="Enter your note..."
                autoFocus
              />
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onEditClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={confirmEdit} ml={3}>
                Save
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};
