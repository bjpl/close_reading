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
  Separator,
  Collapsible,
  useDisclosure,
  Menu,
  Select,
  Stat,
  StatGroup,
  Tooltip,
  createListCollection,
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
  const { open, onToggle } = useDisclosure({ defaultOpen: true });
  const {
    open: filterOpen,
    onToggle: onToggleFilter,
  } = useDisclosure({ defaultOpen: false });
  const {
    open: statsOpen,
    onToggle: onToggleStats,
  } = useDisclosure({ defaultOpen: false });

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
      w={open ? '400px' : '50px'}
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
        aria-label={open ? 'Collapse panel' : 'Expand panel'}
        size="sm"
        position="absolute"
        left={-4}
        top={4}
        zIndex={10}
        borderRadius="full"
        onClick={onToggle}
      >
        {open ? <FiChevronRight /> : <FiChevronLeft />}
      </IconButton>

      {/* Panel content */}
      <Collapsible.Root open={open}>
        <Collapsible.Content>
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
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <IconButton
                      aria-label="Filters"
                      size="sm"
                      variant={filterOpen ? 'solid' : 'outline'}
                      onClick={onToggleFilter}
                    >
                      <FiFilter />
                    </IconButton>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content>Toggle filters</Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <IconButton
                      aria-label="Statistics"
                      size="sm"
                      variant={statsOpen ? 'solid' : 'outline'}
                      onClick={onToggleStats}
                    >
                      <FiBarChart2 />
                    </IconButton>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content>Toggle statistics</Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <IconButton
                      aria-label="Export"
                      size="sm"
                      variant="outline"
                    >
                      <FiDownload />
                    </IconButton>
                  </Menu.Trigger>
                  <Menu.Positioner>
                    <Menu.Content>
                      <Menu.Item value="json" onClick={() => handleExport('json')}>
                        Export as JSON
                      </Menu.Item>
                      <Menu.Item value="markdown" onClick={() => handleExport('markdown')}>
                        Export as Markdown
                      </Menu.Item>
                      <Menu.Item value="csv" onClick={() => handleExport('csv')}>
                        Export as CSV
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Positioner>
                </Menu.Root>
              </HStack>

              {/* Group by selector */}
              <Select.Root
                size="sm"
                value={[groupBy]}
                onValueChange={(e: { value: string[] }) =>
                  setGroupBy(e.value[0] as 'type' | 'color' | 'date')
                }
                collection={createListCollection({
                  items: [
                    { value: 'type', label: 'Group by Type' },
                    { value: 'color', label: 'Group by Color' },
                    { value: 'date', label: 'Group by Date' },
                  ],
                })}
              >
                <Select.Trigger>
                  <Select.ValueText placeholder="Group by..." />
                </Select.Trigger>
                <Select.Positioner>
                  <Select.Content>
                    {['type', 'color', 'date'].map((item) => (
                      <Select.Item key={item} item={item}>
                        {item === 'type' ? 'Group by Type' : item === 'color' ? 'Group by Color' : 'Group by Date'}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
            </VStack>
          </Box>

          {/* Statistics panel */}
          <Collapsible.Root open={statsOpen}>
            <Collapsible.Content>
            <Box p={4} bg="blue.50" borderBottomWidth={1}>
              <VStack align="stretch" gap={3}>
                <Text fontWeight="bold" fontSize="sm">
                  Statistics
                </Text>
                <StatGroup>
                  <Stat.Root>
                    <Stat.Label fontSize="xs">Total</Stat.Label>
                    <Stat.ValueText fontSize="lg">{statistics.total}</Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root>
                    <Stat.Label fontSize="xs">With Notes</Stat.Label>
                    <Stat.ValueText fontSize="lg">
                      {statistics.withNotes}
                    </Stat.ValueText>
                  </Stat.Root>
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
            </Collapsible.Content>
          </Collapsible.Root>

          {/* Filter panel */}
          <Collapsible.Root open={filterOpen}>
            <Collapsible.Content>
            <Box p={4} borderBottomWidth={1}>
              <AnnotationFilterPanel
                activeFilters={activeFilters}
                onFilterChange={setActiveFilters}
                annotationCounts={annotationCounts}
              />
            </Box>
            </Collapsible.Content>
          </Collapsible.Root>

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
                    <Separator />
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
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  );
};
