/**
 * Document Page
 *
 * Full document viewing and annotation interface.
 */
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, HStack, Spinner, IconButton } from '@chakra-ui/react';
import { FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { useDocuments } from '../hooks/useDocuments';
import { useDocumentStore } from '../stores/documentStore';
import { DocumentViewer } from '../components/DocumentViewer';
import { AnnotationToolbar } from '../components/AnnotationToolbar';
import { ParagraphLinkingPanel } from '../components/ParagraphLinkingPanel';
import { DocumentMetadataEditor } from '../components/DocumentMetadataEditor';
import { AnnotationReviewPanel } from '../components/AnnotationReviewPanel';
import { logger } from '../utils/logger';

export const DocumentPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentDocument } = useDocumentStore();
  const { getDocumentWithContent, updateDocument, isLoading } = useDocuments(undefined, user?.id);

  useEffect(() => {
    if (documentId && user) {
      logger.info({ documentId }, '📄 Loading document');
      getDocumentWithContent(documentId).catch(err => {
        logger.error({ error: err }, '❌ Failed to load document');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <Box role="status" aria-live="polite" aria-label="Loading document">
          <Spinner size="xl" />
        </Box>
      </Box>
    );
  }

  const handleSaveMetadata = async (title: string, author: string) => {
    if (!documentId) return;

    await updateDocument(documentId, {
      title,
      metadata: { author },
    });
  };

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
          variant="ghost"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft />
        </IconButton>
        {currentDocument && (
          <Box flex={1}>
            <DocumentMetadataEditor
              documentId={currentDocument.id}
              currentTitle={currentDocument.title}
              currentAuthor={(currentDocument as { metadata?: { author?: string } }).metadata?.author}
              onSave={handleSaveMetadata}
            />
          </Box>
        )}
      </HStack>

      {/* Main Content */}
      <HStack flex={1} gap={0} align="stretch" overflow="hidden">
        {/* Left: Paragraph Linking Panel */}
        <ParagraphLinkingPanel />

        {/* Center: Document Viewer */}
        <Box id="main-content" flex={1} display="flex" flexDirection="column" overflow="hidden">
          <AnnotationToolbar />
          <DocumentViewer />
        </Box>

        {/* Right: Annotation Review Panel */}
        {documentId && <AnnotationReviewPanel documentId={documentId} />}
      </HStack>
    </Box>
  );
};
