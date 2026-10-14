import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl =
    env.VITE_API_URL ||
    env.API_URL ||
    env.BACKEND_URL ||
    env.VITE_BACKEND_URL ||
    env.VITE_API_BASE_URL ||
    process.env.VITE_API_URL ||
    process.env.API_URL ||
    process.env.BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    process.env.VITE_API_BASE_URL ||
    ''

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'API_', 'BACKEND_'],
    define: {
      '__VERCEL_BACKEND_URL__': JSON.stringify(apiUrl),
    },
  }
})
