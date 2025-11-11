/**
 * AnnotationToolbar Component
 *
 * Provides annotation tools (highlight, note, main idea, citation) and color selection.
 */
import React, { useState } from 'react';
import {
  Box,
  HStack,
  VStack,
  IconButton,
  Tooltip,
  Button,
  Popover,
  Text,
  Textarea,
  createToaster,
} from '@chakra-ui/react';

const toaster = createToaster({ placement: 'top-end' });
import {
  FiFileText,
  FiStar,
  FiBookmark,
  FiHelpCircle,
} from 'react-icons/fi';
import { HiOutlineColorSwatch } from 'react-icons/hi';
import { useAnnotationStore } from '../stores/annotationStore';
import { useDocumentStore } from '../stores/documentStore';
import { useAnnotations } from '../hooks/useAnnotations';
import { useAuth } from '../hooks/useAuth';
import type { AnnotationType, Annotation, AnnotationColor } from '../types';
import logger, { logError, logUserAction, logDataOperation } from '../lib/logger';

const COLOR_OPTIONS: AnnotationColor[] = ['yellow', 'green', 'blue', 'pink', 'purple'];

const COLOR_MAP = {
  yellow: '#FEF3C7',
  green: '#D1FAE5',
  blue: '#DBEAFE',
  pink: '#FCE7F3',
  purple: '#EDE9FE',
};

