/**
 * ShareLinkModal Component
 *
 * Modal for generating and managing shareable links for documents.
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  IconButton,
  Switch,
  Field,
  createToaster,
  Box,
} from '@chakra-ui/react';

const toaster = createToaster({ placement: 'top-end' });
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
        toaster.create({
          title: 'Share link generated',
          description: 'Your document share link has been created.',
          type: 'success',
          duration: 3000,
        });
      } else {
        throw new Error('Failed to generate link');
      }
    } catch (error) {
      toaster.create({
        title: 'Failed to generate link',
        description: sharingError || 'An error occurred while creating the share link.',
        type: 'error',
        duration: 3000,
      });
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      toaster.create({
        title: 'Link copied',
        description: 'Share link has been copied to your clipboard.',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      toaster.create({
        title: 'Failed to copy',
        description: 'Could not copy link to clipboard.',
        type: 'error',
        duration: 3000,
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
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="lg">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>Share Document</Dialog.Header>
          <Dialog.CloseTrigger />
          <Dialog.Body>
            <VStack gap={4} align="stretch">
              {/* Document Info */}
              <Box p={3} bg="gray.50" borderRadius="md">
                <Text fontSize="sm" fontWeight="medium" color="gray.600">
                  Sharing:
                </Text>
                <Text fontWeight="medium">{documentTitle}</Text>
              </Box>

              {/* Share Options */}
              <Field.Root display="flex" alignItems="center">
                <Field.Label htmlFor="expiry-toggle" mb="0" fontSize="sm">
                  Link expires in 7 days
                </Field.Label>
                <Switch.Root
                  id="expiry-toggle"
                  checked={hasExpiry}
                  onCheckedChange={(e) => setHasExpiry(e.checked)}
                >
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
              </Field.Root>

              {/* Generate/Show Link */}
              {!shareLink ? (
                <Button
                  colorScheme="blue"
                  onClick={generateShareLink}
                  loading={loading}
                  loadingText="Generating..."
                >
                  Generate Share Link
                </Button>
              ) : (
                <VStack gap={3} align="stretch">
                  <Text fontSize="sm" fontWeight="medium">
                    Share Link:
                  </Text>
                  <Box position="relative">
                    <Input
                      value={shareLink}
                      readOnly
                      pr="90px"
                      fontFamily="mono"
                      fontSize="xs"
                      size="sm"
                    />
                    <HStack
                      position="absolute"
                      right={2}
                      top="50%"
                      transform="translateY(-50%)"
                      gap={1}
                    >
                      <IconButton
                        aria-label="Copy link"
                        size="xs"
                        onClick={handleCopyLink}
                      >
                        <FiCopy />
                      </IconButton>
                      <IconButton
                        aria-label="Refresh link"
                        size="xs"
                        onClick={handleRefreshLink}
                      >
                        <FiRefreshCw />
                      </IconButton>
                    </HStack>
                  </Box>
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
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
