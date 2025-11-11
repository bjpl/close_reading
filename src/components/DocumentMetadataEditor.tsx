/**
 * DocumentMetadataEditor Component
 *
 * Allows editing document metadata including title and author.
 */
import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  FormControl,
  FormLabel,
  useToast,
} from '@chakra-ui/react';
import { FiEdit2, FiSave, FiX } from 'react-icons/fi';

interface DocumentMetadataEditorProps {
  documentId: string;
  currentTitle: string;
  currentAuthor?: string;
  onSave: (title: string, author: string) => Promise<void>;
}

export const DocumentMetadataEditor: React.FC<DocumentMetadataEditorProps> = ({
  documentId,
  currentTitle,
  currentAuthor = '',
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [author, setAuthor] = useState(currentAuthor);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a document title.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSaving(true);
      await onSave(title, author);
      setIsEditing(false);
      toast({
        title: 'Metadata updated',
        description: 'Document information has been saved.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save metadata.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(currentTitle);
    setAuthor(currentAuthor);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <HStack spacing={4} align="start">
        <VStack align="start" spacing={1} flex={1}>
          <Text fontSize="2xl" fontWeight="bold">
            {currentTitle}
          </Text>
          {currentAuthor && (
            <Text fontSize="sm" color="gray.600">
              by {currentAuthor}
            </Text>
          )}
        </VStack>
        <Button
          size="sm"
          leftIcon={<FiEdit2 />}
          onClick={() => setIsEditing(true)}
          variant="ghost"
        >
          Edit Info
        </Button>
      </HStack>
    );
  }

  return (
    <Box p={4} bg="gray.50" borderRadius="md" borderWidth={1}>
      <VStack spacing={3} align="stretch">
        <FormControl>
          <FormLabel fontSize="sm">Document Title</FormLabel>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter document title"
            size="sm"
          />
        </FormControl>

        <FormControl>
          <FormLabel fontSize="sm">Author (optional)</FormLabel>
          <Input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Enter author name"
            size="sm"
          />
        </FormControl>

        <HStack justify="flex-end" spacing={2}>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<FiX />}
            onClick={handleCancel}
            isDisabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            colorScheme="blue"
            leftIcon={<FiSave />}
            onClick={handleSave}
            isLoading={isSaving}
          >
            Save
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};
