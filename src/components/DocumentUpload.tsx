/**
 * DocumentUpload Component
 *
 * Handles document file uploads with drag-and-drop support.
 * Supports PDF, DOCX, and TXT formats.
 */
import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Text,
  Icon,
  useToast,
  Progress,
} from '@chakra-ui/react';
import { FiUploadCloud, FiFile } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { useDocuments } from '../hooks/useDocuments';
import { processDocument } from '../services/documentProcessor';

interface DocumentUploadProps {
  onUploadComplete: (documentId: string) => void;
  projectId: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadComplete,
  projectId,
}) => {
  const { user } = useAuth();
  const { createDocument } = useDocuments(projectId, user?.id);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const toast = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in to upload documents.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF, DOCX, or TXT file.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 10MB.',
        status: 'error',
        duration: 5000,
        isClosable: true,
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
      const document = await createDocument(file, projectId, user.id, file.name);

      clearInterval(progressInterval);
      setUploadProgress(90);

      // Trigger background processing
      if (document) {
        processDocument(file, projectId).catch(
          (err) => console.error('Background processing error:', err)
        );
      }

      setUploadProgress(100);

      toast({
        title: 'Upload successful',
        description: 'Your document has been uploaded and is being processed.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      if (document) {
        onUploadComplete(document.id);
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred while uploading your document.',
        status: 'error',
        duration: 5000,
        isClosable: true,
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
    >
      <VStack spacing={4}>
        <Icon
          as={isUploading ? FiFile : FiUploadCloud}
          boxSize={12}
          color={isDragging ? 'blue.400' : 'gray.400'}
        />

        {isUploading ? (
          <>
            <Text fontSize="lg" fontWeight="medium">
              Uploading document...
            </Text>
            <Progress
              value={uploadProgress}
              width="100%"
              colorScheme="blue"
              borderRadius="md"
            />
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
            <Button
              as="label"
              colorScheme="blue"
              cursor="pointer"
              htmlFor="file-upload"
            >
              Browse Files
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </Button>
            <Text fontSize="xs" color="gray.500">
              Supports PDF, DOCX, and TXT files (max 10MB)
            </Text>
          </>
        )}
      </VStack>
    </Box>
  );
};
