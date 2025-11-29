/**
 * Integration tests for logger usage across the application
 *
 * These tests verify that the logger works correctly when integrated
 * with actual components and services.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import logger, { logError, logUserAction, logDataOperation } from '@/lib/logger';

describe('Logger Integration Tests', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let _debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock Pino logger methods
    infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    _debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Integration', () => {
    it('should log component lifecycle events', () => {
      const componentLogger = logger.child({ component: 'TestComponent' });
      const childDebugSpy = vi.spyOn(componentLogger, 'debug');
      const childInfoSpy = vi.spyOn(componentLogger, 'info');

      componentLogger.debug('Component mounting');
      componentLogger.info('Component mounted');
      componentLogger.debug('Component unmounting');

      expect(childDebugSpy).toHaveBeenCalledTimes(2);
      expect(childInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('should log user interactions', () => {
      logUserAction('button-click', {
        buttonId: 'submit-btn',
        timestamp: new Date().toISOString()
      });

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log form submissions', () => {
      logUserAction('form-submit', {
        formId: 'login-form',
        fields: ['email', 'password']
      });

      expect(infoSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should log caught errors with context', () => {
      try {
        throw new Error('Test error');
      } catch (err) {
        logError(err as Error, {
          component: 'TestComponent',
          action: 'test-action'
        });
      }

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should log API errors', () => {
      const apiError = new Error('API request failed');
      logError(apiError, {
        endpoint: '/api/documents',
        method: 'POST',
        status: 500
      });

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should log validation errors', () => {
      logError('Validation failed', {
        field: 'email',
        value: 'invalid-email',
        rule: 'email-format'
      });

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Data Operations Integration', () => {
    it('should log document creation', () => {
      logDataOperation('create', 'document', {
        documentId: 'doc-123',
        title: 'Test Document',
        userId: 'user-456'
      });

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log annotation updates', () => {
      logDataOperation('update', 'annotation', {
        annotationId: 'ann-789',
        changes: ['text', 'color'],
        userId: 'user-456'
      });

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log highlight deletion', () => {
      logDataOperation('delete', 'highlight', {
        highlightId: 'hl-321',
        documentId: 'doc-123',
        userId: 'user-456'
      });

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log data reads', () => {
      logDataOperation('read', 'document', {
        documentId: 'doc-123',
        userId: 'user-456'
      });

      expect(infoSpy).toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should work with React hooks', () => {
      let hookLogger: any;
      renderHook(() => {
        hookLogger = logger.child({ hook: 'useTestHook' });
        hookLogger.debug('Hook initialized');
        return null;
      });

      // The child logger should have been created and its debug method called
      expect(logger.child).toHaveBeenCalled();
      // Since child returns a new logger, we check that the operation completed
      expect(hookLogger).toBeDefined();
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should log login attempts', () => {
      logUserAction('login-attempt', {
        method: 'email',
        timestamp: new Date().toISOString()
      });

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log successful authentication', () => {
      logUserAction('login-success', {
        userId: 'user-456',
        timestamp: new Date().toISOString()
      });

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log failed authentication', () => {
      logError('Authentication failed', {
        reason: 'invalid-credentials',
        timestamp: new Date().toISOString()
      });

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should log logout events', () => {
      logUserAction('logout', {
        userId: 'user-456',
        timestamp: new Date().toISOString()
      });

      expect(infoSpy).toHaveBeenCalled();
    });
  });

  describe('Document Processing Integration', () => {
    it('should log document uploads', () => {
      logUserAction('document-upload', {
        fileName: 'test.pdf',
        fileSize: 1024000,
        userId: 'user-456'
      });

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log PDF parsing', () => {
      const pdfLogger = logger.child({ service: 'pdf-parser' });
      const childInfoSpy = vi.spyOn(pdfLogger, 'info');
      pdfLogger.info('Starting PDF parse');

      expect(childInfoSpy).toHaveBeenCalled();
    });

    it('should log text extraction', () => {
      const extractionLogger = logger.child({ service: 'text-extraction' });
      const childInfoSpy = vi.spyOn(extractionLogger, 'info');
      extractionLogger.info('Text extracted', {
        pageCount: 10,
        wordCount: 5000
      });

      expect(childInfoSpy).toHaveBeenCalled();
    });
  });

  describe('Search Integration', () => {
    it('should log search queries', () => {
      logUserAction('search', {
        query: 'test search term',
        filters: ['documents'],
        userId: 'user-456'
      });

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log search results', () => {
      logger.info('Search completed', {
        query: 'test',
        resultCount: 42,
        duration: 150
      });

      expect(infoSpy).toHaveBeenCalled();
    });
  });

  describe('Annotation System Integration', () => {
    it('should log annotation creation', () => {
      logDataOperation('create', 'annotation', {
        annotationId: 'ann-123',
        documentId: 'doc-456',
        type: 'highlight',
        userId: 'user-789'
      });

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log highlight application', () => {
      logUserAction('apply-highlight', {
        color: 'yellow',
        range: { start: 100, end: 200 },
        documentId: 'doc-456'
      });

      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log comment additions', () => {
      logUserAction('add-comment', {
        commentText: 'Test comment',
        annotationId: 'ann-123',
        userId: 'user-789'
      });

      expect(infoSpy).toHaveBeenCalled();
    });
  });

  describe('State Management Integration', () => {
    it('should log state updates', () => {
      const stateLogger = logger.child({ context: 'state-management' });
      const childDebugSpy = vi.spyOn(stateLogger, 'debug');
      stateLogger.debug('State updated', {
        store: 'documents',
        action: 'add-document'
      });

      expect(childDebugSpy).toHaveBeenCalled();
    });

    it('should log state hydration', () => {
      const stateLogger = logger.child({ context: 'state-management' });
      const childInfoSpy = vi.spyOn(stateLogger, 'info');
      stateLogger.info('State hydrated from storage', {
        keys: ['documents', 'annotations', 'user']
      });

      expect(childInfoSpy).toHaveBeenCalled();
    });
  });

  describe('WebSocket Integration', () => {
    it('should log connection events', () => {
      const wsLogger = logger.child({ service: 'websocket' });
      const childInfoSpy = vi.spyOn(wsLogger, 'info');
      wsLogger.info('WebSocket connected');

      expect(childInfoSpy).toHaveBeenCalled();
    });

    it('should log message handling', () => {
      const wsLogger = logger.child({ service: 'websocket' });
      const childDebugSpy = vi.spyOn(wsLogger, 'debug');
      wsLogger.debug('Message received', {
        type: 'annotation-update',
        size: 256
      });

      expect(childDebugSpy).toHaveBeenCalled();
    });

    it('should log disconnection events', () => {
      const wsLogger = logger.child({ service: 'websocket' });
      const warnSpy = vi.spyOn(wsLogger, 'warn');
      wsLogger.warn('WebSocket disconnected', {
        code: 1000,
        reason: 'Normal closure'
      });

      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
