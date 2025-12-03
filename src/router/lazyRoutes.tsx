/**
 * Lazy Loaded Routes
 *
 * Route-based code splitting for improved bundle size and performance.
 * Each page is loaded only when needed, reducing initial bundle size.
 */
import { lazy, Suspense } from 'react';
import { Center, Spinner, Box } from '@chakra-ui/react';

/**
 * Loading fallback component
 * Displays centered spinner during route lazy loading
 */
export const RouteLoader = () => (
  <Center h="100vh">
    <Box role="status" aria-live="polite" aria-label="Loading page">
      <Spinner
        size="xl"
        color="blue.500"
        thickness="4px"
        speed="0.65s"
      />
    </Box>
  </Center>
);

/**
 * Lazy load all page components
 * These are split into separate chunks by webpack/vite
 */

// Public pages
export const LoginPage = lazy(() =>
  import('../pages/LoginPage').then(module => ({ default: module.LoginPage }))
);

export const AuthCallbackPage = lazy(() =>
  import('../pages/AuthCallbackPage').then(module => ({ default: module.AuthCallbackPage }))
);

export const SharedDocumentPage = lazy(() =>
  import('../pages/SharedDocumentPage').then(module => ({ default: module.SharedDocumentPage }))
);

// Protected pages (authenticated users only)
export const DashboardPage = lazy(() =>
  import('../pages/DashboardPage').then(module => ({ default: module.DashboardPage }))
);

export const ProjectPage = lazy(() =>
  import('../pages/ProjectPage').then(module => ({ default: module.ProjectPage }))
);

export const DocumentPage = lazy(() =>
  import('../pages/DocumentPage').then(module => ({ default: module.DocumentPage }))
);

export const ProfilePage = lazy(() =>
  import('../pages/ProfilePage').then(module => ({ default: module.ProfilePage }))
);

/**
 * Wrapper component with Suspense for lazy-loaded routes
 * Usage: <LazyRoute component={DashboardPage} />
 */
export const LazyRoute: React.FC<{ component: React.LazyExoticComponent<React.ComponentType<any>> }> = ({
  component: Component
}) => (
  <Suspense fallback={<RouteLoader />}>
    <Component />
  </Suspense>
);
