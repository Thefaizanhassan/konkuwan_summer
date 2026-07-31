import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), visualizer({ open: false })],
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

/* version second
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
*/

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import { visualizer } from 'rollup-plugin-visualizer';


// // https://vite.dev/config/
// export default defineConfig({
// //   plugins: [react()],
//   plugins: [visualizer({ open: true })],
//   test: {
//     globals: true,
//     environment: 'jsdom',
//     setupFiles: './src/test/setup.js',
//   },
// })