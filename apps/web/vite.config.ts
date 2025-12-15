// @version 2.0.1 - Codespace Optimized
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const isCodespace = !!process.env.CODESPACES || !!process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Disable Fast Refresh in Codespaces for stability
      fastRefresh: !isCodespace,
    }),
    tailwindcss(),
  ],
  root: path.resolve(__dirname),
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // Disable source maps to save memory
    minify: 'esbuild',
    // Reduce chunk size for faster builds
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['framer-motion', 'lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Required for Codespace port forwarding
    strictPort: true,
    // HMR optimized for Codespaces
    hmr: isCodespace
      ? {
          // Use clientPort for Codespace forwarding
          clientPort: 443,
          protocol: 'wss',
          timeout: 30000,
        }
      : {
          overlay: false, // Disable overlay to reduce overhead
          timeout: 5000,
        },
    // CRITICAL: Disable polling - use native file system events
    watch: {
      usePolling: false, // Native events are MUCH faster
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/coverage/**',
        '**/data/**',
        '**/.turbo/**',
        '**/temp/**',
        '**/*.log',
        '**/pnpm-lock.yaml',
      ],
    },
    proxy: {
      '/api/v2': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        timeout: 60000,
        proxyTimeout: 60000,
      },
      '/socket.io': {
        target: 'http://localhost:4001',
        ws: true,
        changeOrigin: true,
      },
      '/api/v1': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/v1/, '/api/v2'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@skin': path.resolve(__dirname, 'src/skin'),
    },
  },
  // Pre-bundle dependencies for faster cold starts
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      '@tanstack/react-query',
      'zustand',
      'framer-motion',
      'socket.io-client',
      'react-router-dom',
    ],
    // Force pre-bundling on startup
    force: false,
    esbuildOptions: {
      target: 'es2020',
    },
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
    // Faster compilation
    target: 'es2020',
  },
  // Reduce console noise
  logLevel: 'warn',
  clearScreen: false,
});
