/**
 * ProfilePage
 *
 * User profile management with:
 * - Display user email
 * - Update password
 * - Sign out button
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Text,
  Input,
  Button,
  Field,
  Alert,
  createToaster,
  Card,
} from '@chakra-ui/react';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import logger from '../lib/logger';
import { validatePassword } from '../hooks/useAuth';

const toaster = createToaster({
  placement: 'top-end',
  duration: 3000,
});

interface PasswordFormErrors {
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

export const ProfilePage: React.FC = () => {
  const { user, signOut } = useAuthContext();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [formErrors, setFormErrors] = useState<PasswordFormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Validate password form
   */
  const validateForm = useCallback((): boolean => {
    const errors: PasswordFormErrors = {};

    const passwordValidation = validatePassword(newPassword, true);
    if (!passwordValidation.isValid) {
      errors.newPassword = passwordValidation.errors[0];
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [newPassword, confirmPassword]);

  /**
   * Handle password update
   */
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setIsUpdating(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        logger.error({ error: error.message }, 'Password update failed');
        setFormErrors({ general: error.message });
        toaster.create({
          title: 'Password update failed',
          description: error.message,
          type: 'error',
          duration: 5000,
        });
      } else {
        logger.info('Password updated successfully');
        setSuccessMessage('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        toaster.create({
          title: 'Password updated',
          description: 'Your password has been changed successfully.',
          type: 'success',
          duration: 3000,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      logger.error({ error: message }, 'Password update exception');
      setFormErrors({ general: message });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle sign out
   */
  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  /**
   * Clear field errors when typing
   */
  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
    if (formErrors.newPassword) {
      setFormErrors((prev) => ({ ...prev, newPassword: undefined }));
    }
    setSuccessMessage('');
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (formErrors.confirmPassword) {
      setFormErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
    setSuccessMessage('');
  };

  return (
    <Box minH="100vh" bg="gray.50" py={12}>
      <Container maxW="lg">
        <VStack gap={8} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center">
            <Box>
              <Heading size="xl" mb={2}>
                Profile Settings
              </Heading>
              <Text color="gray.600">
                Manage your account settings and password
              </Text>
            </Box>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </HStack>

          {/* Account Info Card */}
          <Card.Root>
            <Card.Header>
              <Card.Title>Account Information</Card.Title>
            </Card.Header>
            <Card.Body>
              <VStack align="stretch" gap={4}>
                <Box>
                  <Text fontWeight="medium" color="gray.600" fontSize="sm">
                    Email Address
                  </Text>
                  <Text fontSize="lg">{user?.email || 'Not available'}</Text>
                </Box>
                <Box>
                  <Text fontWeight="medium" color="gray.600" fontSize="sm">
                    User ID
                  </Text>
                  <Text fontSize="sm" fontFamily="mono" color="gray.500">
                    {user?.id || 'Not available'}
                  </Text>
                </Box>
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Password Update Card */}
          <Card.Root>
            <Card.Header>
              <Card.Title>Update Password</Card.Title>
              <Card.Description>
                Change your password. Must be at least 6 characters with at least one letter and one number.
              </Card.Description>
            </Card.Header>
            <Card.Body>
              <form onSubmit={handleUpdatePassword}>
                <VStack gap={4} align="stretch">
                  {formErrors.general && (
                    <Alert.Root status="error" borderRadius="md">
                      <Alert.Indicator />
                      <Alert.Title>{formErrors.general}</Alert.Title>
                    </Alert.Root>
                  )}

                  {successMessage && (
                    <Alert.Root status="success" borderRadius="md">
                      <Alert.Indicator />
                      <Alert.Title>{successMessage}</Alert.Title>
                    </Alert.Root>
                  )}

                  <Field.Root required invalid={!!formErrors.newPassword}>
                    <Field.Label>New Password</Field.Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={handleNewPasswordChange}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                    />
                    {formErrors.newPassword && (
                      <Field.ErrorText>{formErrors.newPassword}</Field.ErrorText>
                    )}
                  </Field.Root>

                  <Field.Root required invalid={!!formErrors.confirmPassword}>
                    <Field.Label>Confirm New Password</Field.Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                    />
                    {formErrors.confirmPassword && (
                      <Field.ErrorText>{formErrors.confirmPassword}</Field.ErrorText>
                    )}
                  </Field.Root>

                  <Button
                    type="submit"
                    colorScheme="blue"
                    loading={isUpdating}
                    alignSelf="flex-start"
                  >
                    Update Password
                  </Button>
                </VStack>
              </form>
            </Card.Body>
          </Card.Root>

          {/* Sign Out Card */}
          <Card.Root>
            <Card.Header>
              <Card.Title>Sign Out</Card.Title>
              <Card.Description>
                Sign out of your account on this device.
              </Card.Description>
            </Card.Header>
            <Card.Body>
              <Button colorScheme="red" variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </Card.Body>
          </Card.Root>
        </VStack>
      </Container>
    </Box>
  );
};
