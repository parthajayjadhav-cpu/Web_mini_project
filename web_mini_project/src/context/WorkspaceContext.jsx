import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api.js'
import { useToast } from './ToastContext.jsx'

const WorkspaceCtx = createContext(null)

const POLL_INTERVAL = 2000 // 2 seconds

/**
 * WorkspaceProvider with polling (Vercel serverless compatible).
 * Polls every 2s, diffs state to fire toasts for new events.
 */
export function WorkspaceProvider({ code, name, children }) {
  const [workspace, setWorkspace] = useState(null)
  const [clutch, setClutch] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sprintOver, setSprintOver] = useState(false)
  const toast = useToast()

  // Track previous state for diffing
  const prevRef = useRef({ tasks: [], members: [], activityLog: [] })

  // Check if sprint ended
  const checkSprintEnd = useCallback((ws) => {
    if (!ws) return false
    const end = new Date(ws.createdAt).getTime() + ws.sessionDuration * 60_000
    return Date.now() >= end
  }, [])

  // Diff and fire toasts for changes
  const processChanges = useCallback(
    (next, prev) => {
      if (!next || !prev) return

      // New activity log entries
      const prevLogIds = new Set(prev.activityLog?.map((a) => a.id) || [])
      const newActivities = (next.activityLog || []).filter((a) => !prevLogIds.has(a.id))

      for (const activity of newActivities) {
        // Skip if this is our own action (we already know about it)
        if (activity.actor === name) continue

        switch (activity.type) {
          case 'task_done': {
            const task = next.tasks.find((t) => t.id === activity.taskId)
            if (task && activity.awarded) {
              if (activity.bonus) {
                toast.streak(`${activity.actor}: +${activity.awarded} pts (streak bonus)`)
              } else {
                toast.point(`${activity.actor}: +${activity.awarded} pts`)
              }
            }
            break
          }
          case 'member_joined':
            toast.info(`${activity.actor} joined`)
            break
          case 'urgent':
            toast.info(`${activity.actor} flagged a task urgent`)
            break
          default:
            break
        }
      }

      // New members
      const prevMemberNames = new Set(prev.members?.map((m) => m.name) || [])
      const newMembers = (next.members || []).filter((m) => !prevMemberNames.has(m.name))
      for (const member of newMembers) {
        if (member.name !== name) {
          // Activity log should handle this, but fallback
        }
      }
    },
    [name, toast],
  )

  // Initial fetch
  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .fetchWorkspace(code)
      .then((data) => {
        if (!alive) return
        setWorkspace(data.workspace)
        setClutch(data.clutch)
        prevRef.current = {
          tasks: data.workspace?.tasks || [],
          members: data.workspace?.members || [],
          activityLog: data.workspace?.activityLog || [],
        }
        if (checkSprintEnd(data.workspace)) setSprintOver(true)
      })
      .catch((err) => {
        if (!alive) return
        setError(err)
      })
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [code, checkSprintEnd])

  // Polling loop
  useEffect(() => {
    if (!workspace) return

    const poll = async () => {
      try {
        const data = await api.fetchWorkspace(code)
        const next = data.workspace

        // Diff against previous state
        processChanges(next, prevRef.current)

        // Update refs and state
        prevRef.current = {
          tasks: next?.tasks || [],
          members: next?.members || [],
          activityLog: next?.activityLog || [],
        }

        setWorkspace(next)
        setClutch(data.clutch)

        // Check sprint end
        if (checkSprintEnd(next) && !sprintOver) {
          setSprintOver(true)
        }
      } catch (err) {
        console.error('[v0] Poll error:', err)
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [code, workspace, sprintOver, checkSprintEnd, processChanges])

  // Mutators
  const addTask = useCallback(
    async (payload) => {
      try {
        const data = await api.addTask(code, { ...payload, actor: name })
        // Optimistically update from response
        if (data?.workspace) {
          setWorkspace(data.workspace)
          prevRef.current.tasks = data.workspace.tasks || []
          prevRef.current.activityLog = data.workspace.activityLog || []
        }
      } catch (err) {
        toast.error(err.message || 'Failed to add task')
      }
    },
    [code, name, toast],
  )

  const setStatus = useCallback(
    async (taskId, status) => {
      try {
        const data = await api.setStatus(code, taskId, { status, actor: name })
        // Show points if we completed a task
        if (status === 'done' && data?.awarded) {
          if (data.bonus) {
            toast.streak(`+${data.awarded} pts (streak bonus!)`)
          } else {
            toast.point(`+${data.awarded} pts`)
          }
        }
        // Update from response
        if (data?.workspace) {
          setWorkspace(data.workspace)
          prevRef.current.tasks = data.workspace.tasks || []
          prevRef.current.activityLog = data.workspace.activityLog || []
        }
        if (data?.clutch !== undefined) {
          setClutch(data.clutch)
        }
      } catch (err) {
        toast.error(err.message || 'Failed to update task')
      }
    },
    [code, name, toast],
  )

  const setUrgent = useCallback(
    async (taskId, urgent) => {
      try {
        const data = await api.setUrgent(code, taskId, { urgent, actor: name })
        if (data?.workspace) {
          setWorkspace(data.workspace)
          prevRef.current.tasks = data.workspace.tasks || []
          prevRef.current.activityLog = data.workspace.activityLog || []
        }
      } catch (err) {
        toast.error(err.message || 'Failed to flag task')
      }
    },
    [code, name, toast],
  )

  const setNote = useCallback(
    async (taskId, note) => {
      try {
        const data = await api.setNote(code, taskId, { note, actor: name })
        if (data?.workspace) {
          setWorkspace(data.workspace)
        }
      } catch (err) {
        toast.error(err.message || 'Failed to save note')
      }
    },
    [code, name, toast],
  )

  const setSettings = useCallback(
    async (payload) => {
      try {
        const data = await api.setSettings(code, payload)
        if (data?.workspace) {
          setWorkspace(data.workspace)
        }
        toast.info('Settings saved')
      } catch (err) {
        toast.error(err.message || 'Failed to save settings')
      }
    },
    [code, toast],
  )

  const startNewSprint = useCallback(async () => {
    try {
      const data = await api.reset(code, { actor: name })
      if (data?.workspace) {
        setWorkspace(data.workspace)
        prevRef.current = {
          tasks: data.workspace.tasks || [],
          members: data.workspace.members || [],
          activityLog: data.workspace.activityLog || [],
        }
      }
      setSprintOver(false)
    } catch (err) {
      toast.error(err.message || 'Failed to start new sprint')
    }
  }, [code, name, toast])

  const exportSummary = useCallback(async () => {
    try {
      const data = await api.exportSummary(code)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sprintboard-${code}-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.message || 'Failed to export')
    }
  }, [code, toast])

  const value = useMemo(
    () => ({
      code,
      name,
      workspace,
      clutch,
      loading,
      error,
      sprintOver,
      addTask,
      setStatus,
      setUrgent,
      setNote,
      setSettings,
      startNewSprint,
      exportSummary,
      socket: null, // No socket in serverless mode
    }),
    [
      code,
      name,
      workspace,
      clutch,
      loading,
      error,
      sprintOver,
      addTask,
      setStatus,
      setUrgent,
      setNote,
      setSettings,
      startNewSprint,
      exportSummary,
    ],
  )

  return <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceCtx)
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ctx
}
