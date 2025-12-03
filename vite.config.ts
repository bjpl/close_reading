import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // Exclude ONNX runtime from pre-bundling to avoid bundling large WASM files
    exclude: ['onnxruntime-web'],
  },
  build: {
    chunkSizeWarningLimit: 600, // Slightly increase limit for ML-heavy app
    rollupOptions: {
      output: {
        // Manual chunking strategy to optimize bundle size
        manualChunks: (id) => {
          // React core libraries
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          // Chakra UI and Emotion styling
          if (id.includes('node_modules/@chakra-ui') || id.includes('node_modules/@emotion')) {
            return 'vendor-ui';
          }
          // Supabase client
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          // Citation libraries
          if (id.includes('node_modules/citation-js') || id.includes('node_modules/@citation-js')) {
            return 'vendor-citation';
          }
          // React Icons
          if (id.includes('node_modules/react-icons')) {
            return 'vendor-icons';
          }
          // ML runtime - lazy loaded, separate chunk
          if (id.includes('node_modules/onnxruntime-web')) {
            return 'ml-runtime';
          }
          // ML feature code - lazy loaded
          if (id.includes('/src/services/ml/')) {
            return 'feature-ml';
          }
          // RUVector feature code - lazy loaded
          if (id.includes('/src/services/ruvector/')) {
            return 'feature-ruvector';
          }
        },
        // Asset naming for ONNX models
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.onnx')) {
            return 'models/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
      // Don't bundle .onnx model files - they should be fetched on demand
      external: (id) => {
        return id.endsWith('.onnx');
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.{ts,tsx}',
      ],
    },
  },
})
