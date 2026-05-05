import { Router } from 'express'
import { Store } from '../models/Workspace.js'
import { makeUniqueCode } from '../lib/codes.js'
import { templateTasks, pointsFor } from '../lib/templates.js'
import { applyStreakOnComplete, reversePoints } from '../lib/streak.js'
import { computeClutch } from '../lib/clutch.js'
import { pushActivity } from '../lib/activity.js'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function publicWorkspace(w) {
  if (!w) return null
  const obj = typeof w.toObject === 'function' ? w.toObject() : { ...w }
  // Strip the Mongo internal version key if present.
  delete obj.__v
  return obj
}

function findTask(w, taskId) {
  return w.tasks.find((t) => String(t._id) === String(taskId))
}

function uniqueName(workspace, requested) {
  const taken = new Set(workspace.members.map((m) => m.name.toLowerCase()))
  if (!taken.has(requested.toLowerCase())) return requested
  let n = 2
  while (taken.has(`${requested}${n}`.toLowerCase())) n += 1
  return `${requested}${n}`
}

function rankings(workspace) {
  return [...workspace.members]
    .sort((a, b) => b.points - a.points || a.joinedAt - b.joinedAt)
    .map((m, i) => ({ rank: i + 1, ...(typeof m.toObject === 'function' ? m.toObject() : m) }))
}

function rankOf(workspace, name) {
  return rankings(workspace).find((r) => r.name === name)?.rank ?? null
}

function emitWorkspace(io, w, eventOverrides = {}) {
  // Convenience emitter for events that mutate state and want to ship the new
  // public state alongside an event-specific payload.
  io.to(w.code).emit('workspace:state', publicWorkspace(w))
  for (const [event, payload] of Object.entries(eventOverrides)) {
    io.to(w.code).emit(event, payload)
  }
}

function emitClutchIfChanged(io, w, prevClutchName) {
  const next = computeClutch(w)
  if (next?.name !== prevClutchName) {
    io.to(w.code).emit('clutch:changed', next)
    if (next?.name) {
      pushActivity(
        w,
        {
          type: 'clutch',
          message: `${next.name} claimed Clutch Player`,
          actor: next.name,
        },
        io,
      )
    }
  }
}

