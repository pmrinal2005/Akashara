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
    // Allow the sandbox public-proxy host (and any host) to reach the dev server.
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    // Vite 6 preview blocks unknown Host headers by default; the sandbox public
    // URL is a generated subdomain, so permit all hosts for the static preview.
    allowedHosts: true,
  },
})
