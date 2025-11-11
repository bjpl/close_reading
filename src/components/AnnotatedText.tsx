/**
 * AnnotatedText Component
 *
 * Renders paragraph text with annotation highlights and hover actions.
 * Handles the visual display of different annotation types (main_idea, citation, question, note, highlight).
 */
import React, { useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { Annotation } from '../types';
import { AnnotationActions } from './AnnotationActions';

interface AnnotatedTextProps {
  content: string;
  annotations: Annotation[];
  onDeleteAnnotation: (annotationId: string) => void;
  onEditAnnotation: (annotationId: string) => void;
}

/**
 * Renders text content with annotation highlights
 */
export const AnnotatedText: React.FC<AnnotatedTextProps> = ({
  content,
  annotations,
  onDeleteAnnotation,
  onEditAnnotation,
}) => {
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);

  // No annotations - return plain text
  if (annotations.length === 0) {
    return <Text>{content}</Text>;
  }

  // Sort annotations by start offset
  const sortedAnnotations = [...annotations].sort((a, b) => a.startOffset - b.startOffset);

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedAnnotations.forEach((annotation, idx) => {
    // Add text before annotation
    if (annotation.startOffset > lastIndex) {
      parts.push(
        <span key={`text-${idx}`}>{content.slice(lastIndex, annotation.startOffset)}</span>
      );
    }

    // Add annotated text
    const annotatedText = content.slice(annotation.startOffset, annotation.endOffset);

    const bgColor = {
      yellow: 'yellow.100',
      green: 'green.100',
      blue: 'blue.100',
      pink: 'pink.100',
      purple: 'purple.100',
    }[annotation.color || 'yellow'];

    // Render annotation based on type
    parts.push(
      <AnnotationHighlight
        key={`annotation-${annotation.id}`}
        annotation={annotation}
        annotatedText={annotatedText}
        bgColor={bgColor}
        isHovered={hoveredAnnotation === annotation.id}
        onMouseEnter={() => setHoveredAnnotation(annotation.id)}
        onMouseLeave={() => setHoveredAnnotation(null)}
        onDelete={onDeleteAnnotation}
        onEdit={onEditAnnotation}
      />
    );

    lastIndex = annotation.endOffset;
  });

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(<span key="text-end">{content.slice(lastIndex)}</span>);
  }

  return <Text>{parts}</Text>;
};

/**
 * Individual annotation highlight with type-specific styling
 */
interface AnnotationHighlightProps {
  annotation: Annotation;
  annotatedText: string;
  bgColor: string;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

const AnnotationHighlight: React.FC<AnnotationHighlightProps> = ({
  annotation,
  annotatedText,
  bgColor,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  onEdit,
}) => {
  // Base props for all annotation types
  const baseProps = {
    as: 'mark' as const,
    px: 0.5,
    cursor: 'pointer',
    position: 'relative' as const,
    onMouseEnter,
    onMouseLeave,
    title: annotation.note || annotation.content || '',
  };

  // Type-specific styles
  const typeStyles = {
    main_idea: {
      bg: 'transparent',
      borderBottom: '3px solid',
      borderColor: 'orange.500',
      fontWeight: 'bold',
    },
    citation: {
      bg: 'blue.50',
      borderLeft: '3px solid',
      borderColor: 'blue.500',
      px: 1,
      fontStyle: 'italic',
    },
    question: {
      bg: 'purple.50',
      borderBottom: '2px dotted',
      borderColor: 'purple.500',
      cursor: 'help',
    },
    note: {
      bg: bgColor,
      borderTop: '2px solid',
      borderColor: 'gray.600',
      borderRadius: 'sm',
    },
    highlight: {
      bg: bgColor,
      borderRadius: 'sm',
    },
  };

  const style = typeStyles[annotation.type as keyof typeof typeStyles] || typeStyles.highlight;

  return (
    <Box {...baseProps} {...style}>
      {annotatedText}
      {isHovered && (
        <AnnotationActions annotation={annotation} onDelete={onDelete} onEdit={onEdit} />
      )}
    </Box>
  );
};