export const AnnotationToolbar: React.FC = () => {
  const {
    activeToolType,
    activeColor,
    selectedText,
    selectionRange,
    setActiveToolType,
    setActiveColor,
    clearSelection,
  } = useAnnotationStore();

  const { user } = useAuth();
  const { addAnnotation, currentDocument } = useDocumentStore();
  const { createAnnotation } = useAnnotations(currentDocument?.id, user?.id);
  const [noteText, setNoteText] = useState('');
  const [isNotePopoverOpen, setIsNotePopoverOpen] = useState(false);

  const handleToolClick = (type: AnnotationType) => {
    if (!selectedText) {
      toaster.create({
        title: 'No text selected',
        description: 'Please select text in the document first.',
        type: 'warning',
        duration: 3000,
      });
      return;
    }

    setActiveToolType(type);

    // Only notes require a popover - everything else applies immediately
    if (type === 'note') {
      setIsNotePopoverOpen(true);
    } else {
      // For highlight, main_idea, and citation, apply immediately
      applyAnnotation(type);
    }
  };

  const applyAnnotation = (type: AnnotationType, note?: string) => {
    if (!selectedText || !selectionRange || !currentDocument) {
      logger.warn({
        message: 'Cannot apply annotation - missing required data',
        selectedText: !!selectedText,
        selectionRange: !!selectionRange,
        currentDocument: !!currentDocument
      });
      return;
    }

    // Find which paragraph contains this selection by checking the DOM
    let paragraphId = currentDocument.id;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element = container.nodeType === Node.TEXT_NODE
        ? container.parentElement
        : container as HTMLElement;

      const paragraphBox = element?.closest('[data-paragraph-id]') as HTMLElement;
      if (paragraphBox) {
        paragraphId = paragraphBox.getAttribute('data-paragraph-id') || paragraphId;
      }
    }

    logUserAction('annotation_create', {
      type,
      color: activeColor,
      textPreview: selectedText.substring(0, 50),
      paragraphId,
      startOffset: selectionRange.start,
      endOffset: selectionRange.end
    });

    const newAnnotation: Annotation = {
      id: `annotation_${Date.now()}`,
      document_id: currentDocument.id,
      paragraph_id: paragraphId,
      user_id: 'current-user',
      type,
      content: selectedText,
      note: note || undefined,
      color: activeColor,
      start_offset: selectionRange.start,
      startOffset: selectionRange.start,
      end_offset: selectionRange.end,
      endOffset: selectionRange.end,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      text: selectedText,
    };

    // Add to Zustand store (for immediate UI update)
    addAnnotation(paragraphId, newAnnotation);
    logger.debug({ message: 'Annotation added to store', annotationId: newAnnotation.id });

    // Persist to database (async)
    createAnnotation({
      paragraph_id: paragraphId,
      annotation_type: type,
      content: note || selectedText,
      highlight_color: activeColor,
      start_offset: selectionRange.start,
      end_offset: selectionRange.end,
    }).then(() => {
      logDataOperation('create', 'annotation', { annotationId: newAnnotation.id, paragraphId });
    }).catch((err) => {
      logError(err, { context: 'Failed to save annotation to database', annotationId: newAnnotation.id });
    });

    toaster.create({
      title: 'Annotation added',
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} annotation created.`,
      type: 'success',
      duration: 2000,
    });

    // Clear selection
    clearSelection();
    setNoteText('');
    setIsNotePopoverOpen(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleNoteSave = () => {
    if (!noteText.trim()) {
      toaster.create({
        title: 'Note required',
        description: 'Please enter a note before saving.',
        type: 'warning',
        duration: 3000,
      });
      return;
    }

    applyAnnotation(activeToolType!, noteText);
  };

  return (
    <Box
      p={4}
      borderBottomWidth={1}
      borderColor="gray.200"
      bg="white"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <VStack gap={4} align="stretch">
        {/* Annotation Tools */}
        <HStack gap={2}>
          <Text fontSize="sm" fontWeight="medium" mr={2}>
            Annotate:
          </Text>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <IconButton
              aria-label="Highlight"
              colorScheme={activeToolType === 'highlight' ? 'blue' : 'gray'}
              variant={activeToolType === 'highlight' ? 'solid' : 'outline'}
              onClick={() => {
                if (activeToolType === 'highlight') {
                  setActiveToolType(null);
                  logger.debug({ message: 'Highlight mode OFF' });
                } else {
                  setActiveToolType('highlight');
                  logger.debug({ message: 'Highlight mode ON' });
                }
              }}
              size="sm"
            >
              <HiOutlineColorSwatch />
            </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                {activeToolType === 'highlight' ? 'Highlight mode ON (click color to turn off)' : 'Click a color to enable highlight mode'}
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>

          <Popover.Root
            open={isNotePopoverOpen && activeToolType === 'note'}
            onOpenChange={(e) => setIsNotePopoverOpen(e.open)}
            positioning={{ placement: 'bottom' }}
          >
            <Popover.Trigger asChild>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <IconButton
                  aria-label="Add Note"
                  colorScheme={activeToolType === 'note' ? 'blue' : 'gray'}
                  variant={activeToolType === 'note' ? 'solid' : 'outline'}
                  onClick={() => handleToolClick('note')}
                  size="sm"
                  disabled={!selectedText}
                >
                  <FiFileText />
                </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Positioner>
                  <Tooltip.Content>Add Note</Tooltip.Content>
                </Tooltip.Positioner>
              </Tooltip.Root>
            </Popover.Trigger>
            <Popover.Positioner>
              <Popover.Content>
                <Popover.Arrow />
                <Popover.Body>
                  <VStack gap={3}>
                    <Textarea
                      placeholder="Enter your note..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      size="sm"
                      rows={4}
                    />
                    <Button
                      colorScheme="blue"
                      size="sm"
                      width="100%"
                      onClick={handleNoteSave}
                    >
                      Save Note
                    </Button>
                  </VStack>
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Popover.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <IconButton
              aria-label="Main Idea"
              colorScheme={activeToolType === 'main_idea' ? 'orange' : 'gray'}
              variant={activeToolType === 'main_idea' ? 'solid' : 'outline'}
              onClick={() => {
                if (activeToolType === 'main_idea') {
                  setActiveToolType(null);
                  logger.debug({ message: 'Main Idea mode OFF' });
                } else {
                  setActiveToolType('main_idea');
                  logger.debug({ message: 'Main Idea mode ON' });
                }
              }}
              size="sm"
            >
              <FiStar />
            </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                {activeToolType === 'main_idea' ? 'Main Idea mode ON (click to turn off)' : 'Main Idea mode OFF'}
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <IconButton
              aria-label="Add Citation"
              colorScheme={activeToolType === 'citation' ? 'blue' : 'gray'}
              variant={activeToolType === 'citation' ? 'solid' : 'outline'}
              onClick={() => {
                if (activeToolType === 'citation') {
                  setActiveToolType(null);
                  logger.debug({ message: 'Citation mode OFF' });
                } else {
                  setActiveToolType('citation');
                  logger.debug({ message: 'Citation mode ON' });
                }
              }}
              size="sm"
            >
              <FiBookmark />
            </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                {activeToolType === 'citation' ? 'Citation mode ON (click to turn off)' : 'Citation mode OFF'}
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <IconButton
              aria-label="Mark as Question"
              colorScheme={activeToolType === 'question' ? 'purple' : 'gray'}
              variant={activeToolType === 'question' ? 'solid' : 'outline'}
              onClick={() => {
                if (activeToolType === 'question') {
                  setActiveToolType(null);
                  logger.debug({ message: 'Question mode OFF' });
                } else {
                  setActiveToolType('question');
                  logger.debug({ message: 'Question mode ON' });
                }
              }}
              size="sm"
            >
              <FiHelpCircle />
            </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                {activeToolType === 'question' ? 'Question mode ON (click to turn off)' : 'Question mode OFF'}
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </HStack>

        {/* Color Selection - Toggle Mode */}
        <HStack gap={2}>
          <Text fontSize="sm" fontWeight="medium" mr={2}>
            Color:
          </Text>
          {COLOR_OPTIONS.map((color) => (
            <Tooltip.Root key={color}>
              <Tooltip.Trigger asChild>
                <Box
                as="button"
                w={8}
                h={8}
                borderRadius="md"
                bg={COLOR_MAP[color as AnnotationColor]}
                borderWidth={activeToolType === 'highlight' && activeColor === color ? 3 : 2}
                borderColor={activeToolType === 'highlight' && activeColor === color ? 'blue.600' : 'gray.300'}
                onClick={() => {
                  // Toggle highlight mode on/off
                  if (activeToolType === 'highlight' && activeColor === color) {
                    // Turn off if clicking same color
                    setActiveToolType(null);
                    logger.debug({ message: 'Highlight mode OFF' });
                  } else {
                    // Turn on highlight mode with this color
                    setActiveColor(color);
                    setActiveToolType('highlight');
                    logger.debug({ message: 'Highlight mode ON', color });
                  }
                }}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ transform: 'scale(1.15)', boxShadow: 'md' }}
                boxShadow={activeToolType === 'highlight' && activeColor === color ? 'lg' : 'sm'}
              />
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>
                  {activeToolType === 'highlight' && activeColor === color
                    ? `${color} highlight mode (click to turn off)`
                    : `${color} highlight mode`}
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          ))}
        </HStack>

        {/* Selection Info */}
        {selectedText && (
          <Box p={2} bg="blue.50" borderRadius="md">
            <Text fontSize="xs" color="blue.700">
              Selected: "{selectedText.substring(0, 50)}
              {selectedText.length > 50 ? '...' : ''}"
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};
