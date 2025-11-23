/**
 * ErrorBoundary Component Tests
 *
 * Comprehensive test suite for the React Error Boundary component.
 * Tests error catching, logging integration, fallback UI, and reset functionality.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import {
  ErrorBoundary,
  withErrorBoundary,
  useErrorHandler,
  FallbackProps,
} from '../../../src/components/ErrorBoundary';

// Import mocked logger for assertions (mocked in setup.ts)
import logger, { logError } from '../../../src/lib/logger';

// Wrapper component for Chakra UI
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider>{children}</ChakraProvider>
);

// Component that throws an error
const ThrowingComponent: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({
  shouldThrow = true,
  errorMessage = 'Test error',
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="working-component">Working component</div>;
};

// Component that renders normally
const WorkingComponent: React.FC = () => (
  <div data-testid="working-component">Working component</div>
);

// Custom fallback component for testing
const CustomFallback: React.FC<FallbackProps> = ({ error, resetError, errorId }) => (
  <div data-testid="custom-fallback">
    <span data-testid="error-message">{error.message}</span>
    <span data-testid="error-id">{errorId}</span>
    <button data-testid="custom-reset" onClick={resetError}>
      Custom Reset
    </button>
  </div>
);

describe('ErrorBoundary', () => {
  // Suppress console.error during tests to reduce noise
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('Error Catching', () => {
    it('should render children when no error occurs', () => {
      render(
        <TestWrapper>
          <ErrorBoundary>
            <WorkingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });

    it('should catch errors and render fallback UI', () => {
      render(
        <TestWrapper>
          <ErrorBoundary>
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByTestId('working-component')).not.toBeInTheDocument();
    });

    it('should catch errors with custom error messages', () => {
      render(
        <TestWrapper>
          <ErrorBoundary showDetails={true}>
            <ThrowingComponent errorMessage="Custom error message" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/Custom error message/)).toBeInTheDocument();
    });

    it('should generate unique error IDs', () => {
      render(
        <TestWrapper>
          <ErrorBoundary showDetails={true}>
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      const errorIdText = screen.getByText(/Error ID:/);
      expect(errorIdText).toBeInTheDocument();
      expect(errorIdText.textContent).toMatch(/err_[a-z0-9]+_[a-z0-9]+/);
    });
  });

  describe('Logging Integration', () => {
    it('should call logError when an error is caught', () => {
      render(
        <TestWrapper>
          <ErrorBoundary>
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(logError).toHaveBeenCalled();
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          type: 'react-error-boundary',
        })
      );
    });

    it('should log with correct level context', () => {
      render(
        <TestWrapper>
          <ErrorBoundary level="page">
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          level: 'page',
        })
      );
    });

    it('should log reset events', async () => {
      render(
        <TestWrapper>
          <ErrorBoundary>
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error boundary reset triggered',
        })
      );
    });
  });

  describe('Fallback UI', () => {
    it('should render default fallback UI', () => {
      render(
        <TestWrapper>
          <ErrorBoundary>
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('should render custom fallback component', () => {
      render(
        <TestWrapper>
          <ErrorBoundary fallback={(props) => <CustomFallback {...props} />}>
            <ThrowingComponent errorMessage="Custom error" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Custom error');
      expect(screen.getByTestId('error-id')).toBeInTheDocument();
    });

    it('should render static fallback ReactNode', () => {
      render(
        <TestWrapper>
          <ErrorBoundary fallback={<div data-testid="static-fallback">Static Fallback</div>}>
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByTestId('static-fallback')).toBeInTheDocument();
    });

    it('should show error details in development mode', () => {
      render(
        <TestWrapper>
          <ErrorBoundary showDetails={true}>
            <ThrowingComponent errorMessage="Development error" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.getByText('Error Details (Development Only)')).toBeInTheDocument();
      expect(screen.getByText(/Development error/)).toBeInTheDocument();
    });

    it('should hide error details in production mode', () => {
      render(
        <TestWrapper>
          <ErrorBoundary showDetails={false}>
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(screen.queryByText('Error Details (Development Only)')).not.toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset error state when Try Again is clicked', async () => {
      const TestComponent: React.FC = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);

        return (
          <ErrorBoundary
            onReset={() => setShouldThrow(false)}
          >
            <ThrowingComponent shouldThrow={shouldThrow} />
          </ErrorBoundary>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByTestId('working-component')).toBeInTheDocument();
      });
    });

    it('should call onReset callback when reset is triggered', () => {
      const onResetMock = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary onReset={onResetMock}>
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      expect(onResetMock).toHaveBeenCalledTimes(1);
    });

    it('should work with custom fallback reset button', () => {
      const onResetMock = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary
            fallback={(props) => <CustomFallback {...props} />}
            onReset={onResetMock}
          >
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      const customResetButton = screen.getByTestId('custom-reset');
      fireEvent.click(customResetButton);

      expect(onResetMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Callbacks', () => {
    it('should call onError callback when error is caught', () => {
      const onErrorMock = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary onError={onErrorMock}>
            <ThrowingComponent errorMessage="Callback test error" />
          </ErrorBoundary>
        </TestWrapper>
      );

      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Callback test error' }),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('should handle errors in onError callback gracefully', () => {
      const onErrorMock = vi.fn(() => {
        throw new Error('Callback error');
      });

      // Should not throw
      expect(() => {
        render(
          <TestWrapper>
            <ErrorBoundary onError={onErrorMock}>
              <ThrowingComponent />
            </ErrorBoundary>
          </TestWrapper>
        );
      }).not.toThrow();

      expect(onErrorMock).toHaveBeenCalled();
      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: 'Error in onError callback',
        })
      );
    });

    it('should handle errors in onReset callback gracefully', () => {
      const onResetMock = vi.fn(() => {
        throw new Error('Reset callback error');
      });

      render(
        <TestWrapper>
          <ErrorBoundary onReset={onResetMock}>
            <ThrowingComponent />
          </ErrorBoundary>
        </TestWrapper>
      );

      const tryAgainButton = screen.getByText('Try Again');

      // Should not throw
      expect(() => {
        fireEvent.click(tryAgainButton);
      }).not.toThrow();

      expect(onResetMock).toHaveBeenCalled();
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(WorkingComponent);

      render(
        <TestWrapper>
          <WrappedComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });

    it('should catch errors in wrapped component', () => {
      const WrappedComponent = withErrorBoundary(ThrowingComponent);

      render(
        <TestWrapper>
          <WrappedComponent />
        </TestWrapper>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should pass error boundary props through HOC', () => {
      const onErrorMock = vi.fn();
      const WrappedComponent = withErrorBoundary(ThrowingComponent, {
        onError: onErrorMock,
        level: 'component',
      });

      render(
        <TestWrapper>
          <WrappedComponent />
        </TestWrapper>
      );

      expect(onErrorMock).toHaveBeenCalled();
    });

    it('should have correct displayName', () => {
      const NamedComponent: React.FC = () => <div>Named</div>;
      NamedComponent.displayName = 'NamedComponent';

      const WrappedComponent = withErrorBoundary(NamedComponent);

      expect(WrappedComponent.displayName).toBe('withErrorBoundary(NamedComponent)');
    });
  });

  describe('useErrorHandler Hook', () => {
    it('should provide a function to throw errors', () => {
      const ComponentWithHook: React.FC = () => {
        const handleError = useErrorHandler();

        return (
          <button
            data-testid="error-button"
            onClick={() => handleError(new Error('Hook error'))}
          >
            Trigger Error
          </button>
        );
      };

      render(
        <TestWrapper>
          <ErrorBoundary>
            <ComponentWithHook />
          </ErrorBoundary>
        </TestWrapper>
      );

      const errorButton = screen.getByTestId('error-button');
      fireEvent.click(errorButton);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Nested Error Boundaries', () => {
    it('should only catch errors in the nearest boundary', () => {
      const outerOnError = vi.fn();
      const innerOnError = vi.fn();

      render(
        <TestWrapper>
          <ErrorBoundary level="app" onError={outerOnError}>
            <div>
              <WorkingComponent />
              <ErrorBoundary level="component" onError={innerOnError}>
                <ThrowingComponent />
              </ErrorBoundary>
            </div>
          </ErrorBoundary>
        </TestWrapper>
      );

      // Inner boundary should catch the error
      expect(innerOnError).toHaveBeenCalled();
      // Outer boundary should not catch it
      expect(outerOnError).not.toHaveBeenCalled();
      // Working component should still render
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('Error Count Tracking', () => {
    it('should track error count across resets', async () => {
      let errorCount = 0;
      const onErrorMock = vi.fn(() => {
        errorCount++;
      });

      const TestComponent: React.FC = () => {
        const [key, setKey] = React.useState(0);
        const [shouldThrow, setShouldThrow] = React.useState(true);

        return (
          <div>
            <button
              data-testid="toggle-error"
              onClick={() => {
                setShouldThrow(!shouldThrow);
                setKey(k => k + 1);
              }}
            >
              Toggle
            </button>
            <ErrorBoundary key={key} onError={onErrorMock}>
              <ThrowingComponent shouldThrow={shouldThrow} />
            </ErrorBoundary>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      expect(errorCount).toBe(1);

      // Toggle to working state
      fireEvent.click(screen.getByTestId('toggle-error'));

      await waitFor(() => {
        expect(screen.getByTestId('working-component')).toBeInTheDocument();
      });

      // Toggle back to error state
      fireEvent.click(screen.getByTestId('toggle-error'));

      await waitFor(() => {
        expect(errorCount).toBe(2);
      });
    });
  });
});
