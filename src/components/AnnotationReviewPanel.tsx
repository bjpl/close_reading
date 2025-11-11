/**
 * AnnotationReviewPanel Component
 *
 * Collapsible sidebar showing all annotations with filtering, statistics, and export.
 */
import React, { useState, useMemo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Badge,
  Divider,
  Collapse,
  useDisclosure,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Select,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiDownload,
  FiBarChart2,
} from 'react-icons/fi';
import type { Annotation } from '../types';
import { useDocumentStore } from '../stores/documentStore';
import { useAnnotations } from '../hooks/useAnnotations';
import { useAuth } from '../hooks/useAuth';
import { AnnotationListItem } from './AnnotationListItem';
import { AnnotationFilterPanel } from './AnnotationFilterPanel';
import { useAnnotationFilters, type AnnotationFilters } from '../hooks/useAnnotationFilters';
import { useAnnotationGrouping, type GroupByOption } from '../hooks/useAnnotationGrouping';
import { useAnnotationStatistics } from '../hooks/useAnnotationStatistics';
import { useAnnotationActions } from '../hooks/useAnnotationActions';
import { useAnnotationExport } from '../hooks/useAnnotationExport';

interface AnnotationReviewPanelProps {
  documentId: string;
}

export const AnnotationReviewPanel: React.FC<AnnotationReviewPanelProps> = ({
  documentId,
}) => {
  const { user } = useAuth();
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });
  const {
    isOpen: isFilterOpen,
    onToggle: onToggleFilter,
  } = useDisclosure({ defaultIsOpen: false });
  const {
    isOpen: isStatsOpen,
    onToggle: onToggleStats,
  } = useDisclosure({ defaultIsOpen: false });

  const { currentDocument, deleteAnnotation, updateAnnotation } =
    useDocumentStore();
  const { deleteAnnotation: deleteAnnotationDB, updateAnnotation: updateAnnotationDB } =
    useAnnotations(documentId, user?.id);

  const [groupBy, setGroupBy] = useState<GroupByOption>('type');
  const [activeFilters, setActiveFilters] = useState<AnnotationFilters>({
    types: [],
    colors: [],
  });

  // Get all annotations from document
  const allAnnotations = useMemo(() => {
    if (!currentDocument?.paragraphs) return [];

    const annotations: Annotation[] = [];
    currentDocument.paragraphs.forEach((paragraph) => {
      if (paragraph.annotations) {
        annotations.push(...paragraph.annotations);
      }
    });

    return annotations;
  }, [currentDocument]);

  // Use custom hooks for filtering, grouping, and statistics
  const filteredAnnotations = useAnnotationFilters(allAnnotations, activeFilters);
  const groupedAnnotations = useAnnotationGrouping(filteredAnnotations, groupBy);
  const { annotationCounts, statistics } = useAnnotationStatistics(allAnnotations);

  // Use custom hooks for actions and export
  const { handleDelete, handleUpdate, handleJumpTo } = useAnnotationActions({
    deleteAnnotation,
    updateAnnotation,
    deleteAnnotationDB,
    updateAnnotationDB,
  });

  const { handleExport } = useAnnotationExport({
    annotations: filteredAnnotations,
    documentTitle: currentDocument?.title || 'Untitled Document',
    activeFilters,
  });

  return (
    <Box
      w={isOpen ? '400px' : '50px'}
      h="100%"
      borderLeftWidth={1}
      borderColor="gray.200"
      bg="white"
      transition="width 0.3s"
      display="flex"
      flexDirection="column"
      position="relative"
    >
      {/* Toggle button */}
      <IconButton
        aria-label={isOpen ? 'Collapse panel' : 'Expand panel'}
        size="sm"
        position="absolute"
        left={-4}
        top={4}
        zIndex={10}
        borderRadius="full"
        onClick={onToggle}
      >
        {isOpen ? <FiChevronRight /> : <FiChevronLeft />}
      </IconButton>

      {/* Panel content */}
      <Collapse in={isOpen} animateOpacity>
        <VStack align="stretch" h="100%" gap={0}>
          {/* Header */}
          <Box p={4} borderBottomWidth={1} borderColor="gray.200">
            <VStack align="stretch" gap={3}>
              <HStack justify="space-between">
                <Text fontWeight="bold" fontSize="lg">
                  Annotations
                </Text>
                <Badge colorScheme="blue" fontSize="md">
                  {filteredAnnotations.length}
                </Badge>
              </HStack>

              {/* Action buttons */}
              <HStack gap={2}>
                <Tooltip label="Toggle filters">
                  <IconButton
                    aria-label="Filters"
                    size="sm"
                    variant={isFilterOpen ? 'solid' : 'outline'}
                    onClick={onToggleFilter}
                  >
                    <FiFilter />
                  </IconButton>
                </Tooltip>
                <Tooltip label="Toggle statistics">
                  <IconButton
                    aria-label="Statistics"
                    size="sm"
                    variant={isStatsOpen ? 'solid' : 'outline'}
                    onClick={onToggleStats}
                  >
                    <FiBarChart2 />
                  </IconButton>
                </Tooltip>
                <Menu>
                  <MenuButton
                    as={IconButton}
                    aria-label="Export"
                    size="sm"
                    variant="outline"
                  >
                    <FiDownload />
                  </MenuButton>
                  <MenuList>
                    <MenuItem onClick={() => handleExport('json')}>
                      Export as JSON
                    </MenuItem>
                    <MenuItem onClick={() => handleExport('markdown')}>
                      Export as Markdown
                    </MenuItem>
                    <MenuItem onClick={() => handleExport('csv')}>
                      Export as CSV
                    </MenuItem>
                  </MenuList>
                </Menu>
              </HStack>

              {/* Group by selector */}
              <Select
                size="sm"
                value={groupBy}
                onChange={(e) =>
                  setGroupBy(e.target.value as 'type' | 'color' | 'date')
                }
              >
                <option value="type">Group by Type</option>
                <option value="color">Group by Color</option>
                <option value="date">Group by Date</option>
              </Select>
            </VStack>
          </Box>

          {/* Statistics panel */}
          <Collapse in={isStatsOpen} animateOpacity>
            <Box p={4} bg="blue.50" borderBottomWidth={1}>
              <VStack align="stretch" gap={3}>
                <Text fontWeight="bold" fontSize="sm">
                  Statistics
                </Text>
                <StatGroup>
                  <Stat>
                    <StatLabel fontSize="xs">Total</StatLabel>
                    <StatNumber fontSize="lg">{statistics.total}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel fontSize="xs">With Notes</StatLabel>
                    <StatNumber fontSize="lg">
                      {statistics.withNotes}
                    </StatNumber>
                  </Stat>
                </StatGroup>
                {statistics.mostUsedColor && (
                  <Text fontSize="xs" color="gray.600">
                    Most used color: <strong>{statistics.mostUsedColor}</strong>
                  </Text>
                )}
                <VStack align="stretch" gap={1}>
                  <Text fontSize="xs" fontWeight="medium">
                    By Type:
                  </Text>
                  {Object.entries(statistics.byType).map(([type, count]) => (
                    <HStack key={type} justify="space-between" fontSize="xs">
                      <Text>{type}</Text>
                      <Badge>{count}</Badge>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            </Box>
          </Collapse>

          {/* Filter panel */}
          <Collapse in={isFilterOpen} animateOpacity>
            <Box p={4} borderBottomWidth={1}>
              <AnnotationFilterPanel
                activeFilters={activeFilters}
                onFilterChange={setActiveFilters}
                annotationCounts={annotationCounts}
              />
            </Box>
          </Collapse>

          {/* Annotations list */}
          <Box flex={1} overflowY="auto" p={4}>
            {filteredAnnotations.length === 0 ? (
              <Text color="gray.500" textAlign="center" mt={8}>
                No annotations yet
              </Text>
            ) : (
              <VStack align="stretch" gap={4}>
                {Object.entries(groupedAnnotations).map(([group, annotations]) => (
                  <VStack key={group} align="stretch" gap={2}>
                    <HStack>
                      <Text
                        fontSize="xs"
                        fontWeight="bold"
                        textTransform="uppercase"
                        color="gray.600"
                      >
                        {group}
                      </Text>
                      <Badge colorScheme="gray">{annotations.length}</Badge>
                    </HStack>
                    <Divider />
                    {annotations.map((annotation) => (
                      <AnnotationListItem
                        key={annotation.id}
                        annotation={annotation}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                        onJumpTo={handleJumpTo}
                      />
                    ))}
                  </VStack>
                ))}
              </VStack>
            )}
          </Box>
        </VStack>
      </Collapse>
    </Box>
  );
};
