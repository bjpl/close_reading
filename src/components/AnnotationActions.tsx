/**
 * AnnotationActions Component
 *
 * Inline action menu that appears when hovering over annotations.
 */
import React from 'react';
import {
  Box,
  HStack,
  IconButton,
  Tooltip,
  Popover,
  Text,
} from '@chakra-ui/react';
import { FiEdit2, FiTrash2, FiMessageSquare } from 'react-icons/fi';
import type { Annotation } from '../types';

interface AnnotationActionsProps {
  annotation: Annotation;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  position?: { top: number; left: number };
}

export const AnnotationActions: React.FC<AnnotationActionsProps> = ({
  annotation,
  onDelete,
  onEdit,
  position,
}) => {
  const hasNote = !!annotation.note;

  return (
    <Box
      position="absolute"
      top={position?.top || -30}
      left={position?.left || 0}
      zIndex={1000}
      bg="white"
      borderRadius="md"
      borderWidth={1}
      borderColor="gray.300"
      boxShadow="lg"
      p={1}
    >
      <HStack gap={1}>
        {/* Show note in popover */}
        {hasNote && (
          <Popover.Root positioning={{ placement: 'top' }}>
            <Popover.Trigger asChild>
              <IconButton
                aria-label="View note"
                size="xs"
                variant="ghost"
              >
                <FiMessageSquare />
              </IconButton>
            </Popover.Trigger>
            <Popover.Positioner>
              <Popover.Content>
                <Popover.Body>
                  <Text fontSize="sm">{annotation.note}</Text>
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Popover.Root>
        )}

        {/* Edit button (for notes) */}
        {(annotation.type === 'note' || hasNote) && (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <IconButton
                aria-label="Edit"
                size="xs"
                variant="ghost"
                onClick={() => onEdit(annotation.id)}
              >
                <FiEdit2 />
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>Edit note</Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        )}

        {/* Delete button */}
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <IconButton
              aria-label="Delete"
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={() => onDelete(annotation.id)}
            >
              <FiTrash2 />
            </IconButton>
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content>Delete</Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>
      </HStack>
    </Box>
  );
};
