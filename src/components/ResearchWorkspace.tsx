/**
 * Research Workspace Component
 *
 * Main workspace for research activities including document viewing,
 * annotation management, and bibliography integration.
 *
 * @module components/ResearchWorkspace
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Button,
  IconButton,
  Text,
  createToaster,
  Separator,
} from '@chakra-ui/react';
import { FiBook, FiEdit3, FiLink, FiDownload } from 'react-icons/fi';
import { ParsedDocument } from '../services/DocumentParserService';
import { Annotation } from '../services/AnnotationService';

/**
 * Research workspace props
 */
export interface ResearchWorkspaceProps {
  document: ParsedDocument;
  onAnnotationCreate?: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

/**
 * Active panel types
 */
type ActivePanel = 'annotations' | 'bibliography' | 'links' | 'export';

/**
 * ResearchWorkspace component
 *
 * Provides a comprehensive research interface with:
 * - Document viewer with annotations
 * - Annotation management panel
 * - Bibliography manager
 * - Link visualization
 * - Export options
 *
 * @param props - Component props
 */
const toaster = createToaster({
  placement: 'bottom-end',
  pauseOnPageIdle: true,
});

export const ResearchWorkspace: React.FC<ResearchWorkspaceProps> = ({
  document,
  onAnnotationCreate,
}) => {
  const [activePanel, setActivePanel] = useState<ActivePanel>('annotations');
  const [selectedText, setSelectedText] = useState<string>('');
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);

