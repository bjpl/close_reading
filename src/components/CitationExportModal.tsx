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
  toaster,
  Divider,
} from '@chakra-ui/react';
import { FiCopy, FiDownload } from 'react-icons/fi';
import { useDocumentStore } from '../stores/documentStore';
import { CitationExportFormat, CitationMetadata } from '../types/citation';
import {
  exportCitations,
  getMimeType,
  getFileExtension,
} from '../services/citationExport';

interface CitationExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CitationExportModal: React.FC<CitationExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentDocument } = useDocumentStore();
  const [format, setFormat] = useState<CitationExportFormat>('mla');

  const citations = useMemo(() => {
    if (!currentDocument) return [];

    // TODO: Fetch annotations from store or API
    // For now, return empty array until we have annotations loaded
    return [];
  }, [currentDocument]);

  // Generate metadata for each citation
  const citationMetadata = useMemo((): CitationMetadata[] => {
    return citations.map((citation: any) => ({
      title: currentDocument?.title || 'Untitled Document',
      author: 'Unknown', // TODO: Add author field to Document type
      year: new Date().getFullYear(),
      type: 'article' as const,
      note: citation.note,
    }));
  }, [citations, currentDocument]);

  const formattedCitations = useMemo(() => {
    if (citations.length === 0) return '';

    const documentInfo = {
      title: currentDocument?.title || 'Untitled Document',
      author: 'Unknown', // TODO: Add author field to Document type
      date: new Date().toISOString(),
    };

    return exportCitations(citations, citationMetadata, format, documentInfo);
  }, [citations, citationMetadata, format, currentDocument]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedCitations);
      toaster.create({
        title: 'Copied to clipboard',
        description: 'Citations have been copied to your clipboard.',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      toaster.create({
        title: 'Failed to copy',
        description: 'Could not copy citations to clipboard.',
        type: 'error',
        duration: 3000,
      });
    }
  };

  const handleDownload = () => {
    const mimeType = getMimeType(format);
    const fileExtension = getFileExtension(format);

    const blob = new Blob([formattedCitations], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `citations-${format}-${Date.now()}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toaster.create({
      title: 'Downloaded',
      description: `Citations have been downloaded as ${format.toUpperCase()} format.`,
      type: 'success',
      duration: 2000,
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
                onChange={(e) => setFormat(e.target.value as CitationExportFormat)}
                size="sm"
                maxW="200px"
              >
                <option value="mla">MLA</option>
                <option value="apa">APA</option>
                <option value="chicago">Chicago</option>
                <option value="bibtex">BibTeX</option>
                <option value="ris">RIS</option>
                <option value="json">JSON</option>
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
                {format === 'bibtex' &&
                  'BibTeX: LaTeX bibliography format for academic papers'}
                {format === 'ris' &&
                  'RIS: Standard format for reference management software (EndNote, Mendeley, Zotero)'}
                {format === 'json' &&
                  'JSON: Structured data format for programmatic access and data interchange'}
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
