/**
 * Login Page
 *
 * Authentication page for user login and registration with improved
 * validation, error handling, and user feedback.
 */
import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Link,
  HStack,
  Separator,
} from '@chakra-ui/react';
import { FaGoogle, FaGithub } from 'react-icons/fa';

const toaster = createToaster({
  placement: 'top-end',
  duration: 3000,
});
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, validateEmail, validatePassword } from '../hooks/useAuth';

/**
 * Form validation errors interface
 */
interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const { signIn, signUp, resetPassword, signInWithGoogle, signInWithGitHub, isAuthenticated, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect path from location state, default to dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Clear form errors when switching tabs
  useEffect(() => {
    setFormErrors({});
    clearError();
  }, [activeTab, clearError]);

  /**
   * Validate form inputs
   */
  const validateForm = useCallback((isSignUp: boolean): boolean => {
    const errors: FormErrors = {};

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors[0];
    }

    const passwordValidation = validatePassword(password, isSignUp);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password]);

  /**
   * Handle login form submission
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!validateForm(false)) {
      return;
    }

    setIsLoading(true);

    const result = await signIn(email, password);

    if (result.success) {
      toaster.create({
        title: 'Welcome back!',
        description: 'You have been logged in successfully.',
        type: 'success',
        duration: 3000,
      });
      // Navigation will happen automatically via useEffect when isAuthenticated changes
    } else {
      setFormErrors({ general: result.error });
      toaster.create({
        title: 'Login failed',
        description: result.error || 'Please check your credentials and try again.',
        type: 'error',
        duration: 5000,
      });
    }

    setIsLoading(false);
  };

  /**
   * Handle signup form submission
   */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!validateForm(true)) {
      return;
    }

    setIsLoading(true);

    const result = await signUp(email, password);

    if (result.success) {
      toaster.create({
        title: 'Account created!',
        description: 'Welcome to Close Reading Platform.',
        type: 'success',
        duration: 5000,
      });
      // Navigation will happen automatically via useEffect when isAuthenticated changes
    } else {
      setFormErrors({ general: result.error });
      toaster.create({
        title: 'Sign up failed',
        description: result.error || 'Please try again with different credentials.',
        type: 'error',
        duration: 5000,
      });
    }

    setIsLoading(false);
  };

  /**
   * Handle password reset request
   */
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setFormErrors({ email: emailValidation.errors[0] });
      return;
    }

    setIsLoading(true);

    const result = await resetPassword(email);

    if (result.success) {
      toaster.create({
        title: 'Password reset email sent',
        description: 'Check your email for instructions to reset your password.',
        type: 'success',
        duration: 5000,
      });
      setShowPasswordReset(false);
    } else {
      setFormErrors({ general: result.error });
      toaster.create({
        title: 'Password reset failed',
        description: result.error || 'Please try again later.',
        type: 'error',
        duration: 5000,
      });
    }

    setIsLoading(false);
  };

  /**
   * Clear field error when user starts typing
   */
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (formErrors.email) {
      setFormErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (formErrors.password) {
      setFormErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  /**
   * Handle Google OAuth sign-in
   */
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const result = await signInWithGoogle();

    if (!result.success) {
      toaster.create({
        title: 'Google sign-in failed',
        description: result.error || 'Please try again later.',
        type: 'error',
        duration: 5000,
      });
      setIsLoading(false);
    }
    // If successful, user will be redirected, so no need to set loading to false
  };

  /**
   * Handle GitHub OAuth sign-in
   */
  const handleGitHubSignIn = async () => {
    setIsLoading(true);
    const result = await signInWithGitHub();

    if (!result.success) {
      toaster.create({
        title: 'GitHub sign-in failed',
        description: result.error || 'Please try again later.',
        type: 'error',
        duration: 5000,
      });
      setIsLoading(false);
    }
    // If successful, user will be redirected, so no need to set loading to false
  };

  // Password reset form
  if (showPasswordReset) {
    return (
      <Box minH="100vh" bg="gray.50" py={12}>
        <Container maxW="md">
          <VStack gap={8} align="stretch">
            <Box textAlign="center">
              <Heading size="xl" mb={2}>
                Reset Password
              </Heading>
              <Text color="gray.600">
                Enter your email address and we will send you a link to reset your password.
              </Text>
            </Box>

            <Box bg="white" p={8} borderRadius="lg" shadow="md">
              <form onSubmit={handlePasswordReset}>
                <VStack gap={4}>
                  {formErrors.general && (
                    <Alert.Root status="error" borderRadius="md">
                      <Alert.Indicator />
                      <Alert.Title>{formErrors.general}</Alert.Title>
                    </Alert.Root>
                  )}

                  <Field.Root required invalid={!!formErrors.email}>
                    <Field.Label>Email</Field.Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      placeholder="Enter your email"
                      autoComplete="email"
                    />
                    {formErrors.email && (
                      <Field.ErrorText>{formErrors.email}</Field.ErrorText>
                    )}
                  </Field.Root>

                  <Button
                    type="submit"
                    colorScheme="blue"
                    width="100%"
                    loading={isLoading}
                  >
                    Send Reset Link
                  </Button>

                  <Button
                    variant="ghost"
                    width="100%"
                    onClick={() => setShowPasswordReset(false)}
                  >
                    Back to Login
                  </Button>
                </VStack>
              </form>
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

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
            <Tabs.Root
              fitted
              value={activeTab}
              onValueChange={(details) => setActiveTab(details.value as 'login' | 'signup')}
            >
              <Tabs.List mb={6}>
                <Tabs.Trigger value="login">Login</Tabs.Trigger>
                <Tabs.Trigger value="signup">Sign Up</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="login">
                <form onSubmit={handleLogin}>
                  <VStack gap={4}>
                    {formErrors.general && (
                      <Alert.Root status="error" borderRadius="md">
                        <Alert.Indicator />
                        <Alert.Title>{formErrors.general}</Alert.Title>
                      </Alert.Root>
                    )}

                    <Field.Root required invalid={!!formErrors.email}>
                      <Field.Label>Email</Field.Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        placeholder="Enter your email"
                        autoComplete="email"
                      />
                      {formErrors.email && (
                        <Field.ErrorText>{formErrors.email}</Field.ErrorText>
                      )}
                    </Field.Root>

                    <Field.Root required invalid={!!formErrors.password}>
                      <Field.Label>Password</Field.Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={handlePasswordChange}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                      />
                      {formErrors.password && (
                        <Field.ErrorText>{formErrors.password}</Field.ErrorText>
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

                    <Link
                      color="blue.500"
                      fontSize="sm"
                      cursor="pointer"
                      onClick={() => setShowPasswordReset(true)}
                    >
                      Forgot your password?
                    </Link>

                    <HStack width="100%" alignItems="center" my={2}>
                      <Separator flex="1" />
                      <Text fontSize="sm" color="gray.500" px={3}>
                        or continue with
                      </Text>
                      <Separator flex="1" />
                    </HStack>

                    <HStack width="100%" gap={3}>
                      <Button
                        variant="outline"
                        width="100%"
                        onClick={handleGoogleSignIn}
                        loading={isLoading}
                      >
                        <FaGoogle style={{ marginRight: '8px' }} />
                        Google
                      </Button>
                      <Button
                        variant="outline"
                        width="100%"
                        onClick={handleGitHubSignIn}
                        loading={isLoading}
                      >
                        <FaGithub style={{ marginRight: '8px' }} />
                        GitHub
                      </Button>
                    </HStack>
                  </VStack>
                </form>
              </Tabs.Content>

              <Tabs.Content value="signup">
                <form onSubmit={handleSignUp}>
                  <VStack gap={4}>
                    {formErrors.general && (
                      <Alert.Root status="error" borderRadius="md">
                        <Alert.Indicator />
                        <Alert.Title>{formErrors.general}</Alert.Title>
                      </Alert.Root>
                    )}

                    <Field.Root required invalid={!!formErrors.email}>
                      <Field.Label>Email</Field.Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        placeholder="Enter your email"
                        autoComplete="email"
                      />
                      {formErrors.email && (
                        <Field.ErrorText>{formErrors.email}</Field.ErrorText>
                      )}
                    </Field.Root>

                    <Field.Root required invalid={!!formErrors.password}>
                      <Field.Label>Password</Field.Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={handlePasswordChange}
                        placeholder="Create a password (min 6 chars, include letter and number)"
                        autoComplete="new-password"
                      />
                      {formErrors.password && (
                        <Field.ErrorText>{formErrors.password}</Field.ErrorText>
                      )}
                      <Field.HelperText>
                        Password must be at least 6 characters with at least one letter and one number.
                      </Field.HelperText>
                    </Field.Root>

                    <Button
                      type="submit"
                      colorScheme="blue"
                      width="100%"
                      loading={isLoading}
                    >
                      Sign Up
                    </Button>

                    <HStack width="100%" alignItems="center" my={2}>
                      <Separator flex="1" />
                      <Text fontSize="sm" color="gray.500" px={3}>
                        or continue with
                      </Text>
                      <Separator flex="1" />
                    </HStack>

                    <HStack width="100%" gap={3}>
                      <Button
                        variant="outline"
                        width="100%"
                        onClick={handleGoogleSignIn}
                        loading={isLoading}
                      >
                        <FaGoogle style={{ marginRight: '8px' }} />
                        Google
                      </Button>
                      <Button
                        variant="outline"
                        width="100%"
                        onClick={handleGitHubSignIn}
                        loading={isLoading}
                      >
                        <FaGithub style={{ marginRight: '8px' }} />
                        GitHub
                      </Button>
                    </HStack>
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
