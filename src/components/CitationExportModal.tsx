/**
 * CitationExportModal Component
 *
 * Modal for exporting citations in various formats (MLA, APA, Chicago).
 */
import React, { useState, useMemo } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Select,
  Box,
  Code,
  IconButton,
  useToast,
  Divider,
} from '@chakra-ui/react';
import { FiCopy, FiDownload } from 'react-icons/fi';
import { useDocumentStore } from '../stores/documentStore';
import { CitationFormat } from '../types';

interface CitationExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CitationExportModal: React.FC<CitationExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentDocument } = useDocumentStore();
  const [format, setFormat] = useState<CitationFormat>('mla');
  const toast = useToast();

  const citations = useMemo(() => {
    if (!currentDocument) return [];

    const allCitations = currentDocument.paragraphs.flatMap((p) =>
      p.annotations.filter((a) => a.type === 'citation')
    );

    return allCitations;
  }, [currentDocument]);

  const formatCitation = (text: string, note: string, index: number) => {
    const docTitle = currentDocument?.title || 'Untitled Document';

    switch (format) {
      case 'mla':
        return `"${text}" (${docTitle}${note ? `. ${note}` : ''})`;
      case 'apa':
        return `${docTitle}. "${text}"${note ? `. ${note}` : ''}.`;
      case 'chicago':
        return `${index + 1}. ${docTitle}, "${text}"${note ? `, ${note}` : ''}.`;
      default:
        return text;
    }
  };

  const formattedCitations = useMemo(() => {
    return citations
      .map((citation, index) =>
        formatCitation(citation.text, citation.note || '', index)
      )
      .join('\n\n');
  }, [citations, format, currentDocument]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedCitations);
      toast({
        title: 'Copied to clipboard',
        description: 'Citations have been copied to your clipboard.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy citations to clipboard.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([formattedCitations], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citations-${format}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: 'Citations have been downloaded as a text file.',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent maxW="800px">
        <ModalHeader>Export Citations</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Format Selection */}
            <HStack>
              <Text fontSize="sm" fontWeight="medium">
                Citation Format:
              </Text>
              <Select
                value={format}
                onChange={(e) => setFormat(e.target.value as CitationFormat)}
                size="sm"
                maxW="200px"
              >
                <option value="mla">MLA</option>
                <option value="apa">APA</option>
                <option value="chicago">Chicago</option>
              </Select>
            </HStack>

            <Divider />

            {/* Citation Count */}
            <HStack justify="space-between">
              <Text fontSize="sm" color="gray.600">
                {citations.length} citation{citations.length !== 1 ? 's' : ''} found
              </Text>
              <HStack>
                <IconButton
                  aria-label="Copy citations"
                  icon={<FiCopy />}
                  size="sm"
                  onClick={handleCopy}
                  isDisabled={citations.length === 0}
                />
                <IconButton
                  aria-label="Download citations"
                  icon={<FiDownload />}
                  size="sm"
                  onClick={handleDownload}
                  isDisabled={citations.length === 0}
                />
              </HStack>
            </HStack>

            {/* Citations Preview */}
            {citations.length === 0 ? (
              <Box p={8} textAlign="center" bg="gray.50" borderRadius="md">
                <Text color="gray.500">
                  No citations found in this document. Mark text as citations using the
                  annotation toolbar.
                </Text>
              </Box>
            ) : (
              <Box
                p={4}
                bg="gray.50"
                borderRadius="md"
                maxH="400px"
                overflow="auto"
              >
                <Code
                  display="block"
                  whiteSpace="pre-wrap"
                  bg="transparent"
                  p={0}
                  fontSize="sm"
                >
                  {formattedCitations}
                </Code>
              </Box>
            )}

            {/* Format Guide */}
            <Box p={3} bg="blue.50" borderRadius="md">
              <Text fontSize="xs" fontWeight="medium" mb={1}>
                Format Guide:
              </Text>
              <Text fontSize="xs" color="gray.700">
                {format === 'mla' &&
                  'MLA: In-text citation with author and page number'}
                {format === 'apa' &&
                  'APA: Author-date citation system with reference list'}
                {format === 'chicago' &&
                  'Chicago: Numbered notes with full citation details'}
              </Text>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
