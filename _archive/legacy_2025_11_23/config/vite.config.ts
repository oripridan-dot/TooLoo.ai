import { defineConfig } from 'vite'
import { resolve } from 'path'

// Root Vite config for workspace
// Development: cd packages/web && npm run dev
// This file allows VS Code Vite extension to find configuration
// Note: React plugin is optional for static file serving

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      '@': resolve(__dirname, './packages/web/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
