import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['images/logo.png'],
      manifest: {
        name: 'حسابداری اپسای',
        short_name: 'اپسای',
        description: 'سیستم حسابداری استودیو معماری اپسای',
        lang: 'fa',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#16a34a',
        icons: [
          { src: '/images/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/images/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/images/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jsdelivr-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          { urlPattern: /\/api\/.*/i, handler: 'NetworkOnly' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'date': ['react-multi-date-picker', 'react-date-object', 'dayjs'],
          'icons': ['lucide-react'],
          'form': ['react-hook-form', 'zod'],
          'state': ['zustand'],
          'charts': ['recharts'],
        },
      },
    },
  },
});