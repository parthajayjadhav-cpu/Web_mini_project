import express from 'express'
import cors from 'cors'
import { connectDB } from './db.js'
import { createWorkspaceRouter } from './routes/workspace.js'

/**
 * No-op Socket.io shim. The existing route handlers were written when the
 * server ran as a long-lived process with Socket.io. Vercel serverless cannot
 * keep WebSocket connections open, so we drop the events here. The client
 * polls /api/workspace/:code every few seconds for state instead.
 *
 * The shim preserves the `io.to(room).emit(event, payload)` chaining shape
 * so routes/lib code does not need to change.
 */
const ioShim = {
  to() {
    return {
      emit() {},
    }
  },
  emit() {},
}

/**
 * Build the Express app. Called once per cold start.
 * Connects to Mongo (cached) before the first request via a small middleware.
 */
export default function makeApp() {
  const app = express()

  // CORS — same-origin requests on Vercel don't need this, but it's safe.
  const origins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)
  app.use(
    cors({
      origin: origins.length ? origins : true,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '256kb' }))

  // Lazy-connect to Mongo on first request. On Vercel, MONGODB_URI must be set.
  let connectPromise = null
  app.use(async (_req, _res, next) => {
    if (!connectPromise) connectPromise = connectDB(process.env.MONGODB_URI)
    try {
      await connectPromise
    } catch (err) {
      // connectDB swallows its own errors and returns null; this is paranoia.
      console.error('[sprintboard] db middleware error:', err)
    }
    next()
  })

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'sprintboard-api' })
  })

  app.use('/workspace', createWorkspaceRouter(ioShim))

  // 404 handler scoped to the API.
  app.use((req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', path: req.originalUrl })
  })

  // Error handler.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error('[sprintboard] unhandled:', err)
    res.status(500).json({ error: 'INTERNAL', message: err.message })
  })

  return app
}
