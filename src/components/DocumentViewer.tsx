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
  createToaster,
} from '@chakra-ui/react';
import { useDocumentStore } from '../stores/documentStore';
import { useAnnotationStore } from '../stores/annotationStore';
import { useAnnotations } from '../hooks/useAnnotations';
import { useAuth } from '../hooks/useAuth';
import { Paragraph } from './Paragraph';
import { SentenceView } from './SentenceView';
import logger, { logError, logDataOperation } from '../lib/logger';

const toaster = createToaster({ placement: 'top-end' });

type ViewModeType = 'original' | 'sentence';

export const DocumentViewer: React.FC = () => {
  const { currentDocument, viewMode, setViewMode, addAnnotation } = useDocumentStore();
  const {
    activeToolType,
    activeColor,
    setSelectedText,
    setSelectionRange
  } = useAnnotationStore();
  const { user } = useAuth();
  const { createAnnotation } = useAnnotations(currentDocument?.id, user?.id);
  const viewerRef = useRef<HTMLDivElement>(null);
  const lastAnnotationTime = useRef(0);

  const handleTextSelection = useCallback((e: React.MouseEvent) => {
    // Only process on single click release, not double-click
    if (e.detail > 1) {
      logger.debug({ message: 'Ignoring double-click selection' });
      return;
    }

    // Small delay to let selection stabilize
    setTimeout(() => {
      // Debounce to prevent rapid duplicate annotations
      const now = Date.now();
      if (now - lastAnnotationTime.current < 300) {
        logger.debug({ message: 'Selection debounced - too soon after last annotation' });
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectedText(null);
        setSelectionRange(null);
        return;
      }

      const selectedText = selection.toString().trim();

      // Validate selection length
      if (selectedText.length === 0) {
        logger.debug({ message: 'Empty selection after trim, ignoring' });
        return;
      }

      // Ignore very short selections (likely accidental)
      if (selectedText.length < 2) {
        logger.debug({ message: 'Selection too short (< 2 characters), ignoring' });
        return;
      }

      const range = selection.getRangeAt(0);

      // Calculate offsets relative to the paragraph container
      let startOffset = 0;
      let endOffset = 0;
      let paragraphId = '';

      try {
        // Get the text content of the container
        const container = range.commonAncestorContainer;
        const paragraphElement = container.nodeType === Node.TEXT_NODE
          ? container.parentElement
          : container as HTMLElement;

        // Find the paragraph box that contains this selection
        const paragraphBox = paragraphElement?.closest('[data-paragraph-id]') as HTMLElement;

        if (!paragraphBox) {
          logger.warn({ message: 'Selection not within a paragraph, ignoring' });
          setSelectedText(null);
          setSelectionRange(null);
          return;
        }

        paragraphId = paragraphBox.getAttribute('data-paragraph-id') || '';

        // Check for cross-paragraph selection
        const startParagraph = range.startContainer.nodeType === Node.TEXT_NODE
          ? range.startContainer.parentElement?.closest('[data-paragraph-id]')
          : (range.startContainer as HTMLElement).closest('[data-paragraph-id]');

        const endParagraph = range.endContainer.nodeType === Node.TEXT_NODE
          ? range.endContainer.parentElement?.closest('[data-paragraph-id]')
          : (range.endContainer as HTMLElement).closest('[data-paragraph-id]');

        if (startParagraph !== endParagraph) {
          logger.warn({ message: 'Cross-paragraph selection detected' });
          toaster.create({
            title: 'Invalid Selection',
            description: 'Please select text within a single paragraph only.',
            type: 'warning',
            duration: 3000,
          });
          window.getSelection()?.removeAllRanges();
          setSelectedText(null);
          setSelectionRange(null);
          return;
        }

        const paragraphText = paragraphBox.textContent || '';
        const selectedIndex = paragraphText.indexOf(selectedText);

        if (selectedIndex === -1) {
          logger.warn({ message: 'Could not find selected text in paragraph' });
          setSelectedText(null);
          setSelectionRange(null);
          return;
        }

        startOffset = selectedIndex;
        endOffset = selectedIndex + selectedText.length;
      } catch (error) {
        logError(error as Error, { context: 'Error calculating offsets' });
        toaster.create({
          title: 'Selection Error',
          description: 'Failed to process text selection. Please try again.',
          type: 'error',
          duration: 3000,
        });
        setSelectedText(null);
        setSelectionRange(null);
        return;
      }

      logger.debug({
        message: 'Text selected',
        textPreview: selectedText.substring(0, 50),
        startOffset,
        endOffset,
        paragraphId
      });

      setSelectedText(selectedText);
      setSelectionRange({ start: startOffset, end: endOffset });

      // Auto-apply annotation if a tool is active
      if (activeToolType && activeToolType !== 'note' && paragraphId) {
        logger.debug({
          message: 'Auto-applying annotation',
          type: activeToolType,
          color: activeColor
        });

        const newAnnotation = {
          id: `annotation_${Date.now()}`,
          document_id: currentDocument?.id || '',
          paragraph_id: paragraphId,
          user_id: 'current-user',
          type: activeToolType,
          content: selectedText,
          text: selectedText,
          color: activeColor,
          startOffset: startOffset,
          endOffset: endOffset,
          start_offset: startOffset,
          end_offset: endOffset,
          createdAt: new Date(),
          updatedAt: new Date(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        addAnnotation(paragraphId, newAnnotation);
        lastAnnotationTime.current = Date.now();

        // Show success feedback
        toaster.create({
          title: 'Annotation Created',
          description: `${activeToolType.charAt(0).toUpperCase() + activeToolType.slice(1)} annotation added successfully.`,
          type: 'success',
          duration: 2000,
        });

        // Persist to database (async)
        createAnnotation({
          paragraph_id: paragraphId,
          annotation_type: activeToolType,
          content: selectedText,
          highlight_color: activeColor,
          start_offset: startOffset,
          end_offset: endOffset,
        }).then(() => {
          logDataOperation('create', 'annotation', {
            annotationId: newAnnotation.id,
            paragraphId,
            autoApplied: true
          });
        }).catch((err) => {
          logError(err, {
            context: 'Failed to save annotation to database',
            annotationId: newAnnotation.id
          });
          toaster.create({
            title: 'Sync Error',
            description: 'Annotation created locally but failed to save to cloud. It will be retried.',
            type: 'warning',
            duration: 4000,
          });
        });

        // Clear selection after applying
        setTimeout(() => {
          window.getSelection()?.removeAllRanges();
          setSelectedText(null);
          setSelectionRange(null);
        }, 100);
      }
    }, 50); // Small delay to ensure selection is stable
  }, [activeToolType, activeColor, currentDocument, addAnnotation, setSelectedText, setSelectionRange, createAnnotation]);

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
      <HStack p={4} borderBottomWidth={1} borderColor="gray.200" gap={4}>
        <Text fontWeight="medium" fontSize="sm">
          View:
        </Text>
        <ButtonGroup size="sm" attached variant="outline">
          <Button
            colorScheme={viewMode === 'original' ? 'blue' : 'gray'}
            onClick={() => setViewMode('original' as ViewModeType)}
          >
            Original
          </Button>
          <Button
            colorScheme={viewMode === 'sentence' ? 'blue' : 'gray'}
            onClick={() => setViewMode('sentence' as ViewModeType)}
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
        userSelect="text"
        css={{
          '::selection': {
            bg: 'blue.100'
          }
        }}
      >
        <VStack gap={6} align="stretch">
          {/* Document Title */}
          <Text fontSize="2xl" fontWeight="bold" mb={4}>
            {currentDocument.title}
          </Text>

          {/* Render based on view mode */}
          {viewMode === 'original' ? (
            currentDocument.paragraphs && currentDocument.paragraphs.length > 0 ? (
              currentDocument.paragraphs.map((paragraph) => (
                <Paragraph key={paragraph.id} paragraph={paragraph} />
              ))
            ) : (
              <Text color="gray.500">No paragraphs found. The document may still be processing.</Text>
            )
          ) : (
            currentDocument.sentences && currentDocument.sentences.length > 0 ? (
              <SentenceView sentences={currentDocument.sentences} />
            ) : (
              <Text color="gray.500">No sentences found. The document may still be processing.</Text>
            )
          )}
        </VStack>
      </Box>
    </Box>
  );
};
