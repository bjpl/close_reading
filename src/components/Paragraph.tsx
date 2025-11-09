/**
 * Paragraph Component
 *
 * Renders a single paragraph with annotations and linking support.
 */
import React from 'react';
import { Box, Text, Badge, HStack } from '@chakra-ui/react';
import { Paragraph as ParagraphType } from '../types';
import { useDocumentStore } from '../stores/documentStore';
import { FiLink } from 'react-icons/fi';

interface ParagraphProps {
  paragraph: ParagraphType;
}

export const Paragraph: React.FC<ParagraphProps> = ({ paragraph }) => {
  const {
    selectedParagraphs,
    hoveredParagraph,
    selectParagraph,
    deselectParagraph,
    setHoveredParagraph,
  } = useDocumentStore();

  const isSelected = selectedParagraphs.includes(paragraph.id);
  const isHovered = hoveredParagraph === paragraph.id;
  const hasLinks = (paragraph.linkedParagraphs || []).length > 0;

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      if (isSelected) {
        deselectParagraph(paragraph.id);
      } else {
        selectParagraph(paragraph.id);
      }
    }
  };

  // Render text with annotations
  const renderAnnotatedText = () => {
    if ((paragraph.annotations || []).length === 0) {
      return <Text>{paragraph.content}</Text>;
    }

    // Sort annotations by start offset
    const sortedAnnotations = [...(paragraph.annotations || [])].sort(
      (a, b) => a.startOffset - b.startOffset
    );

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedAnnotations.forEach((annotation, idx) => {
      // Add text before annotation
      if (annotation.startOffset > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {paragraph.content.slice(lastIndex, annotation.startOffset)}
          </span>
        );
      }

      // Add annotated text
      const annotatedText = paragraph.content.slice(
        annotation.startOffset,
        annotation.endOffset
      );

      const bgColor = {
        yellow: 'yellow.100',
        green: 'green.100',
        blue: 'blue.100',
        pink: 'pink.100',
        purple: 'purple.100',
      }[annotation.color || 'yellow'];

      parts.push(
        <Box
          as="mark"
          key={`annotation-${annotation.id}`}
          bg={bgColor}
          px={0.5}
          borderRadius="sm"
          title={annotation.note}
          cursor="pointer"
        >
          {annotatedText}
        </Box>
      );

      lastIndex = annotation.endOffset;
    });

    // Add remaining text
    if (lastIndex < paragraph.content.length) {
      parts.push(
        <span key="text-end">{paragraph.content.slice(lastIndex)}</span>
      );
    }

    return <Text>{parts}</Text>;
  };

  return (
    <Box
      position="relative"
      p={4}
      borderWidth={1}
      borderRadius="md"
      borderColor={isSelected ? 'blue.400' : isHovered ? 'gray.300' : 'gray.200'}
      bg={isSelected ? 'blue.50' : isHovered ? 'gray.50' : 'white'}
      transition="all 0.2s"
      onClick={handleClick}
      onMouseEnter={() => setHoveredParagraph(paragraph.id)}
      onMouseLeave={() => setHoveredParagraph(null)}
      cursor={isSelected ? 'pointer' : 'default'}
    >
      {/* Link indicator */}
      {hasLinks && (
        <HStack position="absolute" top={2} right={2} spacing={1}>
          <FiLink size={14} />
          <Badge colorScheme="blue" fontSize="xs">
            {(paragraph.linkedParagraphs || []).length}
          </Badge>
        </HStack>
      )}

      {/* Paragraph content with annotations */}
      {renderAnnotatedText()}

      {/* Selection hint */}
      {isSelected && (
        <Text fontSize="xs" color="blue.600" mt={2}>
          Shift+Click to deselect
        </Text>
      )}
    </Box>
  );
};
