# Logger Testing Guide

This document explains how to test the logging service in different environments.

## Test Results

### Node.js Environment (tsx/Node)

The logger has been tested and verified in a Node.js environment:

```bash
npx tsx scripts/test-logger.ts
```

**Results:**
- Basic logging levels: PASS
- Named imports: PASS
- Structured logging with context: PASS
- Child logger with context: PASS
- Error logging with stack traces: PASS
- Performance logging: PASS
- Timer utility: PASS
- Data sanitization: PASS

**Output Format:** JSON structured logs (production-style)

### Browser Environment Testing

To test in the browser:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the browser console and run:
   ```javascript
   // Import the logger
   import logger from './src/lib/logger';

   // Test basic logging
   logger.info('Test message from browser');
   logger.error('Test error from browser');

   // Test with context
   logger.info('User action', { action: 'test', userId: '123' });

   // Test sanitization
   import { sanitizeLogData } from './src/lib/logger';
   const data = { email: 'test@example.com', password: 'secret' };
   console.log(sanitizeLogData(data));
   ```

**Expected Output:** Pretty formatted logs with colors in development mode

## Manual Testing Checklist

- [x] Logger installs without errors
- [x] Logger works in Node.js environment
- [x] All log levels work (trace, debug, info, warn, error, fatal)
- [x] Structured logging with context works
- [x] Child loggers work with inherited context
- [x] Error logging includes stack traces
- [x] Performance logging works
- [x] Timer utility works
- [x] Data sanitization works for sensitive fields
- [ ] Logger works in browser development mode (manual verification needed)
- [ ] Logger works in browser production build (manual verification needed)

## Known Issues

### Vitest Integration

The logger has issues with Vitest's test environment due to Pino's browser configuration. This is a known limitation. For now:

- Use manual test script (`scripts/test-logger.ts`) for Node.js testing
- Use browser console for browser testing
- Integration tests should focus on functionality rather than output format

### Workaround for Unit Tests

If you need to test components that use the logger in Vitest, you can mock the logger:

```typescript
// In your test file
vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  logError: vi.fn(),
  logPerformance: vi.fn(),
}));
```

## Performance Benchmarks

Based on Pino's official benchmarks:

- **6x faster** than console.log in Node.js
- **Minimal overhead** in production builds
- **Async logging** available for high-throughput scenarios
- **Smart serialization** for complex objects

## Next Steps

1. Test logger in browser development mode (manual)
2. Test logger in browser production build (manual)
3. Consider adding custom transports for error tracking services
4. Consider adding log aggregation for production
5. Update mocking strategy for unit tests if needed

## Support

For issues or questions about the logger:
1. Check the [LOGGING_MIGRATION.md](./LOGGING_MIGRATION.md) guide
2. Review [Pino documentation](https://getpino.io/)
3. Check the test script: `scripts/test-logger.ts`
