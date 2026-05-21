import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env for the current mode (development, production, test)
  // VITE_* variables are exposed to the client when prefixed
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      // Expose VITE_API_URL to the React app
      'import.meta.env.VITE_API_URL': JSON.stringify(
        env.VITE_API_URL || 'http://localhost:3001'
      ),
    },
  }
})
