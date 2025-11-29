/**
 * Centralized Logger Utility
 *
 * Provides consistent logging across the application with:
 * - Multiple log levels (debug, info, warn, error)
 * - Production mode no-op behavior
 * - Development mode with timestamps and colored output
 * - Type-safe implementation
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  useColors: boolean;
  useTimestamps: boolean;
}

/**
 * ANSI color codes for terminal output
 */
const Colors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',

  // Foreground colors
  Red: '\x1b[31m',
  Green: '\x1b[32m',
  Yellow: '\x1b[33m',
  Blue: '\x1b[34m',
  Magenta: '\x1b[35m',
  Cyan: '\x1b[36m',
  White: '\x1b[37m',
  Gray: '\x1b[90m',
} as const;

/**
 * Log level configurations with colors and console methods
 */
const LevelConfig = {
  debug: {
    color: Colors.Cyan,
    label: 'DEBUG',
    method: 'log' as const,
  },
  info: {
    color: Colors.Green,
    label: 'INFO',
    method: 'info' as const,
  },
  warn: {
    color: Colors.Yellow,
    label: 'WARN',
    method: 'warn' as const,
  },
  error: {
    color: Colors.Red,
    label: 'ERROR',
    method: 'error' as const,
  },
} as const;

/**
 * Logger class implementation
 */
class Logger {
  private config: LoggerConfig;

  constructor() {
    // Disable logging in production mode
    const isProduction = process.env.NODE_ENV === 'production';

    this.config = {
      enabled: !isProduction,
      useColors: !isProduction && typeof process !== 'undefined' && process.stdout?.isTTY !== false,
      useTimestamps: !isProduction,
    };
  }

  /**
   * Format timestamp for log output
   */
  private formatTimestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');

    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  /**
   * Format log prefix with level and timestamp
   */
  private formatPrefix(level: LogLevel): string {
    const config = LevelConfig[level];
    const timestamp = this.config.useTimestamps ? this.formatTimestamp() : '';

    if (!this.config.useColors) {
      return timestamp ? `[${timestamp}] [${config.label}]` : `[${config.label}]`;
    }

    const coloredLabel = `${config.color}${Colors.Bright}${config.label}${Colors.Reset}`;
    const coloredTimestamp = timestamp ? `${Colors.Gray}${timestamp}${Colors.Reset}` : '';

    return coloredTimestamp ? `${coloredTimestamp} ${coloredLabel}` : coloredLabel;
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, ...args: unknown[]): void {
    if (!this.config.enabled) {
      return;
    }

    const prefix = this.formatPrefix(level);
    const consoleMethod = console[LevelConfig[level].method];

    consoleMethod(prefix, ...args);
  }

  /**
   * Log debug information
   * Use for detailed debugging information during development
   */
  public debug(...args: unknown[]): void {
    this.log('debug', ...args);
  }

  /**
   * Log general information
   * Use for general informational messages
   */
  public info(...args: unknown[]): void {
    this.log('info', ...args);
  }

  /**
   * Log warnings
   * Use for warning messages that don't prevent operation
   */
  public warn(...args: unknown[]): void {
    this.log('warn', ...args);
  }

  /**
   * Log errors
   * Use for error conditions that should be investigated
   */
  public error(...args: unknown[]): void {
    this.log('error', ...args);
  }

  /**
   * Check if logger is enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current configuration
   */
  public getConfig(): Readonly<LoggerConfig> {
    return { ...this.config };
  }

  /**
   * Enable or disable logging (useful for testing)
   */
  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Enable or disable colors (useful for CI environments)
   */
  public setUseColors(useColors: boolean): void {
    this.config.useColors = useColors;
  }

  /**
   * Enable or disable timestamps
   */
  public setUseTimestamps(useTimestamps: boolean): void {
    this.config.useTimestamps = useTimestamps;
  }
}

/**
 * Singleton logger instance
 * Import this throughout the application for consistent logging
 *
 * @example
 * import { logger } from '@/utils/logger';
 *
 * logger.debug('Debugging info:', { data });
 * logger.info('Operation completed');
 * logger.warn('Potential issue detected');
 * logger.error('Error occurred:', error);
 */
export const logger = new Logger();

/**
 * Export Logger class for testing purposes
 */
export { Logger };

/**
 * Export types for external use
 */
export type { LogLevel, LoggerConfig };
