/**
 * Similar Passages Panel Component
 *
 * Displays passages similar to a selected text
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Button,
  Separator,
  Icon,
} from '@chakra-ui/react';
import { Card } from '@chakra-ui/react/card';
import { FiLink } from 'react-icons/fi';
import { getSemanticSearchService, SimilarPassage } from '../../services/ml/SemanticSearchService';

export interface SimilarPassagesPanelProps {
  sourceText: string;
  documentId?: string;
  threshold?: number;
  onLinkCreate?: (passage: SimilarPassage) => void;
}

export const SimilarPassagesPanel: React.FC<SimilarPassagesPanelProps> = ({
  sourceText,
  documentId,
  threshold = 0.6,
  onLinkCreate,
}) => {
  const [passages, setPassages] = useState<SimilarPassage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findSimilarPassages = useCallback(async () => {
    if (!sourceText || sourceText.trim().length < 10) {
      setError('Source text too short');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchService = getSemanticSearchService();
      await searchService.initialize();

      const results = await searchService.findSimilarPassages(sourceText, {
        documentId,
        threshold,
        topK: 10,
      });

      setPassages(results);

      if (results.length === 0) {
        setError('No similar passages found');
      }

    } catch (err) {
      console.error('Failed to find similar passages:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, [sourceText, documentId, threshold]);

  useEffect(() => {
    findSimilarPassages();
  }, [findSimilarPassages]);

  if (isLoading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="xl" />
        <Text mt={4}>Finding similar passages...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Text color="orange.600">{error}</Text>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <VStack gap={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">
          Similar Passages ({passages.length})
        </Text>

        {passages.length === 0 ? (
          <Text color="gray.500">
            No similar passages found. Try lowering the similarity threshold.
          </Text>
        ) : (
          <VStack gap={3} align="stretch">
            {passages.map((passage, index) => (
              <Card.Root key={`${passage.targetId}-${index}`}>
                <Card.Body>
                  <VStack align="stretch" gap={3}>
                    {/* Similarity Badge */}
                    <HStack justify="space-between">
                      <Badge colorScheme="green">
                        {(passage.similarity * 100).toFixed(1)}% similar
                      </Badge>
                      <Text fontSize="xs" color="gray.500">
                        {passage.reason}
                      </Text>
                    </HStack>

                    <Separator />

                    {/* Source Text */}
                    <Box>
                      <Text fontSize="xs" color="gray.600" mb={1}>
                        Your Selection:
                      </Text>
                      <Text fontSize="sm" color="gray.700" lineClamp={2}>
                        {passage.sourceText}
                      </Text>
                    </Box>

                    {/* Target Text */}
                    <Box>
                      <Text fontSize="xs" color="gray.600" mb={1}>
                        Similar Passage:
                      </Text>
                      <Text fontSize="sm" lineClamp={3}>
                        {passage.targetText}
                      </Text>
                    </Box>

                    {/* Action Button */}
                    {onLinkCreate && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onLinkCreate(passage)}
                      >
                        <Icon as={FiLink} />
                        Create Link
                      </Button>
                    )}
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};
