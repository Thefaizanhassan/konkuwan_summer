import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer';
import cloudflareHeaders from './vite-plugin-headers';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflareHeaders(),
    // Bundle analysis is a debugging aid, not part of a release. It wrote
    // client/stats.html on every production build. Opt in with ANALYZE=1.
    process.env.ANALYZE === '1' && visualizer({ open: false }),
  ].filter(Boolean),
  // The client calls a relative /api in every environment; in dev this proxy
  // forwards it to the local Express server.
  server: {
    proxy: { '/api': { target: 'http://localhost:5500', changeOrigin: true } },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})