/**
 * ParagraphLinkingPanel Component
 *
 * Interface for linking related paragraphs together.
 */
import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Badge,
  Separator,
  createToaster,
} from '@chakra-ui/react';

const toaster = createToaster({ placement: 'top-end' });
import { FiLink, FiX } from 'react-icons/fi';
import { useDocumentStore } from '../stores/documentStore';

export const ParagraphLinkingPanel: React.FC = () => {
  const {
    currentDocument,
    selectedParagraphs,
    linkParagraphs,
    unlinkParagraph,
    clearSelection,
  } = useDocumentStore();

  const handleLinkParagraphs = () => {
    if (selectedParagraphs.length < 2) {
      toaster.create({
        title: 'Select paragraphs',
        description: 'Please select at least 2 paragraphs to link (Shift+Click).',
        type: 'warning',
        duration: 3000,
      });
      return;
    }

    linkParagraphs(selectedParagraphs);
    clearSelection();

    toaster.create({
      title: 'Paragraphs linked',
      description: `${selectedParagraphs.length} paragraphs have been linked together.`,
      type: 'success',
      duration: 3000,
    });
  };

  const getLinkedParagraphs = () => {
    if (!currentDocument) return [];

    return (currentDocument.paragraphs || []).filter(
      (p) => (p.linkedParagraphs || []).length > 0
    );
  };

  const linkedParagraphs = getLinkedParagraphs();

  return (
    <Box
      w="300px"
      h="100%"
      borderLeftWidth={1}
      borderColor="gray.200"
      bg="white"
      overflow="auto"
    >
      <VStack gap={4} p={4} align="stretch">
        {/* Header */}
        <Text fontSize="lg" fontWeight="bold">
          Paragraph Links
        </Text>

        {/* Link Selection */}
        <Box
          p={3}
          borderWidth={1}
          borderRadius="md"
          borderColor="blue.200"
          bg="blue.50"
        >
          <VStack gap={2} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium">
                Selected:
              </Text>
              <Badge colorScheme="blue">{selectedParagraphs.length}</Badge>
            </HStack>
            {selectedParagraphs.length > 0 && (
              <Text fontSize="xs" color="gray.600">
                Shift+Click paragraphs to select/deselect
              </Text>
            )}
            <Button
              colorScheme="blue"
              size="sm"
              onClick={handleLinkParagraphs}
              disabled={selectedParagraphs.length < 2}
            >
              <FiLink /> Link Selected
            </Button>
          </VStack>
        </Box>

        <Separator />

        {/* Existing Links */}
        <Text fontSize="sm" fontWeight="medium">
          Existing Links ({linkedParagraphs.length})
        </Text>

        {linkedParagraphs.length === 0 ? (
          <Box p={4} textAlign="center">
            <Text fontSize="sm" color="gray.500">
              No linked paragraphs yet. Select paragraphs with Shift+Click to create links.
            </Text>
          </Box>
        ) : (
          <VStack gap={3} align="stretch">
            {linkedParagraphs.map((paragraph) => (
              <Box
                key={paragraph.id}
                p={3}
                borderWidth={1}
                borderRadius="md"
                borderColor="gray.200"
                bg="white"
              >
                <VStack gap={2} align="stretch">
                  <Text fontSize="sm" lineClamp={2}>
                    {paragraph.content}
                  </Text>
                  <HStack gap={1} flexWrap="wrap">
                    {(paragraph.linkedParagraphs || []).map((linkedId) => {
                      const linkedPara = (currentDocument?.paragraphs || []).find(
                        (p) => p.id === linkedId
                      );
                      return (
                        <Badge
                          key={linkedId}
                          colorScheme="blue"
                          fontSize="xs"
                          cursor="pointer"
                          display="flex"
                          alignItems="center"
                          gap={1}
                        >
                          Para {linkedPara?.order || '?'}
                          <IconButton
                            aria-label="Unlink"
                            size="xs"
                            variant="ghost"
                            minW="auto"
                            h="auto"
                            onClick={() => unlinkParagraph(paragraph.id, linkedId)}
                          >
                            <FiX />
                          </IconButton>
                        </Badge>
                      );
                    })}
                  </HStack>
                </VStack>
              </Box>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};
