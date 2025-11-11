/**
 * CitationExportModal Component
 *
 * Modal for exporting citations in various formats (MLA, APA, Chicago).
 */
import React, { useState, useMemo } from 'react';
import {
  Dialog,
  Button,
  VStack,
  HStack,
  Text,
  Select,
  Box,
  Code,
  IconButton,
  createToaster,
  Separator,
  createListCollection,
} from '@chakra-ui/react';

const toaster = createToaster({ placement: 'top-end' });
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
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="xl">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="800px">
          <Dialog.Header>Export Citations</Dialog.Header>
          <Dialog.CloseTrigger />
          <Dialog.Body>
            <VStack gap={4} align="stretch">
              {/* Format Selection */}
              <HStack>
                <Text fontSize="sm" fontWeight="medium">
                  Citation Format:
                </Text>
                <Select.Root
                  value={[format]}
                  onValueChange={(e: { value: string[] }) => setFormat(e.value[0] as CitationExportFormat)}
                  size="sm"
                  maxW="200px"
                  collection={createListCollection({
                    items: [
                      { value: 'mla', label: 'MLA' },
                      { value: 'apa', label: 'APA' },
                      { value: 'chicago', label: 'Chicago' },
                      { value: 'bibtex', label: 'BibTeX' },
                      { value: 'ris', label: 'RIS' },
                      { value: 'json', label: 'JSON' },
                    ],
                  })}
                >
                  <Select.Trigger>
                    <Select.ValueText />
                  </Select.Trigger>
                  <Select.Positioner>
                    <Select.Content>
                      {['mla', 'apa', 'chicago', 'bibtex', 'ris', 'json'].map((item) => (
                        <Select.Item key={item} item={item}>
                          {item.toUpperCase()}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Select.Root>
              </HStack>

              <Separator />

              {/* Citation Count */}
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.600">
                  {citations.length} citation{citations.length !== 1 ? 's' : ''} found
                </Text>
                <HStack>
                  <IconButton
                    aria-label="Copy citations"
                    size="sm"
                    onClick={handleCopy}
                    disabled={citations.length === 0}
                  >
                    <FiCopy />
                  </IconButton>
                  <IconButton
                    aria-label="Download citations"
                    size="sm"
                    onClick={handleDownload}
                    disabled={citations.length === 0}
                  >
                    <FiDownload />
                  </IconButton>
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
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Close
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
