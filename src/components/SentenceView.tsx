/**
 * SentenceView Component
 *
 * Displays the document in sentence-by-sentence view.
 */
import React from 'react';
import { VStack, Box, Text, Badge } from '@chakra-ui/react';
import { Sentence } from '../types';

interface SentenceViewProps {
  sentences: Sentence[];
}

export const SentenceView: React.FC<SentenceViewProps> = ({ sentences }) => {
  const renderAnnotatedSentence = (sentence: Sentence) => {
    if ((sentence.annotations || []).length === 0) {
      return <Text>{sentence.content}</Text>;
    }

    const sortedAnnotations = [...(sentence.annotations || [])].sort(
      (a, b) => a.startOffset - b.startOffset
    );

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedAnnotations.forEach((annotation, idx) => {
      if (annotation.startOffset > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {sentence.content.slice(lastIndex, annotation.startOffset)}
          </span>
        );
      }

      const annotatedText = sentence.content.slice(
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
        >
          {annotatedText}
        </Box>
      );

      lastIndex = annotation.endOffset;
    });

    if (lastIndex < sentence.content.length) {
      parts.push(
        <span key="text-end">{sentence.content.slice(lastIndex)}</span>
      );
    }

    return <Text>{parts}</Text>;
  };

  return (
    <VStack spacing={4} align="stretch">
      {sentences.map((sentence) => (
        <Box
          key={sentence.id}
          p={4}
          borderWidth={1}
          borderRadius="md"
          borderColor="gray.200"
          bg="white"
          _hover={{ bg: 'gray.50' }}
          transition="background 0.2s"
        >
          <Badge colorScheme="gray" mb={2} fontSize="xs">
            Sentence {sentence.order + 1}
          </Badge>
          {renderAnnotatedSentence(sentence)}
        </Box>
      ))}
    </VStack>
  );
};
