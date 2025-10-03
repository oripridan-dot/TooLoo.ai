import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses for Codespaces
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3006',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Lean production build
    rollupOptions: {
      output: {
        // Cache busting with hash in filenames
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`
      }
    }
  },
})