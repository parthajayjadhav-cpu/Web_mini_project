/**
 * Socket.io stub for Vercel serverless deployment.
 * Real-time is replaced with polling in WorkspaceContext.
 * This file exists so existing imports don't break.
 */

// No-op event emitter that mimics socket interface
const noopSocket = {
  connected: false,
  on: () => noopSocket,
  off: () => noopSocket,
  emit: () => noopSocket,
  connect: () => noopSocket,
  disconnect: () => noopSocket,
}

export function getSocket() {
  return noopSocket
}

export function disconnectSocket() {
  // no-op
}
