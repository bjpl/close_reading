/**
 * Integration tests for the logging service
 * Tests logger in a simulated browser environment
 */

import { describe, it, expect } from 'vitest';
import logger, {
  sanitizeLogData,
  createLogger,
} from '@/lib/logger';

describe('Logger Integration', () => {
  describe('Basic functionality', () => {
    it('should export logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should create child loggers', () => {
      const childLogger = createLogger({ component: 'TestComponent' });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });
  });

  describe('Data sanitization', () => {
    it('should sanitize sensitive data', () => {
      const data = {
        email: 'user@example.com',
        password: 'secret123',
        token: 'abc123',
        apiKey: 'key123'
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.email).toBe('user@example.com');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'user@example.com',
          credentials: {
            password: 'secret'
          }
        }
      };

      const sanitized = sanitizeLogData(data);
      const user = sanitized.user as Record<string, unknown>;
      const credentials = user.credentials as Record<string, unknown>;

      expect(user.email).toBe('user@example.com');
      expect(credentials.password).toBe('[REDACTED]');
    });
  });
});
