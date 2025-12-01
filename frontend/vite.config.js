import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permite conexiones desde cualquier IP de la red
    port: 5173,
    strictPort: true,
    https: false, // HTTPS desactivado temporalmente
  }
})