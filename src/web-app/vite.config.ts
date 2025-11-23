// @version 2.1.11
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isCodespace = Boolean(process.env.CODESPACES);
const csName = process.env.CODESPACE_NAME;
const csDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

const hmrConfig =
  isCodespace && csName && csDomain
    ? { protocol: 'wss', host: `${csName}-5173.${csDomain}`, clientPort: 443 }
    : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { 
        target: 'http://localhost:3001', 
        changeOrigin: true, 
        secure: false,
        ws: true, // Enable WebSocket proxying
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Proxying:', req.method, req.url);
          });
        }
      },
    },
    hmr: hmrConfig,
    cors: true, // Enable CORS on Vite dev server
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['@testing-library/jest-dom/vitest'],
    watch: false,
  },
});