function emitPointsUpdate(io, w) {
  io.to(w.code).emit('points:updated', {
    members: rankings(w),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Router factory — closes over `io` so handlers can broadcast.
// ─────────────────────────────────────────────────────────────────────────────

export function createWorkspaceRouter(io) {
  const router = Router()

  /**
   * POST /api/workspace/join
   * Body: { name, code?, template?, sessionDuration? }
   *  - If `code` supplied + exists → add member if new, return state.
   *  - If `code` supplied but not found → 404 (Doc 2 bug-fix: never auto-create on join).
   *  - If no `code` → generate a unique one, create workspace, optionally seed tasks.
   */
  router.post('/join', async (req, res) => {
    const { name, code, template, sessionDuration } = req.body || {}
    const trimmedName = String(name || '').trim()
    if (!trimmedName) return res.status(400).json({ error: 'NAME_REQUIRED' })
    if (trimmedName.length > 32) return res.status(400).json({ error: 'NAME_TOO_LONG' })

    // JOIN existing
    if (code) {
      const upper = String(code).trim().toUpperCase()
      const w = await Store.findByCode(upper)
      if (!w) return res.status(404).json({ error: 'WORKSPACE_NOT_FOUND' })
      const existing = w.members.find((m) => m.name.toLowerCase() === trimmedName.toLowerCase())
      let memberName = trimmedName
      if (!existing) {
        memberName = uniqueName(w, trimmedName)
        w.members.push({
          name: memberName,
          points: 0,
          streak: 0,
          longestStreak: 0,
          pointHistory: [],
          tasksCompleted: 0,
          joinedAt: new Date(),
        })
        pushActivity(
          w,
          { type: 'member_joined', message: `${memberName} joined the sprint`, actor: memberName },
          io,
        )
      } else {
        memberName = existing.name
      }
      if (typeof w.save === 'function') await w.save()
      io.to(w.code).emit('member:joined', { name: memberName })
      io.to(w.code).emit('workspace:state', publicWorkspace(w))
      return res.json({ workspace: publicWorkspace(w), memberName })
    }

    // CREATE new
    const newCode = await makeUniqueCode(5)
    const tpl = ['hackathon', 'college', 'blank'].includes(template) ? template : 'blank'
    const seededTasks = templateTasks(tpl)
    const w = await Store.create({
      code: newCode,
      sessionDuration: Number.isFinite(sessionDuration) && sessionDuration > 0 ? Math.min(720, Math.floor(sessionDuration)) : 180,
      template: tpl,
      members: [
        {
          name: trimmedName,
          points: 0,
          streak: 0,
          longestStreak: 0,
          pointHistory: [],
          tasksCompleted: 0,
          joinedAt: new Date(),
        },
      ],
      tasks: seededTasks,
      activityLog: [],
    })
    pushActivity(
      w,
      { type: 'member_joined', message: `${trimmedName} created the sprint`, actor: trimmedName },
      io,
    )
    if (seededTasks.length) {
      pushActivity(
        w,
        {
          type: 'task_added',
          message: `Loaded "${tpl}" template (${seededTasks.length} tasks)`,
          actor: trimmedName,
        },
        io,
      )
    }
    if (typeof w.save === 'function') await w.save()
    return res.json({ workspace: publicWorkspace(w), memberName: trimmedName })
  })

  /** GET /api/workspace/:code — full workspace state (or 404). */
  router.get('/:code', async (req, res) => {
    const w = await Store.findByCode(req.params.code)
    if (!w) return res.status(404).json({ error: 'WORKSPACE_NOT_FOUND' })
    return res.json({ workspace: publicWorkspace(w), clutch: computeClutch(w) })
  })

  /** POST /api/workspace/:code/task — add a new task. Body: { title, assignedTo, difficulty, actor } */
  router.post('/:code/task', async (req, res) => {
    const { title, assignedTo, difficulty, actor } = req.body || {}
    const trimmedTitle = String(title || '').trim()
    if (!trimmedTitle) return res.status(400).json({ error: 'TITLE_REQUIRED' })
    const diff = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium'
    const w = await Store.findByCode(req.params.code)
    if (!w) return res.status(404).json({ error: 'WORKSPACE_NOT_FOUND' })
    const task = {
      _id: Store.newTaskId(),
      title: trimmedTitle.slice(0, 200),
      assignedTo: String(assignedTo || '').slice(0, 64),
      difficulty: diff,
      points: pointsFor(diff),
      status: 'todo',
      urgent: false,
      note: '',
      completedAt: null,
      completedBy: '',
      createdAt: new Date(),
    }
    w.tasks.push(task)
    pushActivity(
      w,
      {
        type: 'task_added',
        message: `${actor || 'someone'} added "${task.title}"`,
        actor: actor || '',
        meta: { taskId: task._id },
      },
      io,
    )
    if (typeof w.save === 'function') await w.save()
    io.to(w.code).emit('task:added', { task })
    io.to(w.code).emit('workspace:state', publicWorkspace(w))
    return res.json({ task, workspace: publicWorkspace(w) })
  })

  /** PATCH /api/workspace/:code/task/:id/status — body: { status, actor } */
  router.patch('/:code/task/:id/status', async (req, res) => {
    const { status, actor } = req.body || {}
    if (!['todo', 'inprogress', 'done'].includes(status)) {
      return res.status(400).json({ error: 'BAD_STATUS' })
    }
    const w = await Store.findByCode(req.params.code)
    if (!w) return res.status(404).json({ error: 'WORKSPACE_NOT_FOUND' })
    const task = findTask(w, req.params.id)
    if (!task) return res.status(404).json({ error: 'TASK_NOT_FOUND' })
    const prevStatus = task.status
    if (prevStatus === status) return res.json({ task, workspace: publicWorkspace(w) })

    const prevClutch = computeClutch(w)?.name || null
    const prevTopRank = rankings(w)[0]?.name || null

    let toastDelta = null

    // Coming OUT of done → reverse points award.
    if (prevStatus === 'done' && status !== 'done') {
      const memberName = task.completedBy || task.assignedTo
      const member = w.members.find((m) => m.name === memberName)
      if (member) reversePoints({ member, awarded: task._lastAwarded || task.points })
      task.completedAt = null
      task.completedBy = ''
    }

    task.status = status

    // Going INTO done → award points + run streak.
    if (status === 'done' && prevStatus !== 'done') {
      const actorName = actor || task.assignedTo
      let member = w.members.find((m) => m.name === actorName)
      if (!member && actorName) {
        // If the completer isn't a member yet (edge case), add them.
        member = {
          name: actorName,
          points: 0,
          streak: 0,
          longestStreak: 0,
          pointHistory: [],
          tasksCompleted: 0,
          joinedAt: new Date(),
        }
        w.members.push(member)
      }
      if (member) {
        const result = applyStreakOnComplete({ workspace: w, member, basePoints: task.points })
        member.points += result.awarded
        member.tasksCompleted += 1
        member.pointHistory.push({ time: new Date(), points: member.points })
        task._lastAwarded = result.awarded
        task.completedAt = new Date()
        task.completedBy = member.name

        toastDelta = { name: member.name, awarded: result.awarded, bonus: result.bonus, streak: result.streak }
        pushActivity(
          w,
          {
            type: 'task_done',
            message: `${member.name} completed "${task.title}" · +${result.awarded}pts${result.bonus ? ' (1.5×)' : ''}`,
            actor: member.name,
            meta: { taskId: task._id, awarded: result.awarded, bonus: result.bonus },
          },
          io,
        )
        if (result.bonus) {
          pushActivity(
            w,
            {
              type: 'streak',
              message: `${member.name} is on a ${result.streak}-task streak! ×1.5 bonus`,
              actor: member.name,
              meta: { streak: result.streak },
            },
            io,
          )
        }
      }
    } else {
      pushActivity(
        w,
        {
          type: 'task_moved',
          message: `${actor || 'someone'} moved "${task.title}" → ${labelOf(status)}`,
          actor: actor || '',
          meta: { taskId: task._id, from: prevStatus, to: status },
        },
        io,
      )
    }

    // Detect rank change at #1 after a points award.
    const newTopRank = rankings(w)[0]?.name || null
    if (status === 'done' && newTopRank && prevTopRank && newTopRank !== prevTopRank) {
      pushActivity(
        w,
        {
          type: 'rank_change',
          message: `${newTopRank} overtook ${prevTopRank} for #1!`,
          actor: newTopRank,
        },
        io,
      )
    }

    if (typeof w.save === 'function') await w.save()

    io.to(w.code).emit('task:moved', { task, from: prevStatus, to: status, toast: toastDelta })
    if (status === 'done') emitPointsUpdate(io, w)
    emitClutchIfChanged(io, w, prevClutch)
    io.to(w.code).emit('workspace:state', publicWorkspace(w))

    return res.json({ task, workspace: publicWorkspace(w), toast: toastDelta })
  })

  /** PATCH /api/workspace/:code/task/:id/urgent — body: { urgent, actor } */
  router.patch('/:code/task/:id/urgent', async (req, res) => {
    const w = await Store.findByCode(req.params.code)
    if (!w) return res.status(404).json({ error: 'WORKSPACE_NOT_FOUND' })
    const task = findTask(w, req.params.id)
    if (!task) return res.status(404).json({ error: 'TASK_NOT_FOUND' })
    const next = typeof req.body?.urgent === 'boolean' ? req.body.urgent : !task.urgent
    task.urgent = next
    if (next) {
      pushActivity(
        w,
        {
          type: 'urgent',
          message: `${req.body?.actor || 'someone'} flagged "${task.title}" as urgent`,
          actor: req.body?.actor || '',
        },
        io,
      )
    }
    if (typeof w.save === 'function') await w.save()
    io.to(w.code).emit('task:urgent', { taskId: task._id, urgent: task.urgent })
    io.to(w.code).emit('workspace:state', publicWorkspace(w))
    return res.json({ task, workspace: publicWorkspace(w) })
  })

  /** PATCH /api/workspace/:code/task/:id/note — body: { note, actor } */
  router.patch('/:code/task/:id/note', async (req, res) => {
    const w = await Store.findByCode(req.params.code)
    if (!w) return res.status(404).json({ error: 'WORKSPACE_NOT_FOUND' })
    const task = findTask(w, req.params.id)
    if (!task) return res.status(404).json({ error: 'TASK_NOT_FOUND' })
    const note = String(req.body?.note ?? '').slice(0, 500)
    const had = task.note
    task.note = note
    if (note && note !== had) {
      pushActivity(
        w,
        {
          type: 'note',
          message: `${req.body?.actor || 'someone'} updated note on "${task.title}"`,
          actor: req.body?.actor || '',
        },
        io,
      )
    }
    if (typeof w.save === 'function') await w.save()
    io.to(w.code).emit('task:note', { taskId: task._id, note })
    return res.json({ task })
  })

  /** PATCH /api/workspace/:code/settings — body: { sessionDuration? } */
  router.patch('/:code/settings', async (req, res) => {
    const w = await Store.findByCode(req.params.code)
    if (!w) return res.status(404).json({ error: 'WORKSPACE_NOT_FOUND' })
    if (Number.isFinite(req.body?.sessionDuration) && req.body.sessionDuration > 0) {
      w.sessionDuration = Math.min(720, Math.floor(req.body.sessionDuration))
      w.sprintOverNotified = false
    }
    if (typeof w.save === 'function') await w.save()
    io.to(w.code).emit('workspace:state', publicWorkspace(w))
    return res.json({ workspace: publicWorkspace(w) })
  })

  /** GET /api/workspace/:code/clutch — direct fetch (also pushed via socket). */
  router.get('/:code/clutch', async (req, res) => {
    const w = await Store.findByCode(req.params.code)
    if (!w) return res.status(404).json({ error: 'WORKSPACE_NOT_FOUND' })
    return res.json({ clutch: computeClutch(w) })
  })

  /** GET /api/workspace/:code/export — JSON sprint summary. */
  router.get('/:code/export', async (req, res) => {
    const w = await Store.findByCode(req.params.code)
    if (!w) return res.status(404).json({ error: 'WORKSPACE_NOT_FOUND' })
    const summary = {
      code: w.code,
      template: w.template,
      createdAt: w.createdAt,
      sessionDurationMinutes: w.sessionDuration,
      finalLeaderboard: rankings(w).map(({ rank, name, points, tasksCompleted, longestStreak }) => ({
        rank,
        name,
        points,
        tasksCompleted,
        longestStreak,
      })),
      completedTasks: w.tasks
        .filter((t) => t.status === 'done')
        .map((t) => ({
          title: t.title,
          difficulty: t.difficulty,
          points: t.points,
          completedBy: t.completedBy || t.assignedTo,
          completedAt: t.completedAt,
        })),
      totals: {
        completed: w.tasks.filter((t) => t.status === 'done').length,
        outstanding: w.tasks.filter((t) => t.status !== 'done').length,
      },
    }
    return res.json(summary)
  })

  /** POST /api/workspace/:code/reset — Start New Sprint. Keep members, clear tasks/scores. */
  router.post('/:code/reset', async (req, res) => {
    const w = await Store.findByCode(req.params.code)
    if (!w) return res.status(404).json({ error: 'WORKSPACE_NOT_FOUND' })
    w.tasks = []
    w.activityLog = []
    w.lastCompletedBy = ''
    w.sprintOverNotified = false
    w.createdAt = new Date()
    for (const m of w.members) {
      m.points = 0
      m.streak = 0
      m.longestStreak = 0
      m.pointHistory = []
      m.tasksCompleted = 0
    }
    pushActivity(w, { type: 'task_added', message: 'New sprint started', actor: req.body?.actor || '' }, io)
    if (typeof w.save === 'function') await w.save()
    io.to(w.code).emit('workspace:state', publicWorkspace(w))
    io.to(w.code).emit('sprint:reset', { code: w.code })
    return res.json({ workspace: publicWorkspace(w) })
  })

  return router
}

function labelOf(status) {
  return { todo: 'TO DO', inprogress: 'IN PROGRESS', done: 'DONE' }[status] || status
}
