import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  envPrefix: ['VITE_', 'PUBLIC_', 'TURNSTILE_', 'FIREBASE_'],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // manifest: false — já existe public/manifest.json, referenciado
      // manualmente em index.html; deixa esse arquivo como está e o
      // plugin cuida só de gerar/registrar o service worker.
      manifest: false,
      workbox: {
        // Cacheia o "app shell" (JS/CSS/HTML do build) pra abrir mesmo
        // sem internet nenhuma — o cache do Firestore
        // (persistentLocalCache, em src/firebase.js) só ajuda os dados
        // DEPOIS que o app já carregou uma vez; sem isso aqui, offline
        // total = tela em branco.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Open Food Facts (scanner) — não é essencial cachear
            // resultado, só evita um erro feio de rede no meio da busca.
            urlPattern: /^https:\/\/(br|world)\.openfoodfacts\.org\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'off-api', networkTimeoutSeconds: 5 },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
