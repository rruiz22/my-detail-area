import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true, // Fail if port 8080 is not available
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Fix lodash CommonJS/ESM compatibility for recharts - use lodash-es instead
      "lodash/get": "lodash-es/get",
      "lodash/isNaN": "lodash-es/isNaN",
      "lodash/isEmpty": "lodash-es/isEmpty",
      "lodash/isArray": "lodash-es/isArray",
      "lodash/isObject": "lodash-es/isObject",
      "lodash/throttle": "lodash-es/throttle",
      "lodash": "lodash-es",
      // Prevent @emotion/is-prop-valid from loading in browser
      "@emotion/is-prop-valid": path.resolve(__dirname, "./src/utils/empty-module.js")
    },
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env': '{}'
  },
  worker: {
    format: 'es'
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core framework - highest priority
          'react-vendor': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],

          // UI foundation - frequent use
          'ui-radix': [
            '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-toast', '@radix-ui/react-select', '@radix-ui/react-popover'
          ],
          'ui-components': [
            '@radix-ui/react-checkbox', '@radix-ui/react-switch', '@radix-ui/react-slider',
            '@radix-ui/react-tabs', '@radix-ui/react-accordion', '@radix-ui/react-collapsible'
          ],
          'shadcn-ui': ['class-variance-authority', 'clsx', 'tailwind-merge'],

          // Data & state management
          'query': ['@tanstack/react-query'],
          'table': ['@tanstack/react-table'],
          'supabase': ['@supabase/supabase-js'],

          // Forms & validation - on-demand
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],

          // Business features - lazy load candidates
          'charts': ['recharts'], // 428KB - good candidate for lazy loading
          'date-utils': ['date-fns'], // Split moment separately
          'moment-utils': ['moment'],
          'scanner-qr': ['qrcode.react'],
          'tesseract': ['tesseract.js'], // Large OCR lib

          // Internationalization - core feature
          'i18n': ['react-i18next', 'i18next'],

          // Icons - shared across app
          'icons': ['lucide-react'],

          // Heavy specialized libs - lazy load
          'fabric-canvas': ['fabric'], // Canvas manipulation
          'opencv': ['opencv.js'], // Computer vision
          'huggingface': ['@huggingface/transformers'], // ML models

          // Animation & interactions
          'framer-motion': ['framer-motion'],
          'dnd': ['@hello-pangea/dnd'],

          // Development & testing
          'dev-tools': ['@testing-library/react', '@testing-library/user-event', 'msw']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    target: 'es2020',
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: mode === 'development'
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'react-i18next',
      'i18next',
      'clsx',
      'tailwind-merge',
      // Pre-bundle lodash-es modules for recharts compatibility
      'lodash-es',
      'lodash-es/get',
      'lodash-es/isNaN',
      'lodash-es/isEmpty',
      'lodash-es/isArray',
      'lodash-es/isObject',
      'lodash-es/throttle',
      // Pre-bundle recharts with its lodash dependencies
      'recharts'
    ],
    exclude: [
      'fabric',
      'opencv.js',
      '@huggingface/transformers'
    ]
  }
}));