/**
 * Embedding Progress Indicator Component
 *
 * Shows progress of document indexing for semantic search
 */
import React from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
} from '@chakra-ui/react';
import { Progress } from '@chakra-ui/react/progress';
import { IndexingProgress } from '../../services/ml/SemanticSearchService';

export interface EmbeddingProgressIndicatorProps {
  progress: IndexingProgress;
}

export const EmbeddingProgressIndicator: React.FC<EmbeddingProgressIndicatorProps> = ({
  progress,
}) => {
  const getStatusColor = (status: IndexingProgress['status']) => {
    switch (status) {
      case 'idle':
        return 'gray';
      case 'indexing':
        return 'blue';
      case 'completed':
        return 'green';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status: IndexingProgress['status']) => {
    switch (status) {
      case 'idle':
        return 'Ready';
      case 'indexing':
        return 'Indexing...';
      case 'completed':
        return 'Complete';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <Box p={4} borderWidth={1} borderRadius="md">
      <VStack gap={3} align="stretch">
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="medium">
            Document Indexing
          </Text>
          <Badge colorScheme={getStatusColor(progress.status)}>
            {getStatusText(progress.status)}
          </Badge>
        </HStack>

        <Progress.Root
          value={progress.progress}
          size="sm"
          colorPalette={getStatusColor(progress.status)}
        >
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>

        <HStack justify="space-between" fontSize="xs" color="gray.600">
          <Text>
            {progress.indexedParagraphs} / {progress.totalParagraphs} paragraphs
          </Text>
          <Text>{progress.progress.toFixed(0)}%</Text>
        </HStack>

        {progress.error && (
          <Text fontSize="xs" color="red.500">
            Error: {progress.error}
          </Text>
        )}
      </VStack>
    </Box>
  );
};
