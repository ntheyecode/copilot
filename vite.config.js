import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Everything is bundled locally — no CDN, no external runtime deps.
// In dev, /api is proxied to the Express server on :4444.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    proxy: { '/api': 'http://localhost:4444' },
  },
})
