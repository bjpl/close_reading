import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    // Use threads pool for better WSL2/Node.js 22 compatibility
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        // Increase startup timeout for WSL2 environments
        execArgv: ['--experimental-vm-modules'],
      },
      forks: {
        // Fallback settings if forks pool is used
        isolate: true,
      }
    },
    // Increase timeouts for CI/WSL2 environments
    testTimeout: 30000,
    hookTimeout: 30000,
    // Retry failed tests once to handle flaky tests
    retry: 1,
    // Disable isolation for faster test runs (tests should be independent anyway)
    isolate: false,
    // Sequence tests for more predictable execution
    sequence: {
      shuffle: false,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/'
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80
      }
    },
    include: ['tests/**/*.test.{ts,tsx}'],
    // Exclude node_modules test files
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@tests': path.resolve(__dirname, './tests')
    }
  }
});
