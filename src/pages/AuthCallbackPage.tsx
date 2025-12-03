/**
 * AuthCallbackPage
 *
 * Handles authentication callbacks from:
 * - Email verification links
 * - Password reset links
 * - OAuth redirects
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Spinner,
  Alert,
  Button,
} from '@chakra-ui/react';
import { supabase } from '../lib/supabase';
import logger from '../lib/logger';

type CallbackStatus = 'loading' | 'success' | 'error';
type CallbackType = 'email_verification' | 'password_reset' | 'oauth' | 'unknown';

export const AuthCallbackPage: React.FC = () => {
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [callbackType, setCallbackType] = useState<CallbackType>('unknown');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL params
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          logger.error({ error, errorDescription }, 'Auth callback error from URL');
          setStatus('error');
          setErrorMessage(errorDescription || 'Authentication failed');
          return;
        }

        // Check for auth code (OAuth or magic link)
        const code = searchParams.get('code');
        const type = searchParams.get('type');

        // Determine callback type
        if (type === 'signup' || type === 'email_change') {
          setCallbackType('email_verification');
        } else if (type === 'recovery') {
          setCallbackType('password_reset');
        } else if (code) {
          setCallbackType('oauth');
        }

        // If there's a code, exchange it for a session
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            logger.error({ error: exchangeError.message }, 'Failed to exchange code for session');
            setStatus('error');
            setErrorMessage(exchangeError.message);
            return;
          }

          logger.info({ userId: data.user?.id }, 'Successfully exchanged code for session');
          setStatus('success');

          // Redirect based on callback type
          setTimeout(() => {
            if (type === 'recovery') {
              // Redirect to profile page to set new password
              navigate('/profile', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          }, 2000);
          return;
        }

        // Check for hash fragment (older OAuth flows)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');

        if (accessToken) {
          // Session should be automatically set by Supabase
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            logger.info({ userId: session.user.id }, 'Session established from hash');
            setStatus('success');
            setCallbackType('oauth');
            setTimeout(() => {
              navigate('/dashboard', { replace: true });
            }, 2000);
            return;
          }
        }

        // No auth data found - might already be processed
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('success');
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1000);
        } else {
          setStatus('error');
          setErrorMessage('No authentication data found. Please try again.');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred';
        logger.error({ error: message }, 'Auth callback exception');
        setStatus('error');
        setErrorMessage(message);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  const getSuccessMessage = () => {
    switch (callbackType) {
      case 'email_verification':
        return 'Your email has been verified successfully!';
      case 'password_reset':
        return 'Password reset link verified. Redirecting to set your new password...';
      case 'oauth':
        return 'Successfully signed in! Redirecting...';
      default:
        return 'Authentication successful! Redirecting...';
    }
  };

  const getSuccessTitle = () => {
    switch (callbackType) {
      case 'email_verification':
        return 'Email Verified';
      case 'password_reset':
        return 'Reset Link Verified';
      case 'oauth':
        return 'Sign In Successful';
      default:
        return 'Success';
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" py={12}>
      <Container maxW="md">
        <VStack gap={8} align="stretch">
          <Box bg="white" p={8} borderRadius="lg" shadow="md" textAlign="center">
            {status === 'loading' && (
              <VStack gap={4}>
                <Box role="status" aria-live="polite" aria-label="Verifying authentication">
                  <Spinner size="xl" color="blue.500" />
                </Box>
                <Heading size="md">Verifying...</Heading>
                <Text color="gray.600">
                  Please wait while we verify your authentication.
                </Text>
              </VStack>
            )}

            {status === 'success' && (
              <VStack gap={4}>
                <Box fontSize="5xl" color="green.500">
                  &#10003;
                </Box>
                <Heading size="md" color="green.600">
                  {getSuccessTitle()}
                </Heading>
                <Text color="gray.600">{getSuccessMessage()}</Text>
                <Box role="status" aria-live="polite" aria-label="Redirecting">
                  <Spinner size="sm" color="gray.400" />
                </Box>
              </VStack>
            )}

            {status === 'error' && (
              <VStack gap={4}>
                <Box fontSize="5xl" color="red.500">
                  &#10007;
                </Box>
                <Heading size="md" color="red.600">
                  Verification Failed
                </Heading>
                <Alert.Root status="error" borderRadius="md">
                  <Alert.Indicator />
                  <Alert.Title>{errorMessage}</Alert.Title>
                </Alert.Root>
                <Button
                  colorScheme="blue"
                  onClick={() => navigate('/login', { replace: true })}
                >
                  Return to Login
                </Button>
              </VStack>
            )}
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};
