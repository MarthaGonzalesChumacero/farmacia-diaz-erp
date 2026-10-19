import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api-inventario': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-inventario/, ''),
      },
      '/api-ventas': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-ventas/, ''),
      },
      '/api-usuarios': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-usuarios/, ''),
      },
    },
  },
})