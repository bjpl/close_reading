/**
 * Date Utility Functions
 *
 * Provides safe date parsing and formatting to prevent "Invalid Date" errors.
 */

/**
 * Safely parse a date value and return a Date object
 * @param dateValue - Date value to parse (string, Date, or number)
 * @returns Valid Date object or current date if parsing fails
 */
export function safeParseDate(dateValue: string | Date | number | null | undefined): Date {
  if (!dateValue) {
    console.warn('⚠️ Empty date value provided, using current date');
    return new Date();
  }

  try {
    const date = new Date(dateValue);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('⚠️ Invalid date value:', dateValue, '- using current date');
      return new Date();
    }

    return date;
  } catch (error) {
    console.error('❌ Error parsing date:', dateValue, error);
    return new Date();
  }
}

/**
 * Format a date for display in the annotation list
 * @param dateValue - Date value to format
 * @returns Formatted date string (e.g., "Jan 15, 2:30 PM")
 */
export function formatAnnotationDate(dateValue: string | Date | number | null | undefined): string {
  const date = safeParseDate(dateValue);

  try {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('❌ Error formatting date:', error);
    return 'Just now';
  }
}

/**
 * Format a date as a simple date string (e.g., "1/15/2024")
 * @param dateValue - Date value to format
 * @returns Formatted date string
 */
export function formatSimpleDate(dateValue: string | Date | number | null | undefined): string {
  const date = safeParseDate(dateValue);

  try {
    return date.toLocaleDateString();
  } catch (error) {
    console.error('❌ Error formatting simple date:', error);
    return new Date().toLocaleDateString();
  }
}

/**
 * Format a date as an ISO string for database storage
 * @param dateValue - Date value to format
 * @returns ISO formatted date string
 */
export function formatISODate(dateValue?: string | Date | number | null): string {
  if (!dateValue) {
    return new Date().toISOString();
  }

  const date = safeParseDate(dateValue);
  return date.toISOString();
}

/**
 * Check if a date value is valid
 * @param dateValue - Date value to check
 * @returns True if date is valid, false otherwise
 */
export function isValidDate(dateValue: string | Date | number | null | undefined): boolean {
  if (!dateValue) {
    return false;
  }

  try {
    const date = new Date(dateValue);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Get a relative time string (e.g., "2 hours ago", "3 days ago")
 * @param dateValue - Date value to format
 * @returns Relative time string
 */
export function formatRelativeTime(dateValue: string | Date | number | null | undefined): string {
  const date = safeParseDate(dateValue);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'Just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  } else {
    return formatSimpleDate(date);
  }
}