  /**
   * Handle text selection in document
   */
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedText('');
      setSelection(null);
      return;
    }

    const text = selection.toString();
    setSelectedText(text);

    // Calculate offsets (simplified - would need more robust implementation)
    const range = selection.getRangeAt(0);
    setSelection({
      start: range.startOffset,
      end: range.endOffset,
    });
  }, []);

  /**
   * Handle quick highlight
   */
  const handleQuickHighlight = useCallback(() => {
    if (!selectedText || !selection) {
      toaster.create({
        title: 'No text selected',
        description: 'Please select text to highlight',
        type: 'warning',
        duration: 3000,
      });
      return;
    }

    // Create annotation (assuming first paragraph for demo)
    const annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'> = {
      documentId: 'current-doc', // Would come from props
      userId: 'current-user', // Would come from auth context
      target: {
        type: 'range',
        id: document.paragraphs[0]?.id || 'p-0000',
        range: {
          startOffset: selection.start,
          endOffset: selection.end,
          selectedText,
        },
      },
      type: 'highlight',
      color: 'yellow',
      tags: [],
      isPrivate: false,
    };

    onAnnotationCreate?.(annotation);

    toaster.create({
      title: 'Highlighted',
      description: 'Text highlighted successfully',
      type: 'success',
      duration: 2000,
    });

    // Clear selection
    window.getSelection()?.removeAllRanges();
    setSelectedText('');
    setSelection(null);
  }, [selectedText, selection, document, onAnnotationCreate]);

  return (
    <Flex height="100vh" overflow="hidden">
      {/* Main content area - Document viewer */}
      <Box flex="1" overflowY="auto" p={6} bg="white" onMouseUp={handleTextSelection}>
        <VStack gap={4} align="stretch">
          {/* Document header */}
          <Box>
            <Text fontSize="2xl" fontWeight="bold" mb={2}>
              {document.metadata.title || 'Untitled Document'}
            </Text>
            <HStack gap={4} fontSize="sm" color="gray.600">
              {document.metadata.author && <Text>By {document.metadata.author}</Text>}
              <Text>
                {document.metadata.wordCount?.toLocaleString()} words
              </Text>
              <Text>{document.paragraphs.length} paragraphs</Text>
            </HStack>
          </Box>

          <Separator />

          {/* Quick actions toolbar */}
          {selectedText && (
            <Box
              position="sticky"
              top={0}
              zIndex={10}
              bg="blue.50"
              p={3}
              borderRadius="md"
              border="1px"
              borderColor="blue.200"
            >
              <HStack gap={2}>
                <Text fontSize="sm" color="gray.700" flex="1">
                  "{selectedText.substring(0, 50)}
                  {selectedText.length > 50 ? '...' : ''}"
                </Text>
                <Button
                  size="sm"
                  colorScheme="yellow"
                  onClick={handleQuickHighlight}
                >
                  <FiEdit3 /> Highlight
                </Button>
                <Button size="sm" variant="outline" onClick={() => setActivePanel('annotations')}>
                  Add Note
                </Button>
              </HStack>
            </Box>
          )}

          {/* Document content */}
          <VStack gap={6} align="stretch">
            {document.paragraphs.map((paragraph, index) => (
              <Box
                key={paragraph.id}
                id={paragraph.id}
                p={4}
                borderRadius="md"
                _hover={{ bg: 'gray.50' }}
                transition="background 0.2s"
              >
                <Text fontSize="sm" color="gray.400" mb={2}>
                  Paragraph {index + 1}
                </Text>
                <Text lineHeight="tall">{paragraph.text}</Text>
              </Box>
            ))}
          </VStack>
        </VStack>
      </Box>

      {/* Side panel */}
      <Box
        width="400px"
        borderLeft="1px"
        borderColor="gray.200"
        bg="gray.50"
        overflowY="auto"
      >
        <VStack gap={0} align="stretch" height="100%">
          {/* Panel tabs */}
          <HStack gap={0} borderBottom="1px" borderColor="gray.200" bg="white">
            <IconButton
              aria-label="Annotations"
              variant={activePanel === 'annotations' ? 'solid' : 'ghost'}
              colorScheme={activePanel === 'annotations' ? 'blue' : 'gray'}
              borderRadius={0}
              flex="1"
              onClick={() => setActivePanel('annotations')}
            >
              <FiEdit3 />
            </IconButton>
            <IconButton
              aria-label="Bibliography"
              variant={activePanel === 'bibliography' ? 'solid' : 'ghost'}
              colorScheme={activePanel === 'bibliography' ? 'blue' : 'gray'}
              borderRadius={0}
              flex="1"
              onClick={() => setActivePanel('bibliography')}
            >
              <FiBook />
            </IconButton>
            <IconButton
              aria-label="Links"
              variant={activePanel === 'links' ? 'solid' : 'ghost'}
              colorScheme={activePanel === 'links' ? 'blue' : 'gray'}
              borderRadius={0}
              flex="1"
              onClick={() => setActivePanel('links')}
            >
              <FiLink />
            </IconButton>
            <IconButton
              aria-label="Export"
              variant={activePanel === 'export' ? 'solid' : 'ghost'}
              colorScheme={activePanel === 'export' ? 'blue' : 'gray'}
              borderRadius={0}
              flex="1"
              onClick={() => setActivePanel('export')}
            >
              <FiDownload />
            </IconButton>
          </HStack>

          {/* Panel content */}
          <Box flex="1" p={4}>
            {activePanel === 'annotations' && (
              <VStack gap={4} align="stretch">
                <Text fontSize="lg" fontWeight="semibold">
                  Annotations
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Select text in the document to add highlights and notes.
                </Text>
                {/* Annotation list would go here */}
              </VStack>
            )}

            {activePanel === 'bibliography' && (
              <VStack gap={4} align="stretch">
                <Text fontSize="lg" fontWeight="semibold">
                  Bibliography
                </Text>
                <Button size="sm">
                  <FiBook /> Add Citation
                </Button>
                {/* Bibliography entries would go here */}
              </VStack>
            )}

            {activePanel === 'links' && (
              <VStack gap={4} align="stretch">
                <Text fontSize="lg" fontWeight="semibold">
                  Paragraph Links
                </Text>
                <Text fontSize="sm" color="gray.600">
                  View connections between paragraphs.
                </Text>
                {/* Link visualization would go here */}
              </VStack>
            )}

            {activePanel === 'export' && (
              <VStack gap={4} align="stretch">
                <Text fontSize="lg" fontWeight="semibold">
                  Export Options
                </Text>
                <VStack gap={2} align="stretch">
                  <Button><FiDownload /> Export as BibTeX</Button>
                  <Button><FiDownload /> Export as RIS</Button>
                  <Button><FiDownload /> Export as JSON</Button>
                  <Button><FiDownload /> Export as Markdown</Button>
                </VStack>
              </VStack>
            )}
          </Box>
        </VStack>
      </Box>
    </Flex>
  );
};

export default ResearchWorkspace;
