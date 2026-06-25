import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@cbt/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    // Listen on all interfaces so other devices (e.g. your phone) on the same
    // network can reach the dev server at http://<this-machine-ip>:5173.
    host: true,
    port: 5173,
    // When tunneling (Cloudflare/ngrok), set VITE_ALLOWED_HOSTS to the tunnel
    // hostname(s), comma-separated, or "true" to allow any host.
    allowedHosts:
      process.env.VITE_ALLOWED_HOSTS === 'true'
        ? true
        : process.env.VITE_ALLOWED_HOSTS
          ? process.env.VITE_ALLOWED_HOSTS.split(',')
          : undefined,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5174',
        changeOrigin: true,
      },
    },
  },
});
