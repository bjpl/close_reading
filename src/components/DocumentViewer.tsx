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
import { useAnnotations } from '../hooks/useAnnotations';
import { useAuth } from '../hooks/useAuth';
import { Paragraph } from './Paragraph';
import { SentenceView } from './SentenceView';

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
      console.log('🚫 Ignoring double-click selection');
      return;
    }

    // Small delay to let selection stabilize
    setTimeout(() => {
      // Debounce to prevent rapid duplicate annotations
      const now = Date.now();
      if (now - lastAnnotationTime.current < 300) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectedText(null);
        setSelectionRange(null);
        return;
      }

      const selectedText = selection.toString().trim();

      // Ignore very short selections (likely accidental)
      if (selectedText.length < 3) {
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

        if (paragraphBox) {
          paragraphId = paragraphBox.getAttribute('data-paragraph-id') || '';
          const paragraphText = paragraphBox.textContent || '';
          const selectedIndex = paragraphText.indexOf(selectedText);

          if (selectedIndex !== -1) {
            startOffset = selectedIndex;
            endOffset = selectedIndex + selectedText.length;
          }
        }
      } catch (error) {
        console.error('Error calculating offsets:', error);
      }

      console.log('📝 Text selected:', {
        text: selectedText.substring(0, 50),
        start: startOffset,
        end: endOffset,
        paragraphId
      });

      setSelectedText(selectedText);
      setSelectionRange({ start: startOffset, end: endOffset });

      // Auto-apply annotation if a tool is active
      if (activeToolType && activeToolType !== 'note' && paragraphId) {
        console.log('🎨 Auto-applying annotation:', activeToolType, 'color:', activeColor);

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

        // Persist to database (async)
        createAnnotation({
          paragraph_id: paragraphId,
          annotation_type: activeToolType,
          content: selectedText,
          highlight_color: activeColor,
          start_offset: startOffset,
          end_offset: endOffset,
        }).then(() => {
          console.log('💾 Annotation auto-saved to database');
        }).catch((err) => {
          console.error('❌ Failed to save annotation to database:', err);
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
      <HStack p={4} borderBottomWidth={1} borderColor="gray.200" spacing={4}>
        <Text fontWeight="medium" fontSize="sm">
          View:
        </Text>
        <ButtonGroup size="sm" isAttached variant="outline">
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
        sx={{
          '::selection': {
            bg: 'blue.100'
          }
        }}
      >
        <VStack spacing={6} align="stretch">
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
