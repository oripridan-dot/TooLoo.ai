// @version 3.3.569
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const port = process.env.PORT ? Number(process.env.PORT) : 5173;
  const apiHost = process.env.TOOLOO_API_HOST ?? '127.0.0.1';
  // Default stays Genesis-friendly (4001). In Synapsys repo we override via TOOLOO_API_PORT=4000.
  const apiPort = process.env.TOOLOO_API_PORT ? Number(process.env.TOOLOO_API_PORT) : 4001;
  const apiTarget = `http://${apiHost}:${apiPort}`;

  return {
    plugins: [react()],
    server: {
      host: true,
      port,
      strictPort: true,
      proxy: {
        '/health': apiTarget,
        '/api': apiTarget,
      },
    },
  };
});
