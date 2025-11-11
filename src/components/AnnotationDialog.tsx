/**
 * AnnotationDialog Component
 *
 * Provides dialogs for annotation CRUD operations (Edit and Delete).
 */
import React from 'react';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  Input,
} from '@chakra-ui/react';

interface AnnotationDialogProps {
  type: 'edit' | 'delete';
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cancelRef: React.RefObject<HTMLButtonElement>;
  editValue?: string;
  onEditValueChange?: (value: string) => void;
}

/**
 * Reusable dialog for annotation operations
 */
export const AnnotationDialog: React.FC<AnnotationDialogProps> = ({
  type,
  isOpen,
  onClose,
  onConfirm,
  cancelRef,
  editValue,
  onEditValueChange,
}) => {
  if (type === 'delete') {
    return (
      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Annotation
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this annotation? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={onConfirm} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    );
  }

  // Edit dialog
  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Edit Note
          </AlertDialogHeader>

          <AlertDialogBody>
            <Input
              value={editValue || ''}
              onChange={(e) => onEditValueChange?.(e.target.value)}
              placeholder="Enter your note..."
              autoFocus
            />
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={onConfirm} ml={3}>
              Save
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};
