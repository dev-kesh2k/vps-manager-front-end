import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const PRODUCTION_BASE = '/central-apps-hub/';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? PRODUCTION_BASE : '/',
  server: {
    host: true, // Escuta em 0.0.0.0 permitindo qualquer hostname local
    port: 5173,
    allowedHosts: true, // Permite qualquer host (localhost, vps-hub, Tailscale Funnel, etc)
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/ws': { target: 'ws://localhost:3001', ws: true, changeOrigin: true },
      '/health': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
}));
