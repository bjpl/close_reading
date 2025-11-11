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
  createToaster,
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
  DialogCloseTrigger,
  Button,
  Input,
  useDisclosure,
} from '@chakra-ui/react';

const toaster = createToaster({
  placement: 'top-end',
  duration: 3000,
});
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
  const { open: isOpen, onOpen, onClose } = useDisclosure();
  const {
    open: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
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
      toaster.create({
        title: 'Annotation deleted',
        type: 'success',
        duration: 2000,
      });
      onClose();
    } catch (error) {
      console.error('❌ Failed to delete annotation:', error);
      toaster.create({
        title: 'Failed to delete annotation',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
        duration: 3000,
      });
    }
  };

  const handleUpdateNote = async () => {
    try {
      console.log('✏️ Updating annotation note:', annotation.id);
      await onUpdate(annotation.id, { content: editedNote });
      toaster.create({
        title: 'Note updated',
        type: 'success',
        duration: 2000,
      });
      onEditClose();
    } catch (error) {
      console.error('❌ Failed to update annotation:', error);
      toaster.create({
        title: 'Failed to update note',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
        duration: 3000,
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
        <VStack align="stretch" gap={2}>
          {/* Header with type and actions */}
          <HStack justify="space-between">
            <HStack gap={2}>
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
            <HStack gap={1}>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <IconButton
                    aria-label="Jump to"
                    size="xs"
                    variant="ghost"
                    onClick={handleJumpTo}
                  >
                    <FiExternalLink />
                  </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Positioner>
                  <Tooltip.Content>Jump to annotation</Tooltip.Content>
                </Tooltip.Positioner>
              </Tooltip.Root>
              {(annotation.type === 'note' || annotation.note) && (
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <IconButton
                      aria-label="Edit note"
                      size="xs"
                      variant="ghost"
                      onClick={onEditOpen}
                    >
                      <FiEdit2 />
                    </IconButton>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content>Edit note</Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              )}
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <IconButton
                    aria-label="Delete"
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    onClick={onOpen}
                  >
                    <FiTrash2 />
                  </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Positioner>
                  <Tooltip.Content>Delete annotation</Tooltip.Content>
                </Tooltip.Positioner>
              </Tooltip.Root>
            </HStack>
          </HStack>

          {/* Highlighted text */}
          <Text fontSize="sm" color="gray.700" lineClamp={2}>
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
      <DialogRoot
        open={isOpen}
        onOpenChange={(details) => !details.open && onClose()}
      >
        <DialogBackdrop />
        <DialogContent>
          <DialogHeader fontSize="lg" fontWeight="bold">
            Delete Annotation
          </DialogHeader>
          <DialogCloseTrigger />

          <DialogBody>
            Are you sure you want to delete this annotation? This action cannot be undone.
          </DialogBody>

          <DialogFooter>
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleDelete} ml={3}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>

      {/* Edit note dialog */}
      <DialogRoot
        open={isEditOpen}
        onOpenChange={(details) => !details.open && onEditClose()}
      >
        <DialogBackdrop />
        <DialogContent>
          <DialogHeader fontSize="lg" fontWeight="bold">
            Edit Note
          </DialogHeader>
          <DialogCloseTrigger />

          <DialogBody>
            <Input
              value={editedNote}
              onChange={(e) => setEditedNote(e.target.value)}
              placeholder="Enter your note..."
              autoFocus
            />
          </DialogBody>

          <DialogFooter>
            <Button onClick={onEditClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleUpdateNote} ml={3}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    </>
  );
};
