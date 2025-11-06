/**
 * ShareLinkModal Component
 *
 * Modal for generating and managing shareable links for documents.
 */
import React, { useState } from 'react';
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
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Switch,
  FormControl,
  FormLabel,
  useToast,
  Code,
  Box,
} from '@chakra-ui/react';
import { FiCopy, FiRefreshCw } from 'react-icons/fi';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
}

export const ShareLinkModal: React.FC<ShareLinkModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle,
}) => {
  const [shareLink, setShareLink] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const toast = useToast();

  const generateShareLink = async () => {
    setIsGenerating(true);

    try {
      // TODO: Implement actual share link generation with Supabase
      // This is a placeholder for the API call

      // Generate a unique token
      const token = Math.random().toString(36).substring(2, 15);
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/shared/${token}`;

      setShareLink(link);

      toast({
        title: 'Share link generated',
        description: 'Your document share link has been created.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Failed to generate link',
        description: 'An error occurred while creating the share link.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      toast({
        title: 'Link copied',
        description: 'Share link has been copied to your clipboard.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy link to clipboard.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleRefreshLink = () => {
    if (
      window.confirm(
        'This will invalidate the current link. Are you sure you want to generate a new one?'
      )
    ) {
      setShareLink('');
      generateShareLink();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Share Document</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Document Info */}
            <Box p={3} bg="gray.50" borderRadius="md">
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                Sharing:
              </Text>
              <Text fontWeight="medium">{documentTitle}</Text>
            </Box>

            {/* Share Options */}
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="expiry-toggle" mb="0" fontSize="sm">
                Link expires in 7 days
              </FormLabel>
              <Switch
                id="expiry-toggle"
                isChecked={hasExpiry}
                onChange={(e) => setHasExpiry(e.target.checked)}
              />
            </FormControl>

            {/* Generate/Show Link */}
            {!shareLink ? (
              <Button
                colorScheme="blue"
                onClick={generateShareLink}
                isLoading={isGenerating}
                loadingText="Generating..."
              >
                Generate Share Link
              </Button>
            ) : (
              <VStack spacing={3} align="stretch">
                <Text fontSize="sm" fontWeight="medium">
                  Share Link:
                </Text>
                <InputGroup size="sm">
                  <Input
                    value={shareLink}
                    isReadOnly
                    pr="80px"
                    fontFamily="mono"
                    fontSize="xs"
                  />
                  <InputRightElement width="80px">
                    <HStack spacing={1}>
                      <IconButton
                        aria-label="Copy link"
                        icon={<FiCopy />}
                        size="xs"
                        onClick={handleCopyLink}
                      />
                      <IconButton
                        aria-label="Refresh link"
                        icon={<FiRefreshCw />}
                        size="xs"
                        onClick={handleRefreshLink}
                      />
                    </HStack>
                  </InputRightElement>
                </InputGroup>
              </VStack>
            )}

            {/* Permissions Info */}
            <Box p={3} bg="blue.50" borderRadius="md">
              <Text fontSize="xs" fontWeight="medium" mb={1}>
                Read-only Access:
              </Text>
              <Text fontSize="xs" color="gray.700">
                Recipients can view the document and all annotations but cannot make
                changes.
                {hasExpiry && ' The link will expire automatically in 7 days.'}
              </Text>
            </Box>

            {/* Warning */}
            {shareLink && (
              <Box p={3} bg="orange.50" borderRadius="md">
                <Text fontSize="xs" color="orange.800">
                  <strong>Note:</strong> Anyone with this link can view your document.
                  Generate a new link to revoke access.
                </Text>
              </Box>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
