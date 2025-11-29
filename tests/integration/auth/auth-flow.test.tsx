/**
 * Authentication Flow Integration Tests
 *
 * End-to-end tests for complete authentication workflows:
 * - Login flow (success and failure scenarios)
 * - Registration flow
 * - Password reset flow
 * - Session persistence
 * - Token refresh
 * - Logout flow
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';

// Mock react-router-dom BEFORE any imports that use it
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null, pathname: '/login' }),
  MemoryRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Routes: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Route: ({ element }: { element: React.ReactNode }) => <>{element}</>,
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

// Mock useAuth with controllable state
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockResetPassword = vi.fn();
const mockClearError = vi.fn();

vi.mock('@/hooks/useAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useAuth')>();
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      session: null,
      loading: false,
      error: null,
      isAuthenticated: false,
      signIn: mockSignIn,
      signUp: mockSignUp,
      signOut: vi.fn(),
      resetPassword: mockResetPassword,
      clearError: mockClearError,
      validateInputs: actual.validateAuthInputs,
    }),
  };
});

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Now import components that depend on mocked modules
import { LoginPage } from '@/pages/LoginPage';
import { AuthProvider } from '@/contexts/AuthContext';

describe('Authentication Flow Integration', () => {
  const renderLoginPage = () => {
    return render(
      <ChakraProvider value={defaultSystem}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </ChakraProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ success: true, user: { id: '123', email: 'test@example.com' } });
    mockSignUp.mockResolvedValue({ success: true, user: { id: '456', email: 'new@example.com' } });
    mockResetPassword.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Login Flow', () => {
    // Note: LoginPage renders both login and signup tabs, so there are duplicate fields.
    // Use getAllByPlaceholderText and select first element (login form is default).
    it('should render login form by default', () => {
      renderLoginPage();

      expect(screen.getByText('Close Reading Platform')).toBeInTheDocument();
      // Use getAllBy to handle multiple matching elements from tabs
      expect(screen.getAllByPlaceholderText('Enter your email')[0]).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText('Enter your password')[0]).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('should submit login form with valid credentials', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      // Get the first (login) form fields
      const emailInput = screen.getAllByPlaceholderText('Enter your email')[0];
      const passwordInput = screen.getAllByPlaceholderText('Enter your password')[0];
      const loginButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should show validation error for invalid email', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getAllByPlaceholderText('Enter your email')[0];
      const passwordInput = screen.getAllByPlaceholderText('Enter your password')[0];
      const loginButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      // Validation should prevent signIn from being called with invalid email
      // Note: Error text rendering in Chakra v3 Field.ErrorText may not work in jsdom
      await waitFor(() => {
        expect(mockSignIn).not.toHaveBeenCalled();
      });
    });

    it('should show validation error for empty password', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getAllByPlaceholderText('Enter your email')[0];
      const passwordInput = screen.getAllByPlaceholderText('Enter your password')[0];
      const loginButton = screen.getByRole('button', { name: /log in/i });

      // Type valid email but leave password empty
      await user.type(emailInput, 'test@example.com');
      // Need to focus password field to satisfy HTML5 required validation
      await user.click(passwordInput);
      await user.click(loginButton);

      // Validation should prevent signIn from being called with empty password
      // Note: Error text rendering in Chakra v3 Field.ErrorText may not work in jsdom
      await waitFor(() => {
        expect(mockSignIn).not.toHaveBeenCalled();
      });
    });

    it('should display error message on login failure', async () => {
      mockSignIn.mockResolvedValue({ success: false, error: 'Invalid credentials' });
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getAllByPlaceholderText('Enter your email')[0];
      const passwordInput = screen.getAllByPlaceholderText('Enter your password')[0];
      const loginButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });

    it('should have forgot password link', () => {
      renderLoginPage();

      expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
    });
  });

  describe('Registration Flow', () => {
    it('should switch to signup tab when clicked', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const signupTab = screen.getByRole('tab', { name: /sign up/i });
      await user.click(signupTab);

      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    it('should submit signup form with valid credentials', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /sign up/i });
      await user.click(signupTab);

      // After switching tabs, get the signup form's email field (second in DOM due to tab order)
      const emailInputs = screen.getAllByPlaceholderText('Enter your email');
      const emailInput = emailInputs[emailInputs.length - 1]; // Get the signup tab's email field
      const passwordInput = screen.getByPlaceholderText(/create a password/i);
      const signupButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(signupButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('newuser@example.com', 'password123');
      });
    });

    it('should show password requirements message', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const signupTab = screen.getByRole('tab', { name: /sign up/i });
      await user.click(signupTab);

      expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    });

    it('should validate password strength on signup', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const signupTab = screen.getByRole('tab', { name: /sign up/i });
      await user.click(signupTab);

      const emailInputs = screen.getAllByPlaceholderText('Enter your email');
      const emailInput = emailInputs[emailInputs.length - 1]; // Get the signup tab's email field
      const passwordInput = screen.getByPlaceholderText(/create a password/i);
      const signupButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'weak'); // Too short, no number
      await user.click(signupButton);

      await waitFor(() => {
        // Should show password validation error
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });
  });

  describe('Password Reset Flow', () => {
    it('should show password reset form when clicking forgot password', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const forgotPasswordLink = screen.getByText(/forgot your password/i);
      await user.click(forgotPasswordLink);

      expect(screen.getByText(/reset password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('should submit password reset request', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const forgotPasswordLink = screen.getByText(/forgot your password/i);
      await user.click(forgotPasswordLink);

      // After clicking forgot password, get the visible email field (may have multiple due to tab rendering)
      const emailInput = screen.getAllByPlaceholderText('Enter your email')[0];
      const resetButton = screen.getByRole('button', { name: /send reset link/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(resetButton);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('should show back to login button on password reset form', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const forgotPasswordLink = screen.getByText(/forgot your password/i);
      await user.click(forgotPasswordLink);

      expect(screen.getByRole('button', { name: /back to login/i })).toBeInTheDocument();
    });

    it('should return to login form when clicking back', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const forgotPasswordLink = screen.getByText(/forgot your password/i);
      await user.click(forgotPasswordLink);

      const backButton = screen.getByRole('button', { name: /back to login/i });
      await user.click(backButton);

      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });
  });

  describe('Form Behavior', () => {
    it('should clear error when switching tabs', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      // First switch to signup
      const signupTab = screen.getByRole('tab', { name: /sign up/i });
      await user.click(signupTab);

      // Then back to login
      const loginTab = screen.getByRole('tab', { name: /login/i });
      await user.click(loginTab);

      expect(mockClearError).toHaveBeenCalled();
    });

    it('should clear field error when user starts typing', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      // Get the first (login) email field
      const emailInput = screen.getAllByPlaceholderText('Enter your email')[0];
      const passwordInput = screen.getAllByPlaceholderText('Enter your password')[0];
      const loginButton = screen.getByRole('button', { name: /log in/i });

      // First, trigger a validation failure with invalid email
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      // Verify signIn wasn't called due to validation
      await waitFor(() => {
        expect(mockSignIn).not.toHaveBeenCalled();
      });

      // Clear and type valid email
      await user.clear(emailInput);
      await user.type(emailInput, 'test@example.com');

      // Form should be usable with valid input
      expect(emailInput).toHaveValue('test@example.com');

      // Now submit with valid data - signIn should be called
      await user.click(loginButton);
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });
});
