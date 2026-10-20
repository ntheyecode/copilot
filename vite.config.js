import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Everything is bundled locally - no CDN, no external runtime deps.
// In dev, /api is proxied to the Express server on :4444.
// assetsDir is 'copilot-assets' (not the default 'assets') so, when WorkCoPilot
// and the interview app share one box + domain behind nginx, their hashed asset
// paths never collide (interview keeps /assets/, copilot uses /copilot-assets/).
export default defineConfig({
  plugins: [react()],
  build: { assetsDir: 'copilot-assets' },
  server: {
    port: 5180,
    proxy: { '/api': 'http://localhost:4444' },
  },
})
