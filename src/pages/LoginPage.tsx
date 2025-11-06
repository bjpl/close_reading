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
  FormControl,
  FormLabel,
  FormErrorMessage,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, error } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(email, password);
      toast({
        title: 'Logged in successfully',
        status: 'success',
        duration: 3000,
      });
      navigate('/dashboard');
    } catch (err) {
      toast({
        title: 'Login failed',
        description: error?.message || 'Please check your credentials',
        status: 'error',
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
      toast({
        title: 'Account created',
        description: 'Please check your email for verification link',
        status: 'success',
        duration: 5000,
      });
    } catch (err) {
      toast({
        title: 'Sign up failed',
        description: error?.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" py={12}>
      <Container maxW="md">
        <VStack spacing={8} align="stretch">
          <Box textAlign="center">
            <Heading size="xl" mb={2}>
              Close Reading Platform
            </Heading>
            <Text color="gray.600">
              Analyze and annotate documents with AI-powered insights
            </Text>
          </Box>

          <Box bg="white" p={8} borderRadius="lg" shadow="md">
            <Tabs isFitted>
              <TabList mb={6}>
                <Tab>Login</Tab>
                <Tab>Sign Up</Tab>
              </TabList>

              <TabPanels>
                <TabPanel>
                  <form onSubmit={handleLogin}>
                    <VStack spacing={4}>
                      <FormControl isRequired isInvalid={!!error}>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                        />
                      </FormControl>

                      <FormControl isRequired isInvalid={!!error}>
                        <FormLabel>Password</FormLabel>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                        />
                        {error && (
                          <FormErrorMessage>{error.message}</FormErrorMessage>
                        )}
                      </FormControl>

                      <Button
                        type="submit"
                        colorScheme="blue"
                        width="100%"
                        isLoading={isLoading}
                      >
                        Log In
                      </Button>
                    </VStack>
                  </form>
                </TabPanel>

                <TabPanel>
                  <form onSubmit={handleSignUp}>
                    <VStack spacing={4}>
                      <FormControl isRequired isInvalid={!!error}>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                        />
                      </FormControl>

                      <FormControl isRequired isInvalid={!!error}>
                        <FormLabel>Password</FormLabel>
                        <Input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a password"
                        />
                        {error && (
                          <FormErrorMessage>{error.message}</FormErrorMessage>
                        )}
                      </FormControl>

                      <Button
                        type="submit"
                        colorScheme="blue"
                        width="100%"
                        isLoading={isLoading}
                      >
                        Sign Up
                      </Button>
                    </VStack>
                  </form>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};
