/**
 * Date Utilities Test Suite
 *
 * Comprehensive tests for src/utils/dateUtils.ts
 * Target: 90%+ coverage with edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  safeParseDate,
  formatAnnotationDate,
  formatSimpleDate,
  formatISODate,
  isValidDate,
  formatRelativeTime,
} from '../../src/utils/dateUtils';

// Mock the logger module used by dateUtils
vi.mock('../../src/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import the mocked logger
import { logger } from '../../src/utils/logger';

describe('dateUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('safeParseDate', () => {
    it('should parse valid ISO string', () => {
      const isoString = '2024-01-15T14:30:00Z';
      const result = safeParseDate(isoString);

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-01-15T14:30:00.000Z');
    });

    it('should parse Date object', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = safeParseDate(date);

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(date.getTime());
    });

    it('should parse timestamp number', () => {
      const timestamp = 1705330200000; // 2024-01-15
      const result = safeParseDate(timestamp);

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(timestamp);
    });

    it('should parse epoch (0) - note: 0 is treated as falsy', () => {
      // Note: The function treats 0 as falsy and returns current date
      // This is a known limitation of the implementation
      const result = safeParseDate(0);

      expect(result).toBeInstanceOf(Date);
      // Will return current date because 0 is falsy in JavaScript
      expect(result.getTime()).toBeGreaterThan(0);
    });

    it('should fallback to current date for null', () => {
      const before = Date.now();
      const result = safeParseDate(null);
      const after = Date.now();

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
      expect(logger.warn).toHaveBeenCalledWith('⚠️ Empty date value provided, using current date');
    });

    it('should fallback to current date for undefined', () => {
      const before = Date.now();
      const result = safeParseDate(undefined);
      const after = Date.now();

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.getTime()).toBeLessThanOrEqual(after);
    });

    it('should fallback to current date for invalid string', () => {
      const result = safeParseDate('not-a-date');

      expect(result).toBeInstanceOf(Date);
      // The logger is called with an object and message
      expect(logger.warn).toHaveBeenCalledWith(
        { dateValue: 'not-a-date' },
        '⚠️ Invalid date value - using current date'
      );
    });

    it('should fallback to current date for "Invalid Date" string', () => {
      const result = safeParseDate('Invalid Date');

      expect(result).toBeInstanceOf(Date);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should parse very old dates', () => {
      const oldDate = '1900-01-01T00:00:00Z';
      const result = safeParseDate(oldDate);

      expect(result).toBeInstanceOf(Date);
      // Note: Timezone offset may affect the year in local time
      expect(result.getUTCFullYear()).toBe(1900);
    });

    it('should parse future dates', () => {
      const futureDate = '2099-12-31T23:59:59Z';
      const result = safeParseDate(futureDate);

      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2099);
    });

    it('should parse dates with various formats', () => {
      const formats = [
        '2024-01-15',
        'Jan 15, 2024',
        '01/15/2024',
        '2024-01-15T14:30:00.000Z',
      ];

      formats.forEach((format) => {
        const result = safeParseDate(format);
        expect(result).toBeInstanceOf(Date);
        expect(isNaN(result.getTime())).toBe(false);
      });
    });
  });

  describe('formatAnnotationDate', () => {
    it('should format valid ISO string', () => {
      const isoString = '2024-01-15T14:30:00Z';
      const result = formatAnnotationDate(isoString);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/Jan/); // Month abbreviation
      expect(result).toMatch(/15/);  // Day
    });

    it('should format Date object', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatAnnotationDate(date);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format timestamp number', () => {
      const timestamp = 1705330200000;
      const result = formatAnnotationDate(timestamp);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle null with fallback', () => {
      const result = formatAnnotationDate(null);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle undefined with fallback', () => {
      const result = formatAnnotationDate(undefined);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle invalid dates gracefully', () => {
      const result = formatAnnotationDate('invalid-date');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatSimpleDate', () => {
    it('should format valid ISO string', () => {
      const isoString = '2024-01-15T14:30:00Z';
      const result = formatSimpleDate(isoString);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/\d+\/\d+\/\d+/); // Matches date format
    });

    it('should format Date object', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatSimpleDate(date);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format timestamp number', () => {
      const timestamp = 1705330200000;
      const result = formatSimpleDate(timestamp);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle null with fallback', () => {
      const result = formatSimpleDate(null);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle undefined with fallback', () => {
      const result = formatSimpleDate(undefined);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle invalid dates', () => {
      const result = formatSimpleDate('not-a-date');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatISODate', () => {
    it('should format valid ISO string', () => {
      const isoString = '2024-01-15T14:30:00.000Z';
      const result = formatISODate(isoString);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should format Date object to ISO', () => {
      const date = new Date('2024-01-15T14:30:00.000Z');
      const result = formatISODate(date);

      expect(result).toBe('2024-01-15T14:30:00.000Z');
    });

    it('should format timestamp number to ISO', () => {
      const timestamp = 1705330200000;
      const result = formatISODate(timestamp);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return current ISO date for null', () => {
      const result = formatISODate(null);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return current ISO date for undefined', () => {
      const result = formatISODate(undefined);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return current ISO date when no argument', () => {
      const result = formatISODate();

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle invalid dates by using fallback', () => {
      const result = formatISODate('invalid-date');

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should format epoch (0) - note: 0 is treated as falsy', () => {
      // Note: The function treats 0 as falsy and returns current date
      const result = formatISODate(0);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      // Will return current date because 0 is falsy
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid ISO string', () => {
      const result = isValidDate('2024-01-15T14:30:00Z');

      expect(result).toBe(true);
    });

    it('should return true for Date object', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = isValidDate(date);

      expect(result).toBe(true);
    });

    it('should return true for timestamp number', () => {
      const result = isValidDate(1705330200000);

      expect(result).toBe(true);
    });

    it('should return false for epoch (0) - treated as falsy', () => {
      // Note: The function treats 0 as falsy, returns false
      const result = isValidDate(0);

      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      const result = isValidDate(null);

      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      const result = isValidDate(undefined);

      expect(result).toBe(false);
    });

    it('should return false for invalid string', () => {
      const result = isValidDate('not-a-date');

      expect(result).toBe(false);
    });

    it('should return false for "Invalid Date" string', () => {
      const result = isValidDate('Invalid Date');

      expect(result).toBe(false);
    });

    it('should return true for various valid formats', () => {
      const validDates = [
        '2024-01-15',
        'Jan 15, 2024',
        '01/15/2024',
        '2024-01-15T14:30:00.000Z',
        new Date(),
        Date.now(), // Current timestamp (non-zero)
        1705330200000, // Specific non-zero timestamp
      ];

      validDates.forEach((date) => {
        expect(isValidDate(date)).toBe(true);
      });
    });

    it('should return false for empty string', () => {
      const result = isValidDate('');

      expect(result).toBe(false);
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "Just now" for current time', () => {
      const now = new Date();
      const result = formatRelativeTime(now);

      expect(result).toBe('Just now');
    });

    it('should return "Just now" for 30 seconds ago', () => {
      const date = new Date(Date.now() - 30 * 1000);
      const result = formatRelativeTime(date);

      expect(result).toBe('Just now');
    });

    it('should return "1 minute ago" for 1 minute', () => {
      const date = new Date(Date.now() - 60 * 1000);
      const result = formatRelativeTime(date);

      expect(result).toBe('1 minute ago');
    });

    it('should return "5 minutes ago" for 5 minutes', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatRelativeTime(date);

      expect(result).toBe('5 minutes ago');
    });

    it('should return "1 hour ago" for 1 hour', () => {
      const date = new Date(Date.now() - 60 * 60 * 1000);
      const result = formatRelativeTime(date);

      expect(result).toBe('1 hour ago');
    });

    it('should return "3 hours ago" for 3 hours', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const result = formatRelativeTime(date);

      expect(result).toBe('3 hours ago');
    });

    it('should return "1 day ago" for 1 day', () => {
      const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(date);

      expect(result).toBe('1 day ago');
    });

    it('should return "5 days ago" for 5 days', () => {
      const date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(date);

      expect(result).toBe('5 days ago');
    });

    it('should return formatted date for 7+ days', () => {
      const date = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(date);

      expect(result).not.toBe('Just now');
      expect(result).not.toMatch(/ago$/);
      expect(result).toMatch(/\d+\/\d+\/\d+/);
    });

    it('should handle null by using current time', () => {
      const result = formatRelativeTime(null);

      expect(result).toBe('Just now');
    });

    it('should handle undefined by using current time', () => {
      const result = formatRelativeTime(undefined);

      expect(result).toBe('Just now');
    });

    it('should handle invalid dates gracefully', () => {
      const result = formatRelativeTime('invalid-date');

      expect(typeof result).toBe('string');
      expect(result).toBe('Just now');
    });

    it('should use singular form for "1 minute ago"', () => {
      const date = new Date(Date.now() - 60 * 1000);
      const result = formatRelativeTime(date);

      expect(result).toBe('1 minute ago');
      expect(result).not.toContain('minutes');
    });

    it('should use plural form for "2 minutes ago"', () => {
      const date = new Date(Date.now() - 2 * 60 * 1000);
      const result = formatRelativeTime(date);

      expect(result).toBe('2 minutes ago');
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle extremely large timestamp values', () => {
      // Very large timestamp (year 275760)
      const veryLargeTimestamp = 8640000000000000;
      const result = safeParseDate(veryLargeTimestamp);

      expect(result).toBeInstanceOf(Date);
    });

    it('should handle negative timestamp values', () => {
      const negativeTimestamp = -1000000000000;
      const result = safeParseDate(negativeTimestamp);

      expect(result).toBeInstanceOf(Date);
    });

    it('should handle malformed date strings gracefully', () => {
      const malformedDates = [
        'abc-def-ghij',
        '99/99/9999',
        '2024-13-45', // Invalid month/day
        'not a date at all',
      ];

      malformedDates.forEach((date) => {
        const result = safeParseDate(date);
        expect(result).toBeInstanceOf(Date);
      });
    });

    it('should handle objects that are not dates', () => {
      const result = safeParseDate({} as any);

      expect(result).toBeInstanceOf(Date);
    });

    it('should validate malformed date strings return false', () => {
      const malformed = [
        'not-a-date',
        '99/99/9999',
        'abc',
        {},
        [],
      ];

      malformed.forEach((date) => {
        expect(isValidDate(date as any)).toBe(false);
      });
    });
  });

  describe('Integration tests', () => {
    it('should work with Date pipeline: parse -> format -> validate', () => {
      const isoString = '2024-01-15T14:30:00Z';

      // Parse
      const parsed = safeParseDate(isoString);
      expect(parsed).toBeInstanceOf(Date);

      // Validate
      expect(isValidDate(parsed)).toBe(true);

      // Format annotation
      const formatted = formatAnnotationDate(parsed);
      expect(typeof formatted).toBe('string');

      // Format ISO (includes milliseconds)
      const iso = formatISODate(parsed);
      expect(iso).toBe('2024-01-15T14:30:00.000Z');
    });

    it('should handle null throughout pipeline', () => {
      // Parse null
      const parsed = safeParseDate(null);
      expect(parsed).toBeInstanceOf(Date);

      // Validate null
      expect(isValidDate(null)).toBe(false);

      // Format null
      const formatted = formatAnnotationDate(null);
      expect(typeof formatted).toBe('string');
    });

    it('should maintain consistency across formats', () => {
      const date = new Date('2024-01-15T14:30:00Z');

      const iso = formatISODate(date);
      const parsed = safeParseDate(iso);
      const iso2 = formatISODate(parsed);

      expect(iso).toBe(iso2);
    });
  });
});
