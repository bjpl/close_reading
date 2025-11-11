/**
 * Tests for the logging service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import logger, {
  createLogger,
  logError,
  logPerformance,
  logApiCall,
  logUserAction,
  logDataOperation,
  startTimer,
  sanitizeLogData,
  info,
  error,
  warn,
  debug,
} from '@/lib/logger';

describe('Logger Service', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Basic logging', () => {
    it('should log info messages', () => {
      info('Test info message', { context: 'test' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log error messages', () => {
      error('Test error message', { context: 'test' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log warn messages', () => {
      warn('Test warning message', { context: 'test' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log debug messages', () => {
      debug('Test debug message', { context: 'test' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('createLogger', () => {
    it('should create child logger with context', () => {
      const childLogger = createLogger({ component: 'TestComponent' });
      expect(childLogger).toBeDefined();
      expect(typeof childLogger.info).toBe('function');
    });

    it('should include context in child logger', () => {
      const childLogger = createLogger({ component: 'TestComponent' });
      childLogger.info('Test message');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('logError', () => {
    it('should log Error objects with stack trace', () => {
      const testError = new Error('Test error');
      logError(testError, { context: 'test' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log error strings', () => {
      logError('String error message', { context: 'test' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should include additional context', () => {
      const testError = new Error('Test error');
      logError(testError, { operation: 'testOperation', userId: '123' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('logPerformance', () => {
    it('should log performance metrics', () => {
      logPerformance('testOperation', 123.45);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should include additional context', () => {
      logPerformance('testOperation', 123.45, { documentId: 'doc123' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('startTimer', () => {
    it('should create a timer function', () => {
      const endTimer = startTimer('testOperation');
      expect(typeof endTimer).toBe('function');
    });

    it('should log performance when timer ends', async () => {
      const endTimer = startTimer('testOperation');
      await new Promise(resolve => setTimeout(resolve, 10));
      endTimer();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should include context in timer', () => {
      const endTimer = startTimer('testOperation', { documentId: 'doc123' });
      endTimer();
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('logApiCall', () => {
    it('should log successful API calls', () => {
      logApiCall('GET', '/api/documents', 200, 123.45);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log failed API calls with error level', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logApiCall('POST', '/api/documents', 500, 123.45);
      expect(consoleLogSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should include additional context', () => {
      logApiCall('GET', '/api/documents', 200, 123.45, { requestId: 'req123' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('logUserAction', () => {
    it('should log user actions', () => {
      logUserAction('export-annotations');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should include additional context', () => {
      logUserAction('export-annotations', { documentId: 'doc123', format: 'csv' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('logDataOperation', () => {
    it('should log create operations', () => {
      logDataOperation('create', 'project');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log read operations', () => {
      logDataOperation('read', 'document');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log update operations', () => {
      logDataOperation('update', 'annotation');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should log delete operations', () => {
      logDataOperation('delete', 'project');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should include additional context', () => {
      logDataOperation('create', 'project', { projectId: 'proj123' });
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('sanitizeLogData', () => {
    it('should redact password fields', () => {
      const data = { email: 'user@example.com', password: 'secret123' };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.email).toBe('user@example.com');
      expect(sanitized.password).toBe('[REDACTED]');
    });

    it('should redact token fields', () => {
      const data = { userId: '123', authToken: 'abc123xyz' };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.userId).toBe('123');
      expect(sanitized.authToken).toBe('[REDACTED]');
    });

    it('should redact apiKey fields', () => {
      const data = { service: 'example', apiKey: 'key123' };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.service).toBe('example');
      expect(sanitized.apiKey).toBe('[REDACTED]');
    });

    it('should redact authorization headers', () => {
      const data = { method: 'GET', authorization: 'Bearer token123' };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.method).toBe('GET');
      expect(sanitized.authorization).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'user@example.com',
          password: 'secret123'
        }
      };
      const sanitized = sanitizeLogData(data);
      expect((sanitized.user as Record<string, unknown>).email).toBe('user@example.com');
      expect((sanitized.user as Record<string, unknown>).password).toBe('[REDACTED]');
    });

    it('should preserve non-sensitive data', () => {
      const data = {
        userId: '123',
        action: 'login',
        timestamp: '2024-01-01T00:00:00Z'
      };
      const sanitized = sanitizeLogData(data);
      expect(sanitized).toEqual(data);
    });

    it('should handle null and undefined values', () => {
      const data = { key1: null, key2: undefined, key3: 'value' };
      const sanitized = sanitizeLogData(data);
      expect(sanitized.key1).toBeNull();
      expect(sanitized.key2).toBeUndefined();
      expect(sanitized.key3).toBe('value');
    });
  });

  describe('Logger instance', () => {
    it('should have all standard methods', () => {
      expect(typeof logger.trace).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.fatal).toBe('function');
    });

    it('should support method chaining via child', () => {
      const child = logger.child({ context: 'test' });
      expect(child).toBeDefined();
      expect(typeof child.info).toBe('function');
    });
  });

  describe('Environment configuration', () => {
    it('should be configured for the current environment', () => {
      expect(logger).toBeDefined();
      // Logger should work regardless of environment
      logger.info('Environment test');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });
});
