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

export const DocumentPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentDocument } = useDocumentStore();
  const { getDocumentWithContent, updateDocument, isLoading } = useDocuments(undefined, user?.id);

  useEffect(() => {
    if (documentId && user) {
      console.log('📄 Loading document:', documentId);
      getDocumentWithContent(documentId).catch(err => {
        console.error('❌ Failed to load document:', err);
      });
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
          icon={<FiArrowLeft />}
          variant="ghost"
          onClick={() => navigate(-1)}
        />
        {currentDocument && (
          <Box flex={1}>
            <DocumentMetadataEditor
              documentId={currentDocument.id}
              currentTitle={currentDocument.title}
              currentAuthor={(currentDocument as any).metadata?.author}
              onSave={handleSaveMetadata}
            />
          </Box>
        )}
      </HStack>

      {/* Main Content */}
      <HStack flex={1} spacing={0} align="stretch" overflow="hidden">
        {/* Left: Paragraph Linking Panel */}
        <ParagraphLinkingPanel />

        {/* Center: Document Viewer */}
        <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
          <AnnotationToolbar />
          <DocumentViewer />
        </Box>

        {/* Right: Annotation Review Panel */}
        {documentId && <AnnotationReviewPanel documentId={documentId} />}
      </HStack>
    </Box>
  );
};
