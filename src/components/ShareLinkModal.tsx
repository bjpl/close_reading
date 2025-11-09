/**
 * ShareLinkModal Component
 *
 * Modal for generating and managing shareable links for documents.
 */
import React, { useState, useEffect } from 'react';
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
  Box,
} from '@chakra-ui/react';
import { FiCopy, FiRefreshCw } from 'react-icons/fi';
import { useSharing } from '../hooks/useSharing';

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
  const [hasExpiry, setHasExpiry] = useState(true); // Default to 7 days
  const { generateShareLink: generateLink, loading, error: sharingError, getShareLinkInfo } = useSharing();
  const toast = useToast();

  // Load existing share link on modal open
  useEffect(() => {
    if (isOpen && documentId) {
      loadExistingShareLink();
    }
  }, [isOpen, documentId]);

  const loadExistingShareLink = async () => {
    const info = await getShareLinkInfo(documentId);
    if (info) {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/shared/${info.token}`;
      setShareLink(link);
      setHasExpiry(!!info.expires_at);
    }
  };

  const generateShareLink = async () => {
    try {
      const expiresInDays = hasExpiry ? 7 : undefined;
      const link = await generateLink(documentId, expiresInDays);

      if (link) {
        setShareLink(link);
        toast({
          title: 'Share link generated',
          description: 'Your document share link has been created.',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to generate link');
      }
    } catch (error) {
      toast({
        title: 'Failed to generate link',
        description: sharingError || 'An error occurred while creating the share link.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
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
                isLoading={loading}
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
