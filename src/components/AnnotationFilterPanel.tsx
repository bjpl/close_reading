/**
 * AnnotationFilterPanel Component
 *
 * Allows filtering annotations by type, color, and date range.
 */
import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonGroup,
  Badge,
} from '@chakra-ui/react';
import { FiFilter, FiX } from 'react-icons/fi';
import type { AnnotationType, AnnotationColor } from '../types';

interface AnnotationFilterPanelProps {
  activeFilters: {
    types: AnnotationType[];
    colors: AnnotationColor[];
  };
  onFilterChange: (filters: { types: AnnotationType[]; colors: AnnotationColor[] }) => void;
  annotationCounts: Record<string, number>;
}

const ANNOTATION_TYPES: { value: AnnotationType; label: string }[] = [
  { value: 'highlight', label: 'Highlight' },
  { value: 'note', label: 'Note' },
  { value: 'main_idea', label: 'Main Idea' },
  { value: 'citation', label: 'Citation' },
  { value: 'question', label: 'Question' },
];

const COLOR_OPTIONS: { value: AnnotationColor; label: string; bg: string }[] = [
  { value: 'yellow', label: 'Yellow', bg: '#FEF3C7' },
  { value: 'green', label: 'Green', bg: '#D1FAE5' },
  { value: 'blue', label: 'Blue', bg: '#DBEAFE' },
  { value: 'pink', label: 'Pink', bg: '#FCE7F3' },
  { value: 'purple', label: 'Purple', bg: '#EDE9FE' },
];

export const AnnotationFilterPanel: React.FC<AnnotationFilterPanelProps> = ({
  activeFilters,
  onFilterChange,
  annotationCounts,
}) => {
  const toggleType = (type: AnnotationType) => {
    const newTypes = activeFilters.types.includes(type)
      ? activeFilters.types.filter((t) => t !== type)
      : [...activeFilters.types, type];

    onFilterChange({ ...activeFilters, types: newTypes });
  };

  const toggleColor = (color: AnnotationColor) => {
    const newColors = activeFilters.colors.includes(color)
      ? activeFilters.colors.filter((c) => c !== color)
      : [...activeFilters.colors, color];

    onFilterChange({ ...activeFilters, colors: newColors });
  };

  const clearAllFilters = () => {
    onFilterChange({ types: [], colors: [] });
  };

  const hasActiveFilters = activeFilters.types.length > 0 || activeFilters.colors.length > 0;

  return (
    <Box p={4} bg="gray.50" borderRadius="md" borderWidth={1}>
      <VStack align="stretch" spacing={4}>
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <FiFilter />
            <Text fontWeight="bold" fontSize="sm">
              Filter Annotations
            </Text>
          </HStack>
          {hasActiveFilters && (
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<FiX />}
              onClick={clearAllFilters}
            >
              Clear
            </Button>
          )}
        </HStack>

        {/* Filter by Type */}
        <Box>
          <Text fontSize="xs" fontWeight="medium" mb={2} color="gray.600">
            BY TYPE
          </Text>
          <ButtonGroup size="xs" spacing={2} flexWrap="wrap">
            {ANNOTATION_TYPES.map(({ value, label }) => (
              <Button
                key={value}
                onClick={() => toggleType(value)}
                variant={activeFilters.types.includes(value) ? 'solid' : 'outline'}
                colorScheme={activeFilters.types.includes(value) ? 'blue' : 'gray'}
                rightIcon={
                  annotationCounts[value] > 0 ? (
                    <Badge
                      colorScheme={activeFilters.types.includes(value) ? 'blue' : 'gray'}
                      fontSize="xs"
                    >
                      {annotationCounts[value]}
                    </Badge>
                  ) : undefined
                }
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>
        </Box>

        {/* Filter by Color */}
        <Box>
          <Text fontSize="xs" fontWeight="medium" mb={2} color="gray.600">
            BY COLOR
          </Text>
          <HStack spacing={2}>
            {COLOR_OPTIONS.map(({ value, label, bg }) => (
              <Box
                key={value}
                as="button"
                w={6}
                h={6}
                borderRadius="md"
                bg={bg}
                borderWidth={2}
                borderColor={activeFilters.colors.includes(value) ? 'blue.600' : 'gray.300'}
                onClick={() => toggleColor(value)}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ transform: 'scale(1.15)' }}
                title={label}
              />
            ))}
          </HStack>
        </Box>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <Box pt={2} borderTopWidth={1}>
            <Text fontSize="xs" color="gray.600">
              Showing{' '}
              {activeFilters.types.length > 0 && (
                <Text as="span" fontWeight="bold">
                  {activeFilters.types.join(', ')}
                </Text>
              )}
              {activeFilters.types.length > 0 && activeFilters.colors.length > 0 && ' in '}
              {activeFilters.colors.length > 0 && (
                <Text as="span" fontWeight="bold">
                  {activeFilters.colors.join(', ')}
                </Text>
              )}
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};
