import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    // The Babylon scene stays lazy-loaded; Milestone 3.5 gameplay polish keeps it near 313 KB gzip.
    chunkSizeWarningLimit: 1350,
  },
  plugins: [
    react(),
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'assets/ui/logo-full.png', 'assets/ui/logo-icon.png'],
      manifest: {
        name: 'Catch the Magician',
        short_name: 'Magician',
        description: 'A mystical endless runner through floating arcane ruins.',
        theme_color: '#12091f',
        background_color: '#12091f',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'assets/ui/logo-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/audio/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ctm-audio-v1',
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/characters/') || url.pathname.startsWith('/assets/environment/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ctm-game-assets-v1',
              expiration: {
                maxEntries: 140,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
})
