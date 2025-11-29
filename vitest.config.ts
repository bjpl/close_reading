import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    // Use forks pool for stability (vmThreads was causing segmentation faults)
    pool: 'forks',
    poolOptions: {
      forks: {
        // Single fork for more stable execution
        singleFork: true,
      },
    },
    // Increase timeouts for CI/WSL2 environments
    testTimeout: 30000,
    hookTimeout: 30000,
    // Retry failed tests once to handle flaky tests
    retry: 1,
    // Enable isolation to prevent IndexedDB and mock state leaking between tests
    isolate: true,
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
        'src/__tests__/',
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
    include: ['tests/**/*.test.{ts,tsx}', 'src/__tests__/**/*.test.{ts,tsx}'],
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
      '@tests': path.resolve(__dirname, './tests'),
      // Mock pdf-parse subpath for test environment - the package doesn't export this path properly
      'pdf-parse/lib/pdf-parse.js': path.resolve(__dirname, './tests/__mocks__/pdf-parse.ts')
    }
  }
});
