/**
 * Main App Component
 *
 * Sets up routing, authentication, and global providers.
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, Toaster, createToaster } from '@chakra-ui/react';
import { system } from './theme';
import { useAuth } from './hooks/useAuth';
import { LoginPage, DashboardPage, ProjectPage, DocumentPage } from './pages';
import { SharedDocumentPage } from './pages/SharedDocumentPage';
import { Box, Spinner } from '@chakra-ui/react';
import './styles/annotations.css';

export const toaster = createToaster({
  placement: 'top-end',
  duration: 3000,
});

/**
 * Protected Route Wrapper
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

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
 */
function App() {
  return (
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
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/shared/:token" element={<SharedDocumentPage />} />

          {/* Protected Routes */}
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
      </BrowserRouter>
    </ChakraProvider>
  );
}

export default App;
