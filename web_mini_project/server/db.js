import mongoose from 'mongoose'

/**
 * Vercel-friendly cached connection.
 * On serverless, every cold-start invocation gets a fresh module scope,
 * but warm invocations re-use this `cached` global to avoid opening a new
 * pool on every request.
 */
const globalAny = globalThis
let cached = globalAny.__sprintboardMongoCache
if (!cached) {
  cached = globalAny.__sprintboardMongoCache = { conn: null, promise: null }
}

export async function connectDB(uri) {
  if (!uri) {
    if (!globalAny.__sprintboardWarnedNoMongo) {
      console.warn('[sprintboard] MONGODB_URI not set — running with in-memory store. Data will reset on every cold start.')
      globalAny.__sprintboardWarnedNoMongo = true
    }
    return null
  }
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    mongoose.set('strictQuery', true)
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 8000,
        // Keep the connection pool small — serverless concurrency is bounded
        // and Atlas free tier has limited connections.
        maxPoolSize: 5,
      })
      .then((m) => {
        console.log('[sprintboard] mongo connected')
        return m.connection
      })
      .catch((err) => {
        console.error('[sprintboard] mongo connect failed:', err.message)
        cached.promise = null
        return null
      })
  }
  cached.conn = await cached.promise
  return cached.conn
}

export function isMongoConnected() {
  return mongoose.connection?.readyState === 1
}
