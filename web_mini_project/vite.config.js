import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom Vite plugin: mounts the Express app as middleware in dev
// so /api/* requests are handled in-process by the same code that
// runs as the Vercel serverless function in production.
function expressDevPlugin() {
  return {
    name: 'express-dev-middleware',
    async configureServer(server) {
      const { default: makeApp } = await import('./server/_app.js')
      const app = makeApp()
      server.middlewares.use('/api', app)
    },
  }
}

export default defineConfig({
  plugins: [react(), expressDevPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
