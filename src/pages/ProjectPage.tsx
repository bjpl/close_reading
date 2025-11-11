/**
 * Project Page
 *
 * Shows all documents within a project with upload capability.
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Button,
  Text,
  Grid,
  Card,
  CardBody,
  Badge,
  IconButton,
} from '@chakra-ui/react';
import {
  FiArrowLeft,
  FiUpload,
  FiFile,
  FiFileText,
  FiTrash2,
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { useDocuments } from '../hooks/useDocuments';
import { formatSimpleDate } from '../utils/dateUtils';
import { useProjectStore } from '../stores/projectStore';
import { DocumentUpload } from '../components/DocumentUpload';

export const ProjectPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { currentProject } = useProjectStore();
  const { documents, isLoading, deleteDocument } = useDocuments(
    projectId,
    user?.id
  );

  const [showUpload, setShowUpload] = React.useState(false);

  if (!projectId) {
    navigate('/dashboard');
    return null;
  }

  // Wait for auth to load before rendering upload component
  if (authLoading) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Text>Loading...</Text>
      </Box>
    );
  }

  const handleDocumentClick = (documentId: string) => {
    navigate(`/document/${documentId}`);
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    // Document list will refresh automatically via subscription
  };

  return (
    <Box minH="100vh" bg="gray.50" p={8}>
      <Container maxW="container.xl">
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between">
            <HStack>
              <IconButton
                aria-label="Back to dashboard"
                icon={<FiArrowLeft />}
                variant="ghost"
                onClick={() => navigate('/dashboard')}
              />
              <VStack align="start" spacing={0}>
                <Heading size="lg">{currentProject?.name || 'Project'}</Heading>
                {currentProject?.description && (
                  <Text color="gray.600" fontSize="sm">
                    {currentProject.description}
                  </Text>
                )}
              </VStack>
            </HStack>
            <Button
              colorScheme="blue"
              leftIcon={<FiUpload />}
              onClick={() => setShowUpload(!showUpload)}
            >
              Upload Document
            </Button>
          </HStack>

          {/* Upload Area */}
          {showUpload && (
            <DocumentUpload
              projectId={projectId}
              onUploadComplete={handleUploadComplete}
            />
          )}

          {/* Documents Grid */}
          {isLoading ? (
            <Text>Loading documents...</Text>
          ) : documents.length === 0 ? (
            <Box
              p={12}
              textAlign="center"
              borderWidth={2}
              borderRadius="lg"
              borderStyle="dashed"
              borderColor="gray.300"
            >
              <FiFileText size={48} style={{ margin: '0 auto', color: '#A0AEC0' }} />
              <Text mt={4} fontSize="lg" color="gray.600">
                No documents yet
              </Text>
              <Text fontSize="sm" color="gray.500">
                Upload your first document to get started
              </Text>
            </Box>
          ) : (
            <Grid templateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={4}>
              {documents.map((doc) => (
                <Card
                  key={doc.id}
                  cursor="pointer"
                  _hover={{ shadow: 'md' }}
                  transition="all 0.2s"
                  onClick={() => handleDocumentClick(doc.id)}
                >
                  <CardBody>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between">
                        <HStack>
                          <FiFile color="#3182CE" />
                          <Text fontWeight="bold" noOfLines={1}>
                            {doc.title}
                          </Text>
                        </HStack>
                        <IconButton
                          aria-label="Delete document"
                          icon={<FiTrash2 />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                `Delete "${doc.title}"?`
                              )
                            ) {
                              deleteDocument(doc.id);
                            }
                          }}
                        />
                      </HStack>

                      <Badge
                        colorScheme={
                          doc.processing_status === 'completed'
                            ? 'green'
                            : doc.processing_status === 'failed'
                            ? 'red'
                            : 'yellow'
                        }
                      >
                        {doc.processing_status}
                      </Badge>

                      <Text fontSize="xs" color="gray.500">
                        {formatSimpleDate(doc.created_at)}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </Grid>
          )}
        </VStack>
      </Container>
    </Box>
  );
};
