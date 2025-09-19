import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Vitest Configuration for Performance Testing
 *
 * This configuration is specifically optimized for running performance tests
 * with enhanced reporting and monitoring capabilities.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    // Performance test environment
    environment: 'jsdom',

    // Global test setup for performance monitoring
    setupFiles: [
      path.resolve(__dirname, './performance-setup.ts')
    ],

    // Enable globals for easier test writing
    globals: true,

    // Performance-specific test patterns
    include: [
      'src/tests/performance/**/*.test.{ts,tsx}',
      'src/tests/integration/**/*.test.{ts,tsx}',
      'src/tests/benchmark/**/*.test.{ts,tsx}',
      'src/tests/e2e/**/*.test.{ts,tsx}'
    ],

    // Exclude non-performance tests
    exclude: [
      'node_modules/**',
      'src/tests/unit/**', // Unit tests run separately
      '**/*.d.ts'
    ],

    // Increased timeouts for performance tests
    testTimeout: 30000, // 30 seconds for complex performance tests
    hookTimeout: 10000, // 10 seconds for setup/teardown

    // Single-threaded execution for consistent performance measurements
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true // Ensure consistent performance environment
      }
    },

    // Coverage configuration optimized for performance testing
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/performance',

      // Include performance-critical files
      include: [
        'src/components/orders/Enhanced*.tsx',
        'src/hooks/useOrderModalData.ts',
        'src/hooks/usePerformanceMonitor.ts',
        'src/services/supabaseQueryOptimizer.ts'
      ],

      // Exclude test files and mocks
      exclude: [
        'src/tests/**',
        '**/*.test.{ts,tsx}',
        '**/*.mock.{ts,tsx}',
        '**/*.d.ts',
        '**/node_modules/**'
      ],

      // Performance-focused coverage thresholds
      thresholds: {
        global: {
          branches: 70,    // Lower for performance tests (focus on critical paths)
          functions: 75,
          lines: 70,
          statements: 70
        },
        // Higher thresholds for critical performance files
        'src/hooks/useOrderModalData.ts': {
          branches: 85,
          functions: 90,
          lines: 85,
          statements: 85
        },
        'src/components/orders/EnhancedOrderDetailModal.tsx': {
          branches: 80,
          functions: 85,
          lines: 80,
          statements: 80
        }
      }
    },

    // Performance reporting configuration
    reporters: [
      'default',
      'json',
      ['html', { outputFile: './test-results/performance-report.html' }],
      ['junit', { outputFile: './test-results/performance-junit.xml' }]
    ],

    // Output directory for performance test results
    outputFile: {
      json: './test-results/performance-results.json',
      junit: './test-results/performance-junit.xml'
    },

    // Mock configuration for performance testing
    deps: {
      // External dependencies that need to be mocked for consistent performance
      external: [
        '@supabase/supabase-js',
        'react-i18next'
      ]
    },

    // Browser configuration for E2E performance tests
    browser: {
      enabled: false, // Disabled by default, enable for browser-specific tests
      name: 'chromium',
      provider: 'playwright',
      headless: true,

      // Performance monitoring in browser
      api: {
        port: 63315,
        strictPort: true
      }
    }
  },

  // Build configuration for test environment
  build: {
    // Source maps for better debugging of performance issues
    sourcemap: true,

    // Optimize for test environment
    target: 'node14',

    // Minification disabled for better error traces
    minify: false
  },

  // Path resolution matching main application
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../')
    }
  },

  // Define global constants for performance testing
  define: {
    'process.env.NODE_ENV': '"test"',
    'process.env.VITEST': 'true',
    'process.env.PERFORMANCE_TESTING': 'true',

    // Performance testing flags
    '__PERFORMANCE_MONITORING__': 'true',
    '__CACHE_DEBUGGING__': 'true',
    '__MEMORY_TRACKING__': 'true'
  },

  // Server configuration for test server
  server: {
    // Use different port to avoid conflicts
    port: 5174,
    strictPort: true,

    // CORS for performance testing tools
    cors: true,

    // Headers for performance monitoring
    headers: {
      'Cache-Control': 'no-cache',
      'X-Performance-Test': 'true'
    }
  }
});