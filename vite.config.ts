import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pure static SPA build. Output goes to dist/ and is deployable to any static
// CDN (Cloudflare Pages / Vercel free tier). No server code, no serverless fns.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'esnext',
    sourcemap: false,
  },
  worker: {
    // Workers are bundled as ES modules so transferable buffers work cleanly.
    format: 'es',
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
})
