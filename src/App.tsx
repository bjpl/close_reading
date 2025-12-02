/**
 * Main App Component
 *
 * Sets up routing, authentication, and global providers.
 * Includes global error boundary for graceful error handling.
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, Toaster, createToaster } from '@chakra-ui/react';
import { system } from './theme';
import { AuthProvider, useAuthContext } from './contexts/AuthContext';
import { LoginPage, DashboardPage, ProjectPage, DocumentPage, AuthCallbackPage, ProfilePage } from './pages';
import { SharedDocumentPage } from './pages/SharedDocumentPage';
import { Box, Spinner, VStack, Text, Button, HStack } from '@chakra-ui/react';
import { ErrorBoundary, FallbackProps } from './components/ErrorBoundary';
import logger from './lib/logger';
import './styles/annotations.css';

export const toaster = createToaster({
  placement: 'top-end',
  duration: 3000,
});

/**
 * Global App Error Fallback
 * Displays a full-page error UI when the app encounters an unrecoverable error
 */
const AppErrorFallback: React.FC<FallbackProps> = ({
  error,
  resetError,
  errorId,
  isDevelopment,
}) => (
  <Box
    minH="100vh"
    display="flex"
    alignItems="center"
    justifyContent="center"
    bg="gray.50"
    p={8}
  >
    <VStack gap={6} maxW="500px" textAlign="center">
      <Box fontSize="6xl" color="red.400">
        &#9888;
      </Box>
      <Text fontSize="2xl" fontWeight="bold" color="gray.800">
        Application Error
      </Text>
      <Text color="gray.600">
        We apologize for the inconvenience. The application encountered an unexpected error.
        Please try refreshing the page or contact support if the problem persists.
      </Text>

      {isDevelopment && (
        <Box
          w="100%"
          p={4}
          bg="red.50"
          borderRadius="md"
          textAlign="left"
          fontSize="sm"
        >
          <Text fontWeight="bold" color="red.700" mb={2}>
            {error.name}: {error.message}
          </Text>
          <Text color="gray.600" fontSize="xs" fontFamily="mono">
            {error.stack?.split('\n').slice(0, 5).join('\n')}
          </Text>
        </Box>
      )}

      <Text color="gray.400" fontSize="xs">
        Error Reference: {errorId}
      </Text>

      <HStack gap={4}>
        <Button colorScheme="blue" size="lg" onClick={resetError}>
          Try Again
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => window.location.href = '/dashboard'}
        >
          Go to Dashboard
        </Button>
      </HStack>
    </VStack>
  </Box>
);

/**
 * Handle global app errors
 */
const handleAppError = (error: Error, errorInfo: React.ErrorInfo) => {
  logger.error({
    message: 'Global app error caught',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    componentStack: errorInfo.componentStack,
  });
};

/**
 * Protected Route Wrapper
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/**
 * Main App Component
 * Wrapped with ErrorBoundary for global error handling
 */
function App() {
  return (
    <ErrorBoundary
      level="app"
      onError={handleAppError}
      fallback={(props) => <AppErrorFallback {...props} />}
    >
      <ChakraProvider value={system}>
        <Toaster toaster={toaster}>
          {(toast) => (
            <Box
              bg="bg.panel"
              borderRadius="md"
              boxShadow="md"
              p={4}
              minW="300px"
            >
              {toast.title && <Box fontWeight="bold" mb={1}>{toast.title}</Box>}
              {toast.description && <Box fontSize="sm">{toast.description}</Box>}
            </Box>
          )}
        </Toaster>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/shared/:token" element={<SharedDocumentPage />} />

              {/* Protected Routes */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:projectId"
                element={
                  <ProtectedRoute>
                    <ProjectPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/document/:documentId"
                element={
                  <ProtectedRoute>
                    <DocumentPage />
                  </ProtectedRoute>
                }
              />

              {/* Default Route */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ChakraProvider>
    </ErrorBoundary>
  );
}

export default App;
