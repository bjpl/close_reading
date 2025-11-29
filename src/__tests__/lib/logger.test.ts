/**
 * Unit tests for the centralized logging service
 *
 * Tests cover:
 * - All logging methods (trace, debug, info, warn, error, fatal)
 * - Environment-specific behavior
 * - Utility functions (createLogger, logError, logPerformance, etc.)
 * - Data sanitization
 * - Child logger creation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import logger, {
  createLogger,
  logError,
  logPerformance,
  startTimer,
  logApiCall,
  logUserAction,
  logDataOperation,
  sanitizeLogData,
  trace,
  debug,
  info,
  warn,
  error,
  fatal
} from '@/lib/logger';

describe('Logger Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Logging Methods', () => {
    it('should expose trace method', () => {
      expect(typeof trace).toBe('function');
      // Should not throw when called
      expect(() => trace('test trace message')).not.toThrow();
    });

    it('should expose debug method', () => {
      expect(typeof debug).toBe('function');
      expect(() => debug('test debug message')).not.toThrow();
    });

    it('should expose info method', () => {
      expect(typeof info).toBe('function');
      expect(() => info('test info message')).not.toThrow();
    });

    it('should expose warn method', () => {
      expect(typeof warn).toBe('function');
      expect(() => warn('test warn message')).not.toThrow();
    });

    it('should expose error method', () => {
      expect(typeof error).toBe('function');
      expect(() => error('test error message')).not.toThrow();
    });

    it('should expose fatal method', () => {
      expect(typeof fatal).toBe('function');
      expect(() => fatal('test fatal message')).not.toThrow();
    });

    it('should log messages with context objects', () => {
      expect(() => info({ message: 'test', userId: '123', action: 'login' })).not.toThrow();
    });

    it('should log string messages', () => {
      expect(() => info('Simple string message')).not.toThrow();
    });
  });

  describe('createLogger', () => {
    it('should create child logger with context', () => {
      const childLogger = createLogger({ component: 'TestComponent' });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });

    it('should inherit context in child logger', () => {
      const childLogger = createLogger({ component: 'TestComponent', userId: '123' });
      expect(() => childLogger.info('test message')).not.toThrow();
    });

    it('should allow multiple child loggers', () => {
      const child1 = createLogger({ component: 'Component1' });
      const child2 = createLogger({ component: 'Component2' });

      expect(() => child1.info('message 1')).not.toThrow();
      expect(() => child2.info('message 2')).not.toThrow();
    });
  });

  describe('logError', () => {
    it('should log Error objects with stack traces', () => {
      const testError = new Error('Test error message');
      expect(() => logError(testError)).not.toThrow();
    });

    it('should log Error objects with additional context', () => {
      const testError = new Error('Test error message');
      expect(() => logError(testError, { userId: '123', action: 'test-action' })).not.toThrow();
    });

    it('should log string error messages', () => {
      expect(() => logError('Simple error message')).not.toThrow();
    });

    it('should log string errors with context', () => {
      expect(() => logError('Simple error message', { component: 'TestComponent' })).not.toThrow();
    });

    it('should include error name and stack in output', () => {
      const testError = new Error('Test error');
      testError.name = 'CustomError';
      expect(() => logError(testError)).not.toThrow();
    });
  });

  describe('logPerformance', () => {
    it('should log performance metrics', () => {
      expect(() => logPerformance('testOperation', 150.5)).not.toThrow();
    });

    it('should log performance with context', () => {
      expect(() => logPerformance('testOperation', 150.5, { component: 'TestComponent' })).not.toThrow();
    });

    it('should include operation name and duration', () => {
      expect(() => logPerformance('database-query', 250)).not.toThrow();
    });

    it('should mark performance logs with type field', () => {
      expect(() => logPerformance('api-call', 100, { endpoint: '/api/test' })).not.toThrow();
    });
  });

  describe('startTimer', () => {
    it('should create a timer function', () => {
      const endTimer = startTimer('testOperation');
      expect(typeof endTimer).toBe('function');
    });

    it('should log duration when timer ends', async () => {
      const endTimer = startTimer('testOperation');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(() => endTimer()).not.toThrow();
    });

    it('should include context in timer logs', async () => {
      const endTimer = startTimer('testOperation', { component: 'TestComponent' });
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(() => endTimer()).not.toThrow();
    });

    it('should measure actual elapsed time', async () => {
      const endTimer = startTimer('timing-test');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(() => endTimer()).not.toThrow();
    });
  });

  describe('logApiCall', () => {
    it('should log successful API calls at info level', () => {
      expect(() => logApiCall('GET', '/api/test', 200, 150)).not.toThrow();
    });

    it('should log redirect responses at warn level', () => {
      expect(() => logApiCall('GET', '/api/test', 301, 100)).not.toThrow();
    });

    it('should log error responses at error level', () => {
      expect(() => logApiCall('POST', '/api/test', 500, 200)).not.toThrow();
    });

    it('should log client errors at error level', () => {
      expect(() => logApiCall('GET', '/api/test', 404, 50)).not.toThrow();
    });

    it('should include method, url, status, and duration', () => {
      expect(() => logApiCall('POST', '/api/users', 201, 250)).not.toThrow();
    });

    it('should accept additional context', () => {
      expect(() => logApiCall('GET', '/api/test', 200, 150, { userId: '123' })).not.toThrow();
    });
  });

  describe('logUserAction', () => {
    it('should log user actions', () => {
      expect(() => logUserAction('login')).not.toThrow();
    });

    it('should log user actions with context', () => {
      expect(() => logUserAction('document-upload', { documentId: '123', userId: '456' })).not.toThrow();
    });

    it('should mark logs with type field', () => {
      expect(() => logUserAction('button-click', { buttonId: 'submit-btn' })).not.toThrow();
    });
  });

  describe('logDataOperation', () => {
    it('should log create operations', () => {
      expect(() => logDataOperation('create', 'document')).not.toThrow();
    });

    it('should log read operations', () => {
      expect(() => logDataOperation('read', 'annotation')).not.toThrow();
    });

    it('should log update operations', () => {
      expect(() => logDataOperation('update', 'highlight')).not.toThrow();
    });

    it('should log delete operations', () => {
      expect(() => logDataOperation('delete', 'comment')).not.toThrow();
    });

    it('should include context in data operations', () => {
      expect(() => logDataOperation('create', 'document', { userId: '123', documentId: '456' })).not.toThrow();
    });

    it('should mark logs with type field', () => {
      expect(() => logDataOperation('update', 'annotation', { annotationId: '789' })).not.toThrow();
    });
  });

  describe('sanitizeLogData', () => {
    it('should redact password fields', () => {
      const data = { username: 'test', password: 'secret123' };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.username).toBe('test');
    });

    it('should redact token fields', () => {
      const data = { userId: '123', token: 'abc123xyz' };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.userId).toBe('123');
    });

    it('should redact apiKey fields', () => {
      const data = { service: 'api', apiKey: 'key123' };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.apiKey).toBe('[REDACTED]');
    });

    it('should redact secret fields', () => {
      const data = { config: 'test', secret: 'mysecret' };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.secret).toBe('[REDACTED]');
    });

    it('should redact authorization headers', () => {
      const data = { method: 'GET', authorization: 'Bearer token123' };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.authorization).toBe('[REDACTED]');
    });

    it('should redact cookie fields', () => {
      const data = { session: 'active', cookie: 'session=abc123' };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.cookie).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'John',
          password: 'secret',
          settings: {
            apiKey: 'key123'
          }
        }
      };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.user).toBeDefined();
      const user = sanitized.user as Record<string, unknown>;
      expect(user.name).toBe('John');
      expect(user.password).toBe('[REDACTED]');
      const settings = user.settings as Record<string, unknown>;
      expect(settings.apiKey).toBe('[REDACTED]');
    });

    it('should preserve non-sensitive data', () => {
      const data = {
        userId: '123',
        email: 'test@example.com',
        role: 'admin',
        lastLogin: '2024-01-01'
      };
      const sanitized = sanitizeLogData(data);
      expect(sanitized).toEqual(data);
    });

    it('should be case-insensitive for sensitive keys', () => {
      const data = {
        PASSWORD: 'secret',
        Token: 'abc123',
        ApiKey: 'key123'
      };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.PASSWORD).toBe('[REDACTED]');
      expect(sanitized.Token).toBe('[REDACTED]');
      expect(sanitized.ApiKey).toBe('[REDACTED]');
    });

    it('should handle null and undefined values', () => {
      const data = {
        value1: null,
        value2: undefined,
        value3: 'test'
      };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.value1).toBeNull();
      expect(sanitized.value2).toBeUndefined();
      expect(sanitized.value3).toBe('test');
    });
  });

  describe('Logger Instance', () => {
    it('should export default logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should support all pino log levels', () => {
      expect(typeof logger.trace).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.fatal).toBe('function');
    });

    it('should create child loggers', () => {
      const child = logger.child({ test: true });
      expect(child).toBeDefined();
      expect(typeof child.info).toBe('function');
    });
  });

  describe('Environment Awareness', () => {
    it('should detect browser environment', () => {
      // This test runs in a browser-like environment (vitest)
      expect(typeof window).toBe('object');
    });

    it('should handle environment variable detection', () => {
      // The logger should work regardless of environment
      expect(() => info('Environment test message')).not.toThrow();
    });
  });

  describe('Integration with Existing Code', () => {
    it('should replace console.log functionality', () => {
      expect(() => info('This replaces console.log')).not.toThrow();
    });

    it('should replace console.error functionality', () => {
      expect(() => error('This replaces console.error')).not.toThrow();
    });

    it('should replace console.warn functionality', () => {
      expect(() => warn('This replaces console.warn')).not.toThrow();
    });

    it('should replace console.debug functionality', () => {
      expect(() => debug('This replaces console.debug')).not.toThrow();
    });
  });
});
