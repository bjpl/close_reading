/**
 * Manual test script for the logger service
 * Run with: tsx scripts/test-logger.ts
 */

import logger, {
  createLogger,
  logError,
  logPerformance,
  startTimer,
  sanitizeLogData,
  info,
  error,
  warn,
  debug,
} from '../src/lib/logger';

console.log('=== Testing Logger Service ===\n');

// Test 1: Basic logging levels
console.log('Test 1: Basic logging levels');
logger.trace('This is a trace message');
logger.debug('This is a debug message');
logger.info('This is an info message');
logger.warn('This is a warning message');
logger.error('This is an error message');
console.log('✓ Basic logging levels work\n');

// Test 2: Named imports
console.log('Test 2: Named imports');
info('Info via named import');
warn('Warning via named import');
error('Error via named import');
debug('Debug via named import');
console.log('✓ Named imports work\n');

// Test 3: Structured logging with context
console.log('Test 3: Structured logging');
logger.info('User action', {
  action: 'login',
  userId: '123',
  timestamp: new Date().toISOString()
});
console.log('✓ Structured logging works\n');

// Test 4: Child logger
console.log('Test 4: Child logger with context');
const componentLogger = createLogger({ component: 'DocumentProcessor' });
componentLogger.info('Processing started');
componentLogger.info('Processing complete', { documentId: 'doc123' });
console.log('✓ Child logger works\n');

// Test 5: Error logging
console.log('Test 5: Error logging');
try {
  throw new Error('Test error with stack trace');
} catch (err) {
  logError(err as Error, { operation: 'testOperation' });
}
logError('String error message', { context: 'test' });
console.log('✓ Error logging works\n');

// Test 6: Performance logging
console.log('Test 6: Performance logging');
logPerformance('testOperation', 123.45, { documentId: 'doc123' });
console.log('✓ Performance logging works\n');

// Test 7: Timer utility
console.log('Test 7: Timer utility');
const endTimer = startTimer('timedOperation', { context: 'test' });
setTimeout(() => {
  endTimer();
  console.log('✓ Timer utility works\n');

  // Test 8: Data sanitization
  console.log('Test 8: Data sanitization');
  const sensitiveData = {
    email: 'user@example.com',
    password: 'secret123',
    token: 'abc123xyz',
    apiKey: 'key123',
    userId: '456',
    data: {
      authorization: 'Bearer token',
      publicInfo: 'safe data'
    }
  };

  const sanitized = sanitizeLogData(sensitiveData);
  console.log('Original:', sensitiveData);
  console.log('Sanitized:', sanitized);
  console.log('✓ Data sanitization works\n');

  console.log('=== All Tests Complete ===');
}, 100);
