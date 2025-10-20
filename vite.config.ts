import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true, // Fail if port 8080 is not available
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // PWA Configuration for Push Notifications
    // Re-enabled with Node.js v20 LTS for workbox-build compatibility
    VitePWA({
      // Strategy: Generate service worker (Vite PWA handles PWA cache)
      // Firebase Messaging SW registered separately for FCM notifications
      strategies: 'generateSW',

      // Register service worker configuration
      registerType: 'autoUpdate',

      // Inject manifest for PWA installation
      manifest: {
        name: 'My Detail Area',
        short_name: 'MDA',
        description: 'Enterprise Dealership Management System',
        theme_color: '#f9fafb', // Notion-style muted gray (gray-50)
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/favicon-mda.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/favicon.ico',
            sizes: '64x64',
            type: 'image/x-icon'
          }
        ],
        // PWA Categories for app stores
        categories: ['business', 'productivity'],

        // Push notification configuration
        // IMPORTANT: This MUST match VITE_FIREBASE_MESSAGING_SENDER_ID
        gcm_sender_id: '242154179799', // Required for Firebase Cloud Messaging compatibility

        // Shortcuts for common actions (optional)
        shortcuts: [
          {
            name: 'New Sales Order',
            short_name: 'Sales',
            description: 'Create a new sales order',
            url: '/sales-orders?new=true',
            icons: [{ src: '/favicon-mda.svg', sizes: 'any' }]
          },
          {
            name: 'New Service Order',
            short_name: 'Service',
            description: 'Create a new service order',
            url: '/service-orders?new=true',
            icons: [{ src: '/favicon-mda.svg', sizes: 'any' }]
          }
        ]
      },

      // Workbox configuration for caching strategies (optional but recommended)
      workbox: {
        // ✅ OPTIMIZATION: Disable logging in development to reduce console spam
        mode: mode === 'development' ? 'development' : 'production',

        // ✅ FIX: Increase file size limit for large bundles (default 2MB)
        // Large index bundle (2.45MB) due to ML/Computer Vision libraries
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB

        // Generate service worker with Workbox for PWA offline support
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // Runtime caching rules for offline support
        runtimeCaching: [
          {
            // Cache API responses from Supabase
            urlPattern: ({ url }) => url.origin === 'https://swfnnrpzpkdypbrzmgnr.supabase.co',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Cache static assets
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            // Cache fonts
            urlPattern: /\.(?:woff|woff2|ttf|otf)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      },

      // Development options
      // ✅ OPTIMIZATION: Disable SW in development to eliminate Workbox console spam
      devOptions: {
        enabled: false, // Disable SW in dev - only needed in production for PWA
        type: 'module',
        navigateFallback: 'index.html'
      },

      // Include additional files in the PWA
      includeAssets: ['favicon.ico', 'favicon-mda.svg', 'robots.txt']
    })
  ].filter(Boolean),
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
      "@emotion/is-prop-valid": path.resolve(__dirname, "./src/utils/empty-module.js"),
      "@emotion/styled": path.resolve(__dirname, "./src/utils/empty-module.js"),
      "@emotion/react": path.resolve(__dirname, "./src/utils/empty-module.js")
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
          'opencv': ['@techstark/opencv-js'], // Computer vision - correct package name
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
      '@techstark/opencv-js',
      '@huggingface/transformers'
    ]
  }
}));