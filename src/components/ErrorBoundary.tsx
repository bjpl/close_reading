/**
 * ErrorBoundary Component
 *
 * Comprehensive React Error Boundary for graceful error handling.
 * Features:
 * - Catches JavaScript errors in child component tree
 * - Integrates with centralized logging system
 * - User-friendly fallback UI with reset functionality
 * - Development vs production mode detection
 * - Error reporting and recovery mechanisms
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Text, VStack, HStack, Code } from '@chakra-ui/react';
import logger, { logError, createLogger } from '../lib/logger';

// Create a dedicated logger for error boundary
const errorBoundaryLogger = createLogger({ component: 'ErrorBoundary' });

/**
 * Error details interface for structured error information
 */
export interface ErrorDetails {
  error: Error;
  errorInfo: ErrorInfo;
  timestamp: Date;
  componentStack: string;
  errorId: string;
}

/**
 * Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Custom fallback UI component */
  fallback?: ReactNode | ((props: FallbackProps) => ReactNode);
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Callback when reset is triggered */
  onReset?: () => void;
  /** Error boundary level for nested boundaries */
  level?: 'app' | 'page' | 'component';
  /** Whether to show detailed error info (overrides environment detection) */
  showDetails?: boolean;
}

/**
 * Props passed to fallback component
 */
export interface FallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  resetError: () => void;
  errorId: string;
  isDevelopment: boolean;
}

/**
 * State for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  errorCount: number;
}

/**
 * Detect if running in development mode
 */
const isDevelopment = (): boolean => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.MODE === 'development' || import.meta.env.DEV;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'development';
  }
  return false;
};

/**
 * Generate a unique error ID for tracking
 */
const generateErrorId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `err_${timestamp}_${random}`;
};

/**
 * Default Fallback UI Component
 */
const DefaultFallback: React.FC<FallbackProps> = ({
  error,
  errorInfo,
  resetError,
  errorId,
  isDevelopment: isDev,
}) => {
  return (
    <Box
      minH="200px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={8}
      bg="gray.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="red.200"
    >
      <VStack gap={4} maxW="600px" textAlign="center">
        <Box color="red.500" fontSize="4xl">
          &#9888;
        </Box>
        <Text fontSize="xl" fontWeight="bold" color="gray.800">
          Something went wrong
        </Text>
        <Text color="gray.600" fontSize="sm">
          An unexpected error occurred. Our team has been notified.
        </Text>

        {isDev && (
          <Box
            w="100%"
            p={4}
            bg="red.50"
            borderRadius="md"
            border="1px solid"
            borderColor="red.200"
            textAlign="left"
          >
            <Text fontWeight="bold" color="red.700" mb={2}>
              Error Details (Development Only)
            </Text>
            <Code
              display="block"
              whiteSpace="pre-wrap"
              p={2}
              bg="gray.800"
              color="red.300"
              borderRadius="md"
              fontSize="xs"
              maxH="200px"
              overflow="auto"
            >
              {error.name}: {error.message}
              {'\n\n'}
              Stack Trace:
              {'\n'}
              {error.stack}
            </Code>
            {errorInfo.componentStack && (
              <Box mt={3}>
                <Text fontWeight="bold" color="red.700" mb={1} fontSize="sm">
                  Component Stack:
                </Text>
                <Code
                  display="block"
                  whiteSpace="pre-wrap"
                  p={2}
                  bg="gray.800"
                  color="yellow.300"
                  borderRadius="md"
                  fontSize="xs"
                  maxH="150px"
                  overflow="auto"
                >
                  {errorInfo.componentStack}
                </Code>
              </Box>
            )}
          </Box>
        )}

        <Text color="gray.500" fontSize="xs">
          Error ID: {errorId}
        </Text>

        <HStack gap={3}>
          <Button
            colorScheme="blue"
            onClick={resetError}
            size="md"
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            size="md"
          >
            Reload Page
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   level="page"
 *   onError={(error, info) => trackError(error)}
 *   fallback={<CustomErrorPage />}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      errorCount: 0,
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  /**
   * Log error information when caught
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, level = 'component' } = this.props;
    const { errorId, errorCount } = this.state;

    // Update state with error info
    this.setState({
      errorInfo,
      errorCount: errorCount + 1,
    });

    // Log the error with full context
    const errorDetails: ErrorDetails = {
      error,
      errorInfo,
      timestamp: new Date(),
      componentStack: errorInfo.componentStack || '',
      errorId,
    };

    // Use structured logging
    logError(error, {
      errorId,
      level,
      componentStack: errorInfo.componentStack,
      errorCount: errorCount + 1,
      type: 'react-error-boundary',
    });

    // Additional detailed logging in development
    if (isDevelopment()) {
      errorBoundaryLogger.debug({
        message: 'Error boundary caught error',
        errorDetails: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        componentStack: errorInfo.componentStack,
        level,
        errorId,
      });
    }

    // Log to console for visibility
    logger.error({
      message: `[ErrorBoundary][${level}] Caught error: ${error.message}`,
      errorId,
      errorName: error.name,
    });

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (handlerError) {
        logError(handlerError as Error, {
          context: 'Error in onError callback',
          originalErrorId: errorId,
        });
      }
    }

    // In production, could send to error tracking service
    if (!isDevelopment()) {
      this.reportErrorToService(errorDetails);
    }
  }

  /**
   * Report error to external service (placeholder for production)
   */
  private reportErrorToService(errorDetails: ErrorDetails): void {
    // This would integrate with services like Sentry, LogRocket, etc.
    // For now, just log that we would report
    logger.info({
      message: 'Would report error to tracking service',
      errorId: errorDetails.errorId,
      errorMessage: errorDetails.error.message,
    });
  }

  /**
   * Reset the error boundary state
   */
  resetError = (): void => {
    const { onReset } = this.props;

    logger.info({
      message: 'Error boundary reset triggered',
      errorId: this.state.errorId,
      errorCount: this.state.errorCount,
    });

    // Clear any pending reset timeout
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });

    // Call custom reset handler if provided
    if (onReset) {
      try {
        onReset();
      } catch (resetError) {
        logError(resetError as Error, {
          context: 'Error in onReset callback',
        });
      }
    }
  };

  /**
   * Cleanup on unmount
   */
  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  render(): ReactNode {
    const { children, fallback, showDetails } = this.props;
    const { hasError, error, errorInfo, errorId } = this.state;

    if (hasError && error && errorInfo) {
      const isDev = showDetails ?? isDevelopment();

      const fallbackProps: FallbackProps = {
        error,
        errorInfo,
        resetError: this.resetError,
        errorId,
        isDevelopment: isDev,
      };

      // Use custom fallback if provided
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(fallbackProps);
        }
        return fallback;
      }

      // Use default fallback
      return <DefaultFallback {...fallbackProps} />;
    }

    return children;
  }
}

/**
 * Higher-order component to wrap a component with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return ComponentWithErrorBoundary;
}

/**
 * Hook to manually trigger error boundary
 * Note: This doesn't actually catch errors, but provides a way to throw
 * from event handlers that error boundaries normally don't catch
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error | null>(null);

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}

export default ErrorBoundary;
