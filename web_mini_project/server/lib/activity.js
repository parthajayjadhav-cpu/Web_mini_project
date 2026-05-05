import { Store } from '../models/Workspace.js'

/**
 * Append an activity-log entry to a workspace document, broadcast it via
 * Socket.io, and return the entry. Caller is responsible for `await save()`.
 */
export function pushActivity(workspace, entry, io) {
  const item = {
    _id: Store.newActivityId(),
    type: entry.type,
    message: entry.message,
    actor: entry.actor || '',
    meta: entry.meta || {},
    timestamp: new Date(),
  }
  workspace.activityLog.push(item)
  // Cap the log so it doesn't grow forever.
  if (workspace.activityLog.length > 500) {
    workspace.activityLog.splice(0, workspace.activityLog.length - 500)
  }
  if (io) io.to(workspace.code).emit('activity:new', item)
  return item
}
