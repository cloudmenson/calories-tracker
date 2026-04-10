import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // mongodb and @netlify/functions are server-only — never bundle into the frontend
      external: ['mongodb', '@netlify/functions', '@google/generative-ai'],
    },
  },
})
