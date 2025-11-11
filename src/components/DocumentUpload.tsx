/**
 * DocumentUpload Component
 *
 * Handles document file uploads with drag-and-drop support.
 * Supports PDF, DOCX, and TXT formats.
 */
import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Icon,
  createToaster,
  Progress,
} from '@chakra-ui/react';

const toaster = createToaster({ placement: 'top-end' });
import { FiUploadCloud, FiFile } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { useDocuments } from '../hooks/useDocuments';
import { processDocument } from '../services/documentProcessor';
import logger, { logError, logUserAction } from '../lib/logger';

interface DocumentUploadProps {
  onUploadComplete: (documentId: string) => void;
  projectId: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadComplete,
  projectId,
}) => {
  const { user, loading: authLoading } = useAuth();
  const { createDocument } = useDocuments(projectId, user?.id);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Use refs to always get the latest auth state
  const userRef = useRef(user);
  const authLoadingRef = useRef(authLoading);

  useEffect(() => {
    userRef.current = user;
    authLoadingRef.current = authLoading;
  }, [user, authLoading]);

  logger.debug({
    message: 'DocumentUpload render',
    authLoading,
    userEmail: user?.email || null
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    // Use ref values to get the latest state
    const currentUser = userRef.current;
    const currentAuthLoading = authLoadingRef.current;

    logger.info({
      message: 'Upload attempted',
      authLoading: currentAuthLoading,
      userEmail: currentUser?.email || null,
      fileName: file.name,
      fileSize: file.size
    });

    // Wait for auth to finish loading
    if (currentAuthLoading) {
      toaster.create({
        title: 'Loading',
        description: 'Please wait while we verify your session...',
        type: 'info',
        duration: 2000,
      });
      return;
    }

    if (!currentUser) {
      logger.error({ message: 'Upload blocked: No user found after auth loaded' });
      toaster.create({
        title: 'Not authenticated',
        description: 'Please log in to upload documents.',
        type: 'error',
        duration: 5000,
      });
      return;
    }
    logUserAction('document_upload_start', { userEmail: currentUser.email });

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!validTypes.includes(file.type)) {
      toaster.create({
        title: 'Invalid file type',
        description: 'Please upload a PDF, DOCX, or TXT file.',
        type: 'error',
        duration: 5000,
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toaster.create({
        title: 'File too large',
        description: 'Please upload a file smaller than 10MB.',
        type: 'error',
        duration: 5000,
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 80) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Upload document to Supabase Storage and create database record
      const document = await createDocument(file, projectId, currentUser.id, file.name);

      clearInterval(progressInterval);
      setUploadProgress(90);

      // Trigger background processing
      if (document) {
        processDocument(file, projectId).catch(
          (err) => {
            logError(err, { context: 'Background processing error', documentId: document.id });
            console.error('❌ Background processing failed:', err);
            toaster.create({
              title: 'Processing Error',
              description: 'Document uploaded but text processing failed. You may need to re-upload.',
              type: 'warning',
              duration: 8000,
            });
          }
        );
      }

      setUploadProgress(100);

      toaster.create({
        title: 'Upload successful',
        description: 'Your document has been uploaded and is being processed.',
        type: 'success',
        duration: 5000,
      });

      if (document) {
        onUploadComplete(document.id);
      }
    } catch (error) {
      toaster.create({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred while uploading your document.',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await processFile(files[0]);
      }
    },
    [projectId]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await processFile(files[0]);
      }
    },
    [projectId]
  );

  return (
    <Box
      p={8}
      borderWidth={2}
      borderRadius="lg"
      borderStyle="dashed"
      borderColor={isDragging ? 'blue.400' : 'gray.300'}
      bg={isDragging ? 'blue.50' : 'white'}
      transition="all 0.2s"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      opacity={authLoading ? 0.5 : 1}
    >
      <VStack gap={4}>
        <Icon
          as={isUploading ? FiFile : FiUploadCloud}
          boxSize={12}
          color={isDragging ? 'blue.400' : 'gray.400'}
        />

        {authLoading ? (
          <Text fontSize="lg" fontWeight="medium" color="gray.500">
            Loading authentication...
          </Text>
        ) : isUploading ? (
          <>
            <Text fontSize="lg" fontWeight="medium">
              Uploading document...
            </Text>
            <Progress.Root value={uploadProgress} width="100%">
              <Progress.Track>
                <Progress.Range colorPalette="blue" />
              </Progress.Track>
            </Progress.Root>
            <Text fontSize="sm" color="gray.600">
              {uploadProgress}% complete
            </Text>
          </>
        ) : (
          <>
            <Text fontSize="lg" fontWeight="medium">
              {isDragging
                ? 'Drop your document here'
                : 'Drag and drop your document'}
            </Text>
            <Text fontSize="sm" color="gray.600">
              or
            </Text>
            <label htmlFor="file-upload">
              <Button
                as="span"
                colorScheme="blue"
                cursor="pointer"
              >
                Browse Files
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
            <Text fontSize="xs" color="gray.500">
              Supports PDF, DOCX, and TXT files (max 10MB)
            </Text>
          </>
        )}
      </VStack>
    </Box>
  );
};
