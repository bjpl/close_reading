/**
 * Semantic Search Panel Component
 *
 * Provides UI for semantic search across documents
 */
import React, { useState, useCallback } from 'react';
import {
  Box,
  Input,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Icon,
} from '@chakra-ui/react';
import { Switch } from '@chakra-ui/react/switch';
import { Card } from '@chakra-ui/react/card';
import { Alert } from '@chakra-ui/react/alert';
import { Slider } from '@chakra-ui/react/slider';
import { FiSearch } from 'react-icons/fi';
import { getSemanticSearchService, SearchResult } from '../../services/ml/SemanticSearchService';

export interface SemanticSearchPanelProps {
  documentId?: string;
  onResultClick?: (result: SearchResult) => void;
}

export const SemanticSearchPanel: React.FC<SemanticSearchPanelProps> = ({
  documentId,
  onResultClick,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.5);
  const [expandQuery, setExpandQuery] = useState(false);
  const [stats, setStats] = useState<{ duration: number; total: number } | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchService = getSemanticSearchService();
      await searchService.initialize();

      const startTime = performance.now();

      const searchResults = await searchService.search(query, {
        documentId,
        threshold,
        topK: 20,
        expandQuery,
        includeContext: true,
      });

      const duration = performance.now() - startTime;

      setResults(searchResults);
      setStats({
        duration,
        total: searchResults.length,
      });

      if (searchResults.length === 0) {
        setError('No results found. Try lowering the similarity threshold or using different terms.');
      }

    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [query, documentId, threshold, expandQuery]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Box p={4}>
      <VStack gap={4} align="stretch">
        {/* Search Input */}
        <HStack>
          <Input
            placeholder="Search by meaning (e.g., 'climate change impacts on agriculture')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            size="lg"
          />
          <Button
            onClick={handleSearch}
            loading={isSearching}
            colorPalette="blue"
            size="lg"
          >
            <Icon as={FiSearch} />
            Search
          </Button>
        </HStack>

        {/* Search Options */}
        <HStack gap={4} flexWrap="wrap">
          <HStack>
            <Text fontSize="sm">Expand Query:</Text>
            <Switch.Root
              checked={expandQuery}
              onCheckedChange={(details: { checked: boolean }) => setExpandQuery(details.checked)}
            >
              <Switch.Thumb />
            </Switch.Root>
          </HStack>

          <Box flex={1} minW="200px">
            <Text fontSize="sm" mb={1}>
              Similarity Threshold: {threshold.toFixed(2)}
            </Text>
            <Slider.Root
              min={0.3}
              max={0.9}
              step={0.05}
              value={[threshold]}
              onValueChange={(details: { value: number[] }) => setThreshold(details.value[0])}
            >
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumb index={0} />
            </Slider.Root>
          </Box>
        </HStack>

        {/* Statistics */}
        {stats && (
          <HStack fontSize="sm" color="gray.600">
            <Text>
              Found {stats.total} results in {stats.duration.toFixed(0)}ms
            </Text>
          </HStack>
        )}

        {/* Error Display */}
        {error && (
          <Alert.Root status="warning">
            <Alert.Title>{error}</Alert.Title>
          </Alert.Root>
        )}

        {/* Results List */}
        {isSearching ? (
          <Box textAlign="center" py={8}>
            <Spinner size="xl" />
            <Text mt={4}>Searching...</Text>
          </Box>
        ) : (
          <VStack gap={3} align="stretch">
            {results.map((result) => (
              <Card.Root
                key={result.id}
                cursor="pointer"
                _hover={{ bg: 'gray.50' }}
                onClick={() => onResultClick?.(result)}
              >
                <Card.Body>
                  <VStack align="stretch" gap={2}>
                    <HStack justify="space-between">
                      <Badge colorScheme="blue">
                        Rank #{result.rank}
                      </Badge>
                      <Badge colorScheme="green">
                        {(result.similarity * 100).toFixed(1)}% match
                      </Badge>
                    </HStack>

                    <Text fontSize="md" lineClamp={3}>
                      {result.snippet}
                    </Text>

                    {result.paragraphId && (
                      <Text fontSize="xs" color="gray.500">
                        Paragraph: {result.paragraphId}
                      </Text>
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
