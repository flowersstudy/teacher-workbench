import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://47.105.83.180:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://47.105.83.180:3000',
        changeOrigin: true,
      },
    },
  },
})
