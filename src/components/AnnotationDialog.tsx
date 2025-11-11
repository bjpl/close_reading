/**
 * AnnotationDialog Component
 *
 * Provides dialogs for annotation CRUD operations (Edit and Delete).
 */
import React from 'react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
  DialogCloseTrigger,
  Button,
  Input,
} from '@chakra-ui/react';

interface AnnotationDialogProps {
  type: 'edit' | 'delete';
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cancelRef?: React.RefObject<HTMLButtonElement | null>; // Optional in v3
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
  editValue,
  onEditValueChange,
}) => {
  const handleOpenChange = (details: { open: boolean }) => {
    if (!details.open) {
      onClose();
    }
  };

  if (type === 'delete') {
    return (
      <DialogRoot open={isOpen} onOpenChange={handleOpenChange}>
        <DialogBackdrop />
        <DialogContent>
          <DialogHeader fontSize="lg" fontWeight="bold">
            Delete Annotation
          </DialogHeader>
          <DialogCloseTrigger />

          <DialogBody>
            Are you sure you want to delete this annotation? This action cannot be undone.
          </DialogBody>

          <DialogFooter>
            <Button onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={onConfirm} ml={3}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogRoot>
    );
  }

  // Edit dialog
  return (
    <DialogRoot open={isOpen} onOpenChange={handleOpenChange}>
      <DialogBackdrop />
      <DialogContent>
        <DialogHeader fontSize="lg" fontWeight="bold">
          Edit Note
        </DialogHeader>
        <DialogCloseTrigger />

        <DialogBody>
          <Input
            value={editValue || ''}
            onChange={(e) => onEditValueChange?.(e.target.value)}
            placeholder="Enter your note..."
            autoFocus
          />
        </DialogBody>

        <DialogFooter>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={onConfirm} ml={3}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};
