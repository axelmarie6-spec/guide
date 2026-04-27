import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Travel Hub & Oracle',
        short_name: 'Travel Hub',
        description: 'Passeport numérique de groupe — 22 jours en Europe',
        theme_color: '#0f0f1a',
        background_color: '#0f0f1a',
        display: 'standalone',
        lang: 'fr',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Tuiles OpenStreetMap (plans de gare) — cache long
            urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            // PDFs et fichiers Supabase Storage — cache long
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            // Météo — réseau en priorité, cache 1h en fallback
            urlPattern: /^https:\/\/api\.openweathermap\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 }
            }
          },
          {
            // Taux de change — réseau en priorité, cache 6h en fallback
            urlPattern: /^https:\/\/api\.frankfurter\.app\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fx-api',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 6 }
            }
          }
        ]
      }
    })
  ]
})
