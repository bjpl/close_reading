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
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import {
  FiHighlight,
  FiFileText,
  FiStar,
  FiBookmark,
} from 'react-icons/fi';
import { useAnnotationStore } from '../stores/annotationStore';
import { useDocumentStore } from '../stores/documentStore';
import { AnnotationType, AnnotationColor, Annotation } from '../types';

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

  const { addAnnotation, currentDocument } = useDocumentStore();
  const [noteText, setNoteText] = useState('');
  const [isNotePopoverOpen, setIsNotePopoverOpen] = useState(false);
  const toast = useToast();

  const handleToolClick = (type: AnnotationType) => {
    if (!selectedText) {
      toast({
        title: 'No text selected',
        description: 'Please select text in the document first.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setActiveToolType(type);

    // For note and main idea, open popover
    if (type === 'note' || type === 'main_idea') {
      setIsNotePopoverOpen(true);
    } else {
      // For highlight and citation, apply immediately
      applyAnnotation(type);
    }
  };

  const applyAnnotation = (type: AnnotationType, note?: string) => {
    if (!selectedText || !selectionRange || !currentDocument) {
      return;
    }

    // Find which paragraph contains this selection
    // This is a simplified version - real implementation would need more sophisticated logic
    const paragraphId = currentDocument.paragraphs[0]?.id || '';

    const newAnnotation: Annotation = {
      id: `annotation_${Date.now()}`,
      type,
      text: selectedText,
      note: note || undefined,
      color: activeColor,
      startOffset: selectionRange.start,
      endOffset: selectionRange.end,
      paragraphId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addAnnotation(paragraphId, newAnnotation);

    toast({
      title: 'Annotation added',
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} annotation created.`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });

    // Clear selection
    clearSelection();
    setNoteText('');
    setIsNotePopoverOpen(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleNoteSave = () => {
    if (!noteText.trim()) {
      toast({
        title: 'Note required',
        description: 'Please enter a note before saving.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
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
      <VStack spacing={4} align="stretch">
        {/* Annotation Tools */}
        <HStack spacing={2}>
          <Text fontSize="sm" fontWeight="medium" mr={2}>
            Annotate:
          </Text>

          <Tooltip label="Highlight" placement="bottom">
            <IconButton
              aria-label="Highlight"
              icon={<FiHighlight />}
              colorScheme={activeToolType === 'highlight' ? 'blue' : 'gray'}
              variant={activeToolType === 'highlight' ? 'solid' : 'outline'}
              onClick={() => handleToolClick('highlight')}
              size="sm"
            />
          </Tooltip>

          <Popover
            isOpen={isNotePopoverOpen && activeToolType === 'note'}
            onClose={() => setIsNotePopoverOpen(false)}
            placement="bottom"
          >
            <PopoverTrigger>
              <Tooltip label="Add Note" placement="bottom">
                <IconButton
                  aria-label="Add Note"
                  icon={<FiFileText />}
                  colorScheme={activeToolType === 'note' ? 'blue' : 'gray'}
                  variant={activeToolType === 'note' ? 'solid' : 'outline'}
                  onClick={() => handleToolClick('note')}
                  size="sm"
                />
              </Tooltip>
            </PopoverTrigger>
            <PopoverContent>
              <PopoverArrow />
              <PopoverBody>
                <VStack spacing={3}>
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
              </PopoverBody>
            </PopoverContent>
          </Popover>

          <Popover
            isOpen={isNotePopoverOpen && activeToolType === 'main_idea'}
            onClose={() => setIsNotePopoverOpen(false)}
            placement="bottom"
          >
            <PopoverTrigger>
              <Tooltip label="Mark Main Idea" placement="bottom">
                <IconButton
                  aria-label="Main Idea"
                  icon={<FiStar />}
                  colorScheme={activeToolType === 'main_idea' ? 'blue' : 'gray'}
                  variant={activeToolType === 'main_idea' ? 'solid' : 'outline'}
                  onClick={() => handleToolClick('main_idea')}
                  size="sm"
                />
              </Tooltip>
            </PopoverTrigger>
            <PopoverContent>
              <PopoverArrow />
              <PopoverBody>
                <VStack spacing={3}>
                  <Textarea
                    placeholder="Describe the main idea..."
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
                    Save Main Idea
                  </Button>
                </VStack>
              </PopoverBody>
            </PopoverContent>
          </Popover>

          <Tooltip label="Add Citation" placement="bottom">
            <IconButton
              aria-label="Add Citation"
              icon={<FiBookmark />}
              colorScheme={activeToolType === 'citation' ? 'blue' : 'gray'}
              variant={activeToolType === 'citation' ? 'solid' : 'outline'}
              onClick={() => handleToolClick('citation')}
              size="sm"
            />
          </Tooltip>
        </HStack>

        {/* Color Selection */}
        <HStack spacing={2}>
          <Text fontSize="sm" fontWeight="medium" mr={2}>
            Color:
          </Text>
          {COLOR_OPTIONS.map((color) => (
            <Box
              key={color}
              as="button"
              w={6}
              h={6}
              borderRadius="md"
              bg={COLOR_MAP[color]}
              borderWidth={2}
              borderColor={activeColor === color ? 'blue.500' : 'gray.300'}
              onClick={() => setActiveColor(color)}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ transform: 'scale(1.1)' }}
            />
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
