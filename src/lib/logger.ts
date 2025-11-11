/**
 * Centralized logging service using Pino
 *
 * Features:
 * - Environment-aware configuration (development vs production)
 * - Pretty printing in development for better readability
 * - Structured JSON logging in production for parsing
 * - Browser-compatible implementation
 * - Multiple log levels: trace, debug, info, warn, error, fatal
 */

import pino from 'pino';

// Detect if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Determine environment - handle both Vite and Node.js environments
const getEnvironment = () => {
  // Check if import.meta.env is available (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.MODE === 'development' || import.meta.env.DEV;
  }
  // Fall back to NODE_ENV for Node.js environments
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'development';
  }
  // Default to development for safety
  return true;
};

const isDevelopment = getEnvironment();

// Configure logger based on environment
const logger = pino({
  level: isDevelopment ? 'debug' : 'info',

  // Browser configuration
  browser: isBrowser ? {
    asObject: true,
    serialize: true,
    transmit: {
      level: isDevelopment ? 'debug' : 'info',
      send: (level, logEvent) => {
        // In development, use console with colors
        if (isDevelopment) {
          const msg = logEvent.messages[0];
          const levelLabel = logEvent.level.label.toUpperCase();
          const timestamp = new Date().toISOString();

          // Color mapping for different log levels
          const colors: Record<string, string> = {
            'TRACE': 'color: gray',
            'DEBUG': 'color: cyan',
            'INFO': 'color: green',
            'WARN': 'color: orange',
            'ERROR': 'color: red',
            'FATAL': 'color: red; font-weight: bold'
          };

          const style = colors[levelLabel] || 'color: black';
          console.log(`%c[${timestamp}] [${levelLabel}]`, style, msg);
        } else {
          // In production, use structured logging
          console.log(JSON.stringify(logEvent));
        }
      }
    }
  } : undefined,

  // Node.js configuration (for SSR or build-time operations)
  transport: !isBrowser && isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      singleLine: false,
      messageFormat: '{msg}',
    }
  } : undefined,

  // Base configuration
  base: {
    env: typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.MODE
      : process.env.NODE_ENV || 'development',
    app: 'close-reading-platform'
  },

  // Timestamp
  timestamp: () => `,"time":"${new Date().toISOString()}"`,

  // Format errors properly
  formatters: {
    level: (label) => {
      return { level: label };
    },
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        host: bindings.hostname,
      };
    },
  },
});

/**
 * Create a child logger with additional context
 * @param context - Additional context to include in all logs
 */
export const createLogger = (context: Record<string, unknown>) => {
  return logger.child(context);
};

/**
 * Utility function to log errors with stack traces
 * @param error - Error object or message
 * @param context - Additional context
 */
export const logError = (error: Error | string, context?: Record<string, unknown>) => {
  if (error instanceof Error) {
    logger.error({
      ...context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    });
  } else {
    logger.error({ ...context, message: error });
  }
};

/**
 * Utility function to log performance metrics
 * @param operation - Name of the operation
 * @param duration - Duration in milliseconds
 * @param context - Additional context
 */
export const logPerformance = (
  operation: string,
  duration: number,
  context?: Record<string, unknown>
) => {
  logger.info({
    ...context,
    operation,
    duration,
    type: 'performance'
  });
};

/**
 * Utility function to create a performance timer
 * @param operation - Name of the operation
 * @returns Function to call when operation completes
 */
export const startTimer = (operation: string, context?: Record<string, unknown>) => {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    logPerformance(operation, duration, context);
  };
};

/**
 * Utility function to log API calls
 * @param method - HTTP method
 * @param url - Request URL
 * @param status - Response status
 * @param duration - Request duration
 * @param context - Additional context
 */
export const logApiCall = (
  method: string,
  url: string,
  status: number,
  duration: number,
  context?: Record<string, unknown>
) => {
  const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
  logger[level]({
    ...context,
    type: 'api-call',
    method,
    url,
    status,
    duration
  });
};

/**
 * Utility function to log user actions
 * @param action - Action name
 * @param context - Additional context
 */
export const logUserAction = (action: string, context?: Record<string, unknown>) => {
  logger.info({
    ...context,
    type: 'user-action',
    action
  });
};

/**
 * Utility function to log data operations
 * @param operation - Operation type (create, read, update, delete)
 * @param entity - Entity type
 * @param context - Additional context
 */
export const logDataOperation = (
  operation: 'create' | 'read' | 'update' | 'delete',
  entity: string,
  context?: Record<string, unknown>
) => {
  logger.info({
    ...context,
    type: 'data-operation',
    operation,
    entity
  });
};

/**
 * Utility function to sanitize sensitive data before logging
 * @param data - Data object to sanitize
 * @returns Sanitized data
 */
export const sanitizeLogData = (data: Record<string, unknown>): Record<string, unknown> => {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization', 'cookie'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

// Export the main logger instance with type-safe methods
export default logger;

// Re-export common logging methods for convenience (bound to logger instance)
export const trace = logger.trace.bind(logger);
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const fatal = logger.fatal.bind(logger);
