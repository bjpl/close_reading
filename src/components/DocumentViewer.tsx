/**
 * DocumentViewer Component
 *
 * Displays the document with support for both original and sentence views.
 * Handles text selection and annotation rendering.
 */
import React, { useCallback, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonGroup,
} from '@chakra-ui/react';
import { useDocumentStore } from '../stores/documentStore';
import { useAnnotationStore } from '../stores/annotationStore';
import { Paragraph } from './Paragraph';
import { SentenceView } from './SentenceView';

export const DocumentViewer: React.FC = () => {
  const { currentDocument, viewMode, setViewMode } = useDocumentStore();
  const { setSelectedText, setSelectionRange } = useAnnotationStore();
  const viewerRef = useRef<HTMLDivElement>(null);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedText(null);
      setSelectionRange(null);
      return;
    }

    const selectedText = selection.toString();
    const range = selection.getRangeAt(0);

    // Calculate offsets relative to the document
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;

    setSelectedText(selectedText);
    setSelectionRange({ start: startOffset, end: endOffset });
  }, []);

  if (!currentDocument) {
    return (
      <Box p={8} textAlign="center">
        <Text color="gray.500">No document loaded. Please upload a document to get started.</Text>
      </Box>
    );
  }

  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* View Mode Toggle */}
      <HStack p={4} borderBottomWidth={1} borderColor="gray.200" spacing={4}>
        <Text fontWeight="medium" fontSize="sm">
          View:
        </Text>
        <ButtonGroup size="sm" isAttached variant="outline">
          <Button
            colorScheme={viewMode === 'original' ? 'blue' : 'gray'}
            onClick={() => setViewMode('original')}
          >
            Original
          </Button>
          <Button
            colorScheme={viewMode === 'sentence' ? 'blue' : 'gray'}
            onClick={() => setViewMode('sentence')}
          >
            Sentence by Sentence
          </Button>
        </ButtonGroup>
      </HStack>

      {/* Document Content */}
      <Box
        ref={viewerRef}
        flex={1}
        overflow="auto"
        p={8}
        bg="white"
        onMouseUp={handleTextSelection}
      >
        <VStack spacing={6} align="stretch">
          {/* Document Title */}
          <Text fontSize="2xl" fontWeight="bold" mb={4}>
            {currentDocument.title}
          </Text>

          {/* Render based on view mode */}
          {viewMode === 'original' ? (
            currentDocument.paragraphs.map((paragraph) => (
              <Paragraph key={paragraph.id} paragraph={paragraph} />
            ))
          ) : (
            <SentenceView sentences={currentDocument.sentences} />
          )}
        </VStack>
      </Box>
    </Box>
  );
};
