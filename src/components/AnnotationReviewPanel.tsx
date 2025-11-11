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
  useToast,
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
import type { Annotation, AnnotationType, AnnotationColor } from '../types';
import { useDocumentStore } from '../stores/documentStore';
import { useAnnotations } from '../hooks/useAnnotations';
import { useAuth } from '../hooks/useAuth';
import { AnnotationListItem } from './AnnotationListItem';
import { AnnotationFilterPanel } from './AnnotationFilterPanel';
import {
  exportAsJSON,
  exportAsMarkdown,
  exportAsCSV,
  downloadFile,
  getAnnotationStatistics,
} from '../services/annotationExport';
import { formatSimpleDate } from '../utils/dateUtils';

interface AnnotationReviewPanelProps {
  documentId: string;
}

export const AnnotationReviewPanel: React.FC<AnnotationReviewPanelProps> = ({
  documentId,
}) => {
  const { user } = useAuth();
  const toast = useToast();
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

  const [groupBy, setGroupBy] = useState<'type' | 'color' | 'date'>('type');
  const [activeFilters, setActiveFilters] = useState<{
    types: AnnotationType[];
    colors: AnnotationColor[];
  }>({
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

  // Filter annotations
  const filteredAnnotations = useMemo(() => {
    let filtered = [...allAnnotations];

    if (activeFilters.types.length > 0) {
      filtered = filtered.filter((a) => activeFilters.types.includes(a.type));
    }

    if (activeFilters.colors.length > 0) {
      filtered = filtered.filter(
        (a) => a.color && activeFilters.colors.includes(a.color)
      );
    }

    return filtered;
  }, [allAnnotations, activeFilters]);

  // Group annotations
  const groupedAnnotations = useMemo(() => {
    const groups: Record<string, Annotation[]> = {};

    filteredAnnotations.forEach((annotation) => {
      let key = '';

      if (groupBy === 'type') {
        key = annotation.type;
      } else if (groupBy === 'color') {
        key = annotation.color || 'no-color';
      } else if (groupBy === 'date') {
        key = formatSimpleDate(annotation.created_at);
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(annotation);
    });

    return groups;
  }, [filteredAnnotations, groupBy]);

  // Get annotation counts
  const annotationCounts = useMemo(() => {
    const counts: Record<string, number> = {
      highlight: 0,
      note: 0,
      main_idea: 0,
      citation: 0,
      question: 0,
    };

    allAnnotations.forEach((annotation) => {
      counts[annotation.type] = (counts[annotation.type] || 0) + 1;
    });

    return counts;
  }, [allAnnotations]);

  // Get statistics
  const statistics = useMemo(
    () => getAnnotationStatistics(allAnnotations),
    [allAnnotations]
  );

  // Handle delete
  const handleDelete = async (annotationId: string) => {
    try {
      console.log('🗑️ Deleting annotation:', annotationId);

      // Delete from Zustand store (immediate UI update)
      deleteAnnotation(annotationId);

      // Delete from database (persistence)
      await deleteAnnotationDB(annotationId);

      console.log('✅ Annotation deleted successfully');
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

  // Handle update
  const handleUpdate = async (
    annotationId: string,
    updates: Partial<Annotation>
  ) => {
    try {
      console.log('✏️ Updating annotation:', annotationId, updates);

      // Update in Zustand store (immediate UI update)
      updateAnnotation(annotationId, updates);

      // Update in database (persistence)
      await updateAnnotationDB(annotationId, updates);

      console.log('✅ Annotation updated successfully');
    } catch (error) {
      console.error('❌ Failed to update annotation:', error);
      toast({
        title: 'Failed to update annotation',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle jump to annotation
  const handleJumpTo = (paragraphId: string) => {
    const element = document.querySelector(
      `[data-paragraph-id="${paragraphId}"]`
    );
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Briefly highlight the paragraph
      element.classList.add('highlight-animation');
      setTimeout(() => {
        element.classList.remove('highlight-animation');
      }, 2000);
    }
  };

  // Handle export
  const handleExport = (format: 'json' | 'markdown' | 'csv') => {
    const documentTitle = currentDocument?.title || 'Untitled Document';
    const exportOptions = {
      includeTimestamps: true,
      includeColors: true,
      filterByType: activeFilters.types.length > 0 ? activeFilters.types : undefined,
      filterByColor: activeFilters.colors.length > 0 ? activeFilters.colors : undefined,
    };

    let content = '';
    let filename = '';

    if (format === 'json') {
      content = exportAsJSON(filteredAnnotations, documentTitle, exportOptions);
      filename = `${documentTitle}-annotations.json`;
    } else if (format === 'markdown') {
      content = exportAsMarkdown(filteredAnnotations, documentTitle, exportOptions);
      filename = `${documentTitle}-annotations.md`;
    } else if (format === 'csv') {
      content = exportAsCSV(filteredAnnotations, documentTitle, exportOptions);
      filename = `${documentTitle}-annotations.csv`;
    }

    downloadFile(content, filename);

    toast({
      title: 'Annotations exported',
      description: `Exported as ${format.toUpperCase()}`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

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
        icon={isOpen ? <FiChevronRight /> : <FiChevronLeft />}
        size="sm"
        position="absolute"
        left={-4}
        top={4}
        zIndex={10}
        borderRadius="full"
        onClick={onToggle}
      />

      {/* Panel content */}
      <Collapse in={isOpen} animateOpacity>
        <VStack align="stretch" h="100%" spacing={0}>
          {/* Header */}
          <Box p={4} borderBottomWidth={1} borderColor="gray.200">
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <Text fontWeight="bold" fontSize="lg">
                  Annotations
                </Text>
                <Badge colorScheme="blue" fontSize="md">
                  {filteredAnnotations.length}
                </Badge>
              </HStack>

              {/* Action buttons */}
              <HStack spacing={2}>
                <Tooltip label="Toggle filters">
                  <IconButton
                    aria-label="Filters"
                    icon={<FiFilter />}
                    size="sm"
                    variant={isFilterOpen ? 'solid' : 'outline'}
                    onClick={onToggleFilter}
                  />
                </Tooltip>
                <Tooltip label="Toggle statistics">
                  <IconButton
                    aria-label="Statistics"
                    icon={<FiBarChart2 />}
                    size="sm"
                    variant={isStatsOpen ? 'solid' : 'outline'}
                    onClick={onToggleStats}
                  />
                </Tooltip>
                <Menu>
                  <MenuButton
                    as={IconButton}
                    aria-label="Export"
                    icon={<FiDownload />}
                    size="sm"
                    variant="outline"
                  />
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
              <VStack align="stretch" spacing={3}>
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
                <VStack align="stretch" spacing={1}>
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
              <VStack align="stretch" spacing={4}>
                {Object.entries(groupedAnnotations).map(([group, annotations]) => (
                  <VStack key={group} align="stretch" spacing={2}>
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
