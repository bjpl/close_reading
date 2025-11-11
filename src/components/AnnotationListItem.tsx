/**
 * AnnotationListItem Component
 *
 * Individual annotation item in the review panel with actions.
 */
import React, { useState } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  IconButton,
  Badge,
  Tooltip,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  Input,
  useDisclosure,
} from '@chakra-ui/react';
import { FiEdit2, FiTrash2, FiExternalLink } from 'react-icons/fi';
import {
  FaHighlighter,
  FaStickyNote,
  FaLightbulb,
  FaQuoteRight,
  FaQuestion,
} from 'react-icons/fa';
import type { Annotation } from '../types';
import { formatAnnotationDate } from '../utils/dateUtils';

interface AnnotationListItemProps {
  annotation: Annotation;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onJumpTo: (paragraphId: string) => void;
}

const ANNOTATION_TYPE_ICONS = {
  highlight: FaHighlighter,
  note: FaStickyNote,
  main_idea: FaLightbulb,
  citation: FaQuoteRight,
  question: FaQuestion,
};

const COLOR_MAP = {
  yellow: 'yellow.200',
  green: 'green.200',
  blue: 'blue.200',
  pink: 'pink.200',
  purple: 'purple.200',
};

export const AnnotationListItem: React.FC<AnnotationListItemProps> = ({
  annotation,
  onDelete,
  onUpdate,
  onJumpTo,
}) => {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [editedNote, setEditedNote] = useState(annotation.note || '');

  const Icon = ANNOTATION_TYPE_ICONS[annotation.type];
  const bgColor = COLOR_MAP[annotation.color || 'yellow'];

  // Get truncated text
  const displayText = annotation.content || annotation.text || '';
  const truncatedText =
    displayText.length > 50 ? `${displayText.slice(0, 50)}...` : displayText;

  const handleDelete = async () => {
    try {
      console.log('🗑️ Deleting annotation:', annotation.id);
      await onDelete(annotation.id);
      toast({
        title: 'Annotation deleted',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      onClose();
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

  const handleUpdateNote = async () => {
    try {
      console.log('✏️ Updating annotation note:', annotation.id);
      await onUpdate(annotation.id, { content: editedNote });
      toast({
        title: 'Note updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      onEditClose();
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

  const handleJumpTo = () => {
    console.log('🔗 Jumping to annotation:', annotation.id, 'in paragraph:', annotation.paragraph_id);
    onJumpTo(annotation.paragraph_id);
  };

  return (
    <>
      <Box
        p={3}
        borderRadius="md"
        borderWidth={1}
        borderColor="gray.200"
        bg="white"
        _hover={{ bg: 'gray.50', borderColor: 'gray.300' }}
        transition="all 0.2s"
      >
        <VStack align="stretch" spacing={2}>
          {/* Header with type and actions */}
          <HStack justify="space-between">
            <HStack spacing={2}>
              <Box as={Icon} color="gray.600" />
              <Badge colorScheme="gray" fontSize="xs">
                {annotation.type}
              </Badge>
              {annotation.color && (
                <Box
                  w={3}
                  h={3}
                  borderRadius="sm"
                  bg={bgColor}
                  borderWidth={1}
                  borderColor="gray.300"
                />
              )}
            </HStack>
            <HStack spacing={1}>
              <Tooltip label="Jump to annotation">
                <IconButton
                  aria-label="Jump to"
                  icon={<FiExternalLink />}
                  size="xs"
                  variant="ghost"
                  onClick={handleJumpTo}
                />
              </Tooltip>
              {(annotation.type === 'note' || annotation.note) && (
                <Tooltip label="Edit note">
                  <IconButton
                    aria-label="Edit note"
                    icon={<FiEdit2 />}
                    size="xs"
                    variant="ghost"
                    onClick={onEditOpen}
                  />
                </Tooltip>
              )}
              <Tooltip label="Delete annotation">
                <IconButton
                  aria-label="Delete"
                  icon={<FiTrash2 />}
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={onOpen}
                />
              </Tooltip>
            </HStack>
          </HStack>

          {/* Highlighted text */}
          <Text fontSize="sm" color="gray.700" noOfLines={2}>
            "{truncatedText}"
          </Text>

          {/* Note text if present */}
          {annotation.note && (
            <Box
              p={2}
              bg="gray.50"
              borderRadius="md"
              borderLeftWidth={3}
              borderLeftColor="blue.400"
            >
              <Text fontSize="xs" color="gray.600" fontStyle="italic">
                {annotation.note}
              </Text>
            </Box>
          )}

          {/* Timestamp */}
          <Text fontSize="xs" color="gray.500">
            {formatAnnotationDate(annotation.created_at)}
          </Text>
        </VStack>
      </Box>

      {/* Delete confirmation dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
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
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>
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
              <Button colorScheme="blue" onClick={handleUpdateNote} ml={3}>
                Save
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
};
