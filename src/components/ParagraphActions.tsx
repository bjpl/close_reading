/**
 * ParagraphActions Component
 *
 * Displays action indicators and helpers for paragraph interactions.
 */
import React from 'react';
import { Text, Badge, HStack } from '@chakra-ui/react';
import { FiLink } from 'react-icons/fi';

interface ParagraphActionsProps {
  isSelected: boolean;
  hasLinks: boolean;
  linkCount: number;
}

/**
 * Renders paragraph action indicators (links, selection state)
 */
export const ParagraphActions: React.FC<ParagraphActionsProps> = ({
  isSelected,
  hasLinks,
  linkCount,
}) => {
  return (
    <>
      {/* Link indicator */}
      {hasLinks && (
        <HStack position="absolute" top={2} right={2} spacing={1}>
          <FiLink size={14} />
          <Badge colorScheme="blue" fontSize="xs">
            {linkCount}
          </Badge>
        </HStack>
      )}

      {/* Selection hint */}
      {isSelected && (
        <Text fontSize="xs" color="blue.600" mt={2}>
          Shift+Click to deselect
        </Text>
      )}
    </>
  );
};
