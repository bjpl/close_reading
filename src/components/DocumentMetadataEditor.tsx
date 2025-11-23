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
  Field,
  createToaster,
} from '@chakra-ui/react';

const toaster = createToaster({ placement: 'top-end' });
import { FiEdit2, FiSave, FiX } from 'react-icons/fi';

interface DocumentMetadataEditorProps {
  documentId?: string;
  currentTitle: string;
  currentAuthor?: string;
  onSave: (title: string, author: string) => Promise<void>;
}

export const DocumentMetadataEditor: React.FC<DocumentMetadataEditorProps> = ({
  documentId: _documentId,
  currentTitle,
  currentAuthor = '',
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle);
  const [author, setAuthor] = useState(currentAuthor);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toaster.create({
        title: 'Title required',
        description: 'Please enter a document title.',
        type: 'warning',
        duration: 3000,
      });
      return;
    }

    try {
      setIsSaving(true);
      await onSave(title, author);
      setIsEditing(false);
      toaster.create({
        title: 'Metadata updated',
        description: 'Document information has been saved.',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      toaster.create({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Failed to save metadata.',
        type: 'error',
        duration: 3000,
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
      <HStack gap={4} align="start">
        <VStack align="start" gap={1} flex={1}>
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
          onClick={() => setIsEditing(true)}
          variant="ghost"
        >
          <FiEdit2 />
          Edit Info
        </Button>
      </HStack>
    );
  }

  return (
    <Box p={4} bg="gray.50" borderRadius="md" borderWidth={1}>
      <VStack gap={3} align="stretch">
        <Field.Root>
          <Field.Label fontSize="sm">Document Title</Field.Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter document title"
            size="sm"
          />
        </Field.Root>

        <Field.Root>
          <Field.Label fontSize="sm">Author (optional)</Field.Label>
          <Input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Enter author name"
            size="sm"
          />
        </Field.Root>

        <HStack justify="flex-end" gap={2}>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
          >
            <FiX />
            Cancel
          </Button>
          <Button
            size="sm"
            colorScheme="blue"
            onClick={handleSave}
            loading={isSaving}
          >
            <FiSave />
            Save
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};
