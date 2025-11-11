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
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
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
      <HStack spacing={1}>
        {/* Show note in popover */}
        {hasNote && (
          <Popover trigger="hover" placement="top">
            <PopoverTrigger>
              <IconButton
                aria-label="View note"
                icon={<FiMessageSquare />}
                size="xs"
                variant="ghost"
              />
            </PopoverTrigger>
            <PopoverContent>
              <PopoverBody>
                <Text fontSize="sm">{annotation.note}</Text>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        )}

        {/* Edit button (for notes) */}
        {(annotation.type === 'note' || hasNote) && (
          <Tooltip label="Edit note">
            <IconButton
              aria-label="Edit"
              icon={<FiEdit2 />}
              size="xs"
              variant="ghost"
              onClick={() => onEdit(annotation.id)}
            />
          </Tooltip>
        )}

        {/* Delete button */}
        <Tooltip label="Delete">
          <IconButton
            aria-label="Delete"
            icon={<FiTrash2 />}
            size="xs"
            variant="ghost"
            colorScheme="red"
            onClick={() => onDelete(annotation.id)}
          />
        </Tooltip>
      </HStack>
    </Box>
  );
};
