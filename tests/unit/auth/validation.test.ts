/**
 * Authentication Validation Unit Tests
 *
 * Tests for the input validation functions in useAuth:
 * - validateEmail
 * - validatePassword
 * - validateAuthInputs
 */

import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateAuthInputs,
} from '@/hooks/useAuth';

describe('validateEmail', () => {
  describe('valid emails', () => {
    it('should accept standard email format', () => {
      const result = validateEmail('user@example.com');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept email with subdomain', () => {
      const result = validateEmail('user@mail.example.com');
      expect(result.isValid).toBe(true);
    });

    it('should accept email with plus sign', () => {
      const result = validateEmail('user+tag@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should accept email with dots in local part', () => {
      const result = validateEmail('first.last@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should accept email with numbers', () => {
      const result = validateEmail('user123@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should accept email with hyphens in domain', () => {
      const result = validateEmail('user@example-site.com');
      expect(result.isValid).toBe(true);
    });

    it('should trim whitespace and accept valid email', () => {
      const result = validateEmail('  user@example.com  ');
      expect(result.isValid).toBe(true);
    });
  });

  describe('invalid emails', () => {
    it('should reject empty string', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });

    it('should reject whitespace-only string', () => {
      const result = validateEmail('   ');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });

    it('should reject email without @ symbol', () => {
      const result = validateEmail('userexample.com');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please enter a valid email address');
    });

    it('should reject email without domain', () => {
      const result = validateEmail('user@');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please enter a valid email address');
    });

    it('should reject email without local part', () => {
      const result = validateEmail('@example.com');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please enter a valid email address');
    });

    it('should reject email without TLD', () => {
      const result = validateEmail('user@example');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please enter a valid email address');
    });

    it('should reject email with spaces', () => {
      const result = validateEmail('user @example.com');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please enter a valid email address');
    });

    it('should reject email with multiple @ symbols', () => {
      const result = validateEmail('user@@example.com');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please enter a valid email address');
    });

    it('should reject plain text', () => {
      const result = validateEmail('not an email');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please enter a valid email address');
    });
  });
});

describe('validatePassword', () => {
  describe('sign-in validation (less strict)', () => {
    it('should accept any non-empty password for sign-in', () => {
      const result = validatePassword('password', false);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept short password for sign-in', () => {
      const result = validatePassword('abc', false);
      expect(result.isValid).toBe(true);
    });

    it('should accept password without numbers for sign-in', () => {
      const result = validatePassword('passwordonly', false);
      expect(result.isValid).toBe(true);
    });

    it('should reject empty password for sign-in', () => {
      const result = validatePassword('', false);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });
  });

  describe('sign-up validation (stricter)', () => {
    it('should accept valid password meeting all requirements', () => {
      const result = validatePassword('password123', true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept password with mixed case', () => {
      const result = validatePassword('Password123', true);
      expect(result.isValid).toBe(true);
    });

    it('should accept password with special characters', () => {
      const result = validatePassword('p@ssword1', true);
      expect(result.isValid).toBe(true);
    });

    it('should reject empty password', () => {
      const result = validatePassword('', true);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should reject password shorter than 6 characters', () => {
      const result = validatePassword('ab1', true);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 6 characters');
    });

    it('should reject password without letters', () => {
      const result = validatePassword('123456', true);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one letter');
    });

    it('should reject password without numbers', () => {
      const result = validatePassword('password', true);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should return multiple errors for password with multiple issues', () => {
      const result = validatePassword('ab', true);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors).toContain('Password must be at least 6 characters');
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should accept exactly 6 character password with letter and number', () => {
      const result = validatePassword('pass12', true);
      expect(result.isValid).toBe(true);
    });
  });
});

describe('validateAuthInputs', () => {
  describe('sign-in validation', () => {
    it('should accept valid email and password for sign-in', () => {
      const result = validateAuthInputs('user@example.com', 'password123', false);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email with valid password', () => {
      const result = validateAuthInputs('invalid-email', 'password123', false);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('email'))).toBe(true);
    });

    it('should reject valid email with empty password', () => {
      const result = validateAuthInputs('user@example.com', '', false);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Password'))).toBe(true);
    });

    it('should reject both invalid email and empty password', () => {
      const result = validateAuthInputs('', '', false);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('sign-up validation', () => {
    it('should accept valid email and strong password for sign-up', () => {
      const result = validateAuthInputs('user@example.com', 'password123', true);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak password for sign-up', () => {
      const result = validateAuthInputs('user@example.com', 'weak', true);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject password without number for sign-up', () => {
      const result = validateAuthInputs('user@example.com', 'passwordonly', true);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should combine email and password errors', () => {
      const result = validateAuthInputs('invalid', 'short', true);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});
