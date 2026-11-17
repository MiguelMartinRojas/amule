import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:12128', // API server on same machine
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:3129', // WebSocket server port
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
