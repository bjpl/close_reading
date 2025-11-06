/**
 * Document Page
 *
 * Full document viewing and annotation interface.
 */
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, HStack, Spinner, Text, IconButton } from '@chakra-ui/react';
import { FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { useDocuments } from '../hooks/useDocuments';
import { DocumentViewer } from '../components/DocumentViewer';
import { AnnotationToolbar } from '../components/AnnotationToolbar';
import { ParagraphLinkingPanel } from '../components/ParagraphLinkingPanel';

export const DocumentPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getDocumentWithContent, isLoading } = useDocuments(undefined, user?.id);

  useEffect(() => {
    if (documentId && user) {
      getDocumentWithContent(documentId);
    }
  }, [documentId, user]);

  if (!documentId) {
    navigate('/dashboard');
    return null;
  }

  if (isLoading) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box h="100vh" display="flex" flexDirection="column" bg="gray.50">
      {/* Header */}
      <HStack
        px={4}
        py={3}
        borderBottomWidth={1}
        borderColor="gray.200"
        bg="white"
      >
        <IconButton
          aria-label="Back"
          icon={<FiArrowLeft />}
          variant="ghost"
          onClick={() => navigate(-1)}
        />
        <Text fontWeight="bold" fontSize="lg">
          Document Viewer
        </Text>
      </HStack>

      {/* Main Content */}
      <HStack flex={1} spacing={0} align="stretch">
        {/* Left: Document Viewer */}
        <Box flex={1} display="flex" flexDirection="column">
          <AnnotationToolbar />
          <DocumentViewer />
        </Box>

        {/* Right: Paragraph Linking Panel */}
        <ParagraphLinkingPanel />
      </HStack>
    </Box>
  );
};
