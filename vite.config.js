import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/local': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://172.20.10.7:18789',
        changeOrigin: true,
      },
      '/v1': {
        target: 'http://172.20.10.7:18789',
        changeOrigin: true,
      },
    },
  },
})