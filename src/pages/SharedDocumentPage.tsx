/**
 * SharedDocumentPage Component
 *
 * Public page for viewing shared documents via read-only links.
 * No authentication required.
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Spinner,
  Alert,
  VStack,
  HStack,
  Badge,
  Separator,
  Button,
} from '@chakra-ui/react';
import { FiExternalLink, FiLock } from 'react-icons/fi';
import DOMPurify from 'dompurify';
import { useSharing } from '../hooks/useSharing';
import { SharedDocument, SharedAnnotation } from '../services/sharing';
import { formatSimpleDate } from '../utils/dateUtils';

export const SharedDocumentPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { getSharedDocument, loading, error } = useSharing();
  const [document, setDocument] = useState<SharedDocument | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!token) return;

    const loadDocument = async () => {
      const doc = await getSharedDocument(token);
      if (doc) {
        setDocument(doc);
      } else {
        setIsExpired(true);
      }
    };

    loadDocument();
  }, [token, getSharedDocument]);

  if (loading) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="gray.50"
      >
        <VStack gap={4}>
          <Box role="status" aria-live="polite" aria-label="Loading shared document">
            <Spinner size="xl" color="blue.500" />
          </Box>
          <Text color="gray.600">Loading shared document...</Text>
        </VStack>
      </Box>
    );
  }

  if (error || isExpired || !document) {
    return (
      <Box minH="100vh" bg="gray.50" py={16}>
        <Container maxW="container.md">
          <Alert.Root
            status="error"
            variant="subtle"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            height="300px"
            borderRadius="lg"
          >
            <Alert.Indicator boxSize="40px" mr={0} />
            <Alert.Title mt={4} mb={1} fontSize="lg">
              Document Not Available
            </Alert.Title>
            <Alert.Description maxWidth="sm">
              {error || 'This share link is invalid or has expired.'}
            </Alert.Description>
          </Alert.Root>
        </Container>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header Banner - Read-Only Indicator */}
      <Box bg="blue.500" color="white" py={2} px={4}>
        <Container maxW="container.xl">
          <HStack justify="space-between" align="center">
            <HStack gap={2}>
              <FiLock />
              <Text fontSize="sm" fontWeight="medium">
                Read-Only View - You're viewing a shared document
              </Text>
            </HStack>
            <RouterLink to="/login">
              <Button size="sm" variant="outline" colorPalette="whiteAlpha">
                Sign in to edit <FiExternalLink />
              </Button>
            </RouterLink>
          </HStack>
        </Container>
      </Box>

      {/* Document Content */}
      <Container maxW="container.xl" py={8}>
        <VStack gap={6} align="stretch">
          {/* Document Header */}
          <Box bg="white" p={6} borderRadius="lg" shadow="sm">
            <VStack align="stretch" gap={3}>
              <HStack justify="space-between" align="start">
                <VStack align="start" gap={1}>
                  <Heading size="lg">{document.title}</Heading>
                  {document.project_title && (
                    <HStack gap={2}>
                      <Text fontSize="sm" color="gray.600">
                        Project:
                      </Text>
                      <Badge colorScheme="blue">{document.project_title}</Badge>
                    </HStack>
                  )}
                </VStack>
                <Badge colorScheme="green" fontSize="sm" px={3} py={1}>
                  Read-Only
                </Badge>
              </HStack>
              <Separator />
              <Text fontSize="sm" color="gray.600">
                Shared on {formatSimpleDate(document.created_at)}
              </Text>
            </VStack>
          </Box>

          {/* Document Content */}
          <Box bg="white" p={8} borderRadius="lg" shadow="sm" minH="500px">
            <Box
              className="document-content"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(document.content, {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
                  ALLOWED_ATTR: [],
                  KEEP_CONTENT: true
                })
              }}
              css={{
                '& p': { marginBottom: '1rem' },
                '& h1, & h2, & h3': { marginTop: '1.5rem', marginBottom: '0.75rem' },
                '& ul, & ol': { marginLeft: '1.5rem', marginBottom: '1rem' },
                lineHeight: '1.8',
                fontSize: 'md',
              }}
            />
          </Box>

          {/* Annotations Section */}
          {document.annotations && document.annotations.length > 0 && (
            <Box bg="white" p={6} borderRadius="lg" shadow="sm">
              <VStack align="stretch" gap={4}>
                <HStack justify="space-between">
                  <Heading size="md">Annotations</Heading>
                  <Badge colorScheme="purple">{document.annotations.length}</Badge>
                </HStack>
                <Separator />
                <VStack align="stretch" gap={4}>
                  {document.annotations.map((annotation: SharedAnnotation, index: number) => (
                    <Box
                      key={annotation.id || index}
                      p={4}
                      bg="gray.50"
                      borderRadius="md"
                      borderLeft="4px solid"
                      borderLeftColor="purple.400"
                    >
                      <VStack align="stretch" gap={2}>
                        {annotation.selected_text && (
                          <Box>
                            <Text fontSize="xs" color="gray.600" mb={1}>
                              Selected Text:
                            </Text>
                            <Text
                              fontSize="sm"
                              fontStyle="italic"
                              color="gray.700"
                              bg="yellow.50"
                              p={2}
                              borderRadius="md"
                            >
                              "{annotation.selected_text}"
                            </Text>
                          </Box>
                        )}
                        <Box>
                          <Text fontSize="xs" color="gray.600" mb={1}>
                            Note:
                          </Text>
                          <Text fontSize="sm">{annotation.content}</Text>
                        </Box>
                        {annotation.tags && annotation.tags.length > 0 && (
                          <HStack gap={2}>
                            {annotation.tags.map((tag: string, tagIndex: number) => (
                              <Badge key={tagIndex} size="sm" colorScheme="purple">
                                {tag}
                              </Badge>
                            ))}
                          </HStack>
                        )}
                        <Text fontSize="xs" color="gray.500">
                          {new Date(annotation.created_at).toLocaleString()}
                        </Text>
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              </VStack>
            </Box>
          )}

          {/* Footer Info */}
          <Box textAlign="center" py={4}>
            <Text fontSize="sm" color="gray.600">
              This is a shared read-only view.{' '}
              <RouterLink to="/login">
                <Button
                  variant="plain"
                  colorPalette="blue"
                  size="sm"
                >
                  Sign in
                </Button>
              </RouterLink>{' '}
              to create and edit your own documents.
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};
