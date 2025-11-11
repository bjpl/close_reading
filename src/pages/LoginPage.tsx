/**
 * Login Page
 *
 * Authentication page for user login and registration.
 */
import React, { useState } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Input,
  Button,
  Field,
  createToaster,
  Tabs,
} from '@chakra-ui/react';

const toaster = createToaster({
  placement: 'top-end',
  duration: 3000,
});
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, error } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      toaster.create({
        title: 'Logged in successfully',
        type: 'success',
        duration: 3000,
      });
      navigate('/dashboard');
    } catch (err) {
      toaster.create({
        title: 'Login failed',
        description: error?.message || 'Please check your credentials',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signUp(email, password);
      toaster.create({
        title: 'Account created',
        description: 'Please check your email for verification link',
        type: 'success',
        duration: 5000,
      });
    } catch (err) {
      toaster.create({
        title: 'Sign up failed',
        description: error?.message,
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" py={12}>
      <Container maxW="md">
        <VStack gap={8} align="stretch">
          <Box textAlign="center">
            <Heading size="xl" mb={2}>
              Close Reading Platform
            </Heading>
            <Text color="gray.600">
              Analyze and annotate documents with AI-powered insights
            </Text>
          </Box>

          <Box bg="white" p={8} borderRadius="lg" shadow="md">
            <Tabs.Root fitted defaultValue="login">
              <Tabs.List mb={6}>
                <Tabs.Trigger value="login">Login</Tabs.Trigger>
                <Tabs.Trigger value="signup">Sign Up</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="login">
                <form onSubmit={handleLogin}>
                  <VStack gap={4}>
                      <Field.Root required invalid={!!error}>
                        <Field.Label>Email</Field.Label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                        />
                      </Field.Root>

                      <Field.Root required invalid={!!error}>
                        <Field.Label>Password</Field.Label>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                        />
                        {error && (
                          <Field.ErrorText>{error.message}</Field.ErrorText>
                        )}
                      </Field.Root>

                      <Button
                        type="submit"
                        colorScheme="blue"
                        width="100%"
                        loading={isLoading}
                      >
                        Log In
                      </Button>
                    </VStack>
                  </form>
                </Tabs.Content>

                <Tabs.Content value="signup">
                  <form onSubmit={handleSignUp}>
                    <VStack gap={4}>
                      <Field.Root required invalid={!!error}>
                        <Field.Label>Email</Field.Label>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                        />
                      </Field.Root>

                      <Field.Root required invalid={!!error}>
                        <Field.Label>Password</Field.Label>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a password"
                        />
                        {error && (
                          <Field.ErrorText>{error.message}</Field.ErrorText>
                        )}
                      </Field.Root>

                      <Button
                        type="submit"
                        colorScheme="blue"
                        width="100%"
                        loading={isLoading}
                      >
                        Sign Up
                      </Button>
                    </VStack>
                  </form>
                </Tabs.Content>
              </Tabs.Root>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};
