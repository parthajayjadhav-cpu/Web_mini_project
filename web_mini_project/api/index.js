import makeApp from '../server/_app.js'

/**
 * Vercel serverless entry. Exports the Express app as the default handler.
 * IMPORTANT: no `app.listen()` here — Vercel calls the exported function
 * for each request and shuts the process down between invocations.
 *
 * The vercel.json rewrite sends every /api/* request to this file. We pass
 * the request through with the /api prefix already stripped by the rewrite.
 */
let app
function getApp() {
  if (!app) app = makeApp()
  return app
}

export default function handler(req, res) {
  return getApp()(req, res)
}
