import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // La app empaquetada carga index.html vía file:// (BrowserWindow.loadFile).
  // Con base '/' (default), los <script>/<link> quedan con rutas absolutas
  // ("/assets/...") que bajo file:// se buscan en la raíz del filesystem, no
  // relativas al HTML — el JS nunca carga y la ventana queda en blanco.
  // Solo aplica al build (dev sigue sirviendo con Vite en localhost:5173).
  base: command === 'build' ? './' : '/',
  build: {
    outDir: 'build',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/assets/products': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
}));
