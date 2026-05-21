import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Load env files — VITE_* vars must be prefixed with VITE_
const env = loadEnv('development', process.cwd(), '')

export default defineConfig({
  plugins: [react()],
  define: {
    // Expose VITE_API_URL to the React app
    'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:3001'),
  },
})
