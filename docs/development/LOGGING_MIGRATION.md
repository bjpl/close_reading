# Logging Service Migration Guide

This guide explains how to migrate from `console.log` statements to the new centralized logging service.

## Overview

The project now uses [Pino](https://getpino.io/) for structured, performant logging with the following benefits:

- **Environment-aware**: Pretty formatting in development, JSON in production
- **Performance**: Significantly faster than console.log
- **Structured**: Easy to parse and search logs
- **Browser-compatible**: Works in both browser and Node.js environments
- **Type-safe**: Full TypeScript support
- **Security**: Built-in sensitive data sanitization

## Quick Start

### Basic Usage

Replace `console.log` with appropriate log levels:

```typescript
// Before
console.log('User logged in:', userId);
console.error('Failed to fetch data:', error);

// After
import logger from '@/lib/logger';

logger.info('User logged in', { userId });
logger.error('Failed to fetch data', { error });
```

### Available Log Levels

Use the appropriate level for each situation:

| Level | When to Use | Example |
|-------|-------------|---------|
| `trace` | Very detailed debugging | Function entry/exit, loop iterations |
| `debug` | Debugging information | Variable states, conditional branches |
| `info` | General information | User actions, successful operations |
| `warn` | Warning conditions | Deprecated API usage, recoverable errors |
| `error` | Error conditions | Failed operations, caught exceptions |
| `fatal` | Critical failures | Unrecoverable errors, application crashes |

## Migration Patterns

### Pattern 1: Simple Console Logs

```typescript
// Before
console.log('Document uploaded successfully');

// After
import { info } from '@/lib/logger';
info('Document uploaded successfully');
```

### Pattern 2: Logs with Variables

```typescript
// Before
console.log('Processing document:', documentId, 'for user:', userId);

// After
import { info } from '@/lib/logger';
info('Processing document', { documentId, userId });
```

### Pattern 3: Error Logging

```typescript
// Before
console.error('Failed to save annotation:', error);

// After
import { logError } from '@/lib/logger';
logError(error, { context: 'saveAnnotation', annotationId });
```

### Pattern 4: Performance Monitoring

```typescript
// Before
const start = Date.now();
await processDocument();
console.log('Processing took:', Date.now() - start, 'ms');

// After
import { startTimer } from '@/lib/logger';

const endTimer = startTimer('processDocument');
await processDocument();
endTimer(); // Automatically logs performance
```

### Pattern 5: API Call Logging

```typescript
// Before
console.log(`API ${method} ${url} - Status: ${response.status}`);

// After
import { logApiCall } from '@/lib/logger';
logApiCall(method, url, response.status, duration, { requestId });
```

### Pattern 6: User Action Tracking

```typescript
// Before
console.log('User clicked export button');

// After
import { logUserAction } from '@/lib/logger';
logUserAction('export-annotations', { documentId, format: 'csv' });
```

### Pattern 7: Data Operations

```typescript
// Before
console.log('Creating new project:', projectData);

// After
import { logDataOperation } from '@/lib/logger';
logDataOperation('create', 'project', { projectId: projectData.id });
```

### Pattern 8: Conditional Logging

```typescript
// Before
if (import.meta.env.DEV) {
  console.log('Debug info:', debugData);
}

// After
import { debug } from '@/lib/logger';
debug('Debug info', { debugData });
// Logger handles environment filtering automatically
```

### Pattern 9: Child Loggers for Context

```typescript
// Before
console.log('[DocumentProcessor] Starting processing');
console.log('[DocumentProcessor] Extracting text');
console.log('[DocumentProcessor] Processing complete');

// After
import { createLogger } from '@/lib/logger';

const logger = createLogger({ component: 'DocumentProcessor' });
logger.info('Starting processing');
logger.info('Extracting text');
logger.info('Processing complete');
```

### Pattern 10: Sanitizing Sensitive Data

```typescript
// Before
console.log('Login request:', { email, password }); // SECURITY RISK!

// After
import logger, { sanitizeLogData } from '@/lib/logger';

const safeData = sanitizeLogData({ email, password });
logger.info('Login request', safeData);
// Output: { email: 'user@example.com', password: '[REDACTED]' }
```

## Import Options

### Default Import (Full Logger)
```typescript
import logger from '@/lib/logger';

logger.info('Message', { context });
logger.error('Error', { error });
```

### Named Imports (Individual Methods)
```typescript
import { info, error, warn } from '@/lib/logger';

info('Message', { context });
error('Error', { error });
```

### Utility Imports
```typescript
import {
  logError,
  logPerformance,
  logApiCall,
  logUserAction,
  logDataOperation,
  startTimer,
  createLogger,
  sanitizeLogData
} from '@/lib/logger';
```

## Configuration

The logger automatically configures itself based on the environment:

### Development Mode
- Pretty formatted output with colors
- Log level: `debug` (shows debug, info, warn, error, fatal)
- Timestamps in human-readable format
- Stack traces for errors

### Production Mode
- JSON structured output
- Log level: `info` (shows info, warn, error, fatal)
- ISO timestamps
- Optimized for log aggregation services

## Best Practices

### 1. Use Structured Data
```typescript
// Good: Structured data
logger.info('User action', { action: 'login', userId: '123' });

// Avoid: String interpolation
logger.info(`User ${userId} performed ${action}`);
```

### 2. Choose Appropriate Log Levels
```typescript
// Debug: Development only
logger.debug('Variable state', { state });

// Info: Important operations
logger.info('Document created', { documentId });

// Warn: Potential issues
logger.warn('Using fallback method', { reason });

// Error: Failures that need attention
logger.error('API call failed', { error, endpoint });
```

### 3. Include Context
```typescript
// Good: Rich context
logger.error('Save failed', {
  operation: 'saveAnnotation',
  documentId,
  userId,
  error: error.message
});

// Avoid: Minimal context
logger.error('Save failed');
```

### 4. Use Utility Functions
```typescript
// Performance tracking
const endTimer = startTimer('documentProcessing', { documentId });
await processDocument();
endTimer();

// Error handling
try {
  await riskyOperation();
} catch (error) {
  logError(error, { operation: 'riskyOperation', documentId });
}
```

### 5. Avoid Logging Sensitive Data
```typescript
// Never log raw passwords, tokens, etc.
const safeData = sanitizeLogData(requestData);
logger.info('Request processed', safeData);
```

### 6. Use Child Loggers for Components
```typescript
// Create component-specific logger
const logger = createLogger({
  component: 'AnnotationStore',
  version: '1.0.0'
});

// All logs will include component context
logger.info('Annotation saved'); // Includes component info
```

## Migration Checklist

- [ ] Install dependencies: `npm install pino pino-pretty`
- [ ] Replace `console.log` with `logger.info`
- [ ] Replace `console.error` with `logger.error` or `logError`
- [ ] Replace `console.warn` with `logger.warn`
- [ ] Replace `console.debug` with `logger.debug`
- [ ] Add context objects instead of string interpolation
- [ ] Use utility functions for common patterns
- [ ] Remove conditional `if (DEV)` checks (logger handles this)
- [ ] Sanitize any logs that might contain sensitive data
- [ ] Create child loggers for major components
- [ ] Add performance tracking for critical operations
- [ ] Update tests to use logger instead of console

## Testing

### Testing with the Logger

```typescript
import { describe, it, expect, vi } from 'vitest';
import logger from '@/lib/logger';

describe('MyComponent', () => {
  it('logs user action', () => {
    const logSpy = vi.spyOn(logger, 'info');

    // Perform action
    performUserAction();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('User action'),
      expect.objectContaining({ action: 'test' })
    );
  });
});
```

### Mocking the Logger

```typescript
// In test setup
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  logError: vi.fn(),
  logPerformance: vi.fn(),
}));
```

## Performance Considerations

Pino is one of the fastest logging libraries:

- **6x faster** than console.log in Node.js
- **Minimal overhead** in production builds
- **Async logging** doesn't block the main thread
- **Smart serialization** for complex objects

## Troubleshooting

### Logger Not Showing Logs in Browser

Check the browser console settings - some browsers filter out non-error logs by default. The logger uses console methods internally.

### Pretty Printing Not Working

Ensure you're in development mode:
```typescript
// Check environment
console.log(import.meta.env.MODE); // Should be 'development'
```

### Type Errors with Context Objects

Ensure context is a plain object:
```typescript
// Good
logger.info('Message', { key: 'value' });

// Bad
logger.info('Message', new CustomClass());
```

## Future Enhancements

Planned improvements:
- Log aggregation service integration
- Custom log transports
- Real-time log streaming
- Advanced filtering and querying
- Automatic error reporting integration

## Resources

- [Pino Documentation](https://getpino.io/)
- [Pino Best Practices](https://getpino.io/#/docs/best-practices)
- [Structured Logging Guide](https://www.thoughtworks.com/insights/blog/structured-logging)

## Support

For questions or issues with the logging service, please contact the development team or create an issue in the project repository.
