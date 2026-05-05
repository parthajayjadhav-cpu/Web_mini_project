/**
 * Sprint templates — pre-loaded task lists. Selected at workspace-create time.
 * difficulty → points mapping mirrors lib/streak.js → POINTS map.
 */
export const TEMPLATES = {
  hackathon: {
    label: 'Hackathon Starter',
    description: '8 tasks pre-loaded',
    tasks: [
      { title: 'Ideation', difficulty: 'easy' },
      { title: 'UI Wireframe', difficulty: 'medium' },
      { title: 'Backend Setup', difficulty: 'medium' },
      { title: 'DB Schema', difficulty: 'medium' },
      { title: 'API Integration', difficulty: 'hard' },
      { title: 'Frontend Build', difficulty: 'hard' },
      { title: 'Testing', difficulty: 'medium' },
      { title: 'Deployment', difficulty: 'medium' },
    ],
  },
  college: {
    label: 'College Project',
    description: '6 tasks pre-loaded',
    tasks: [
      { title: 'Research', difficulty: 'medium' },
      { title: 'Proposal Doc', difficulty: 'easy' },
      { title: 'Presentation Slides', difficulty: 'medium' },
      { title: 'Report Draft', difficulty: 'hard' },
      { title: 'Final Review', difficulty: 'medium' },
      { title: 'Submit', difficulty: 'easy' },
    ],
  },
  blank: {
    label: 'Blank Sprint',
    description: 'Start from scratch',
    tasks: [],
  },
}

export function templateTasks(name) {
  const t = TEMPLATES[name]
  if (!t) return []
  return t.tasks.map((task) => ({
    ...task,
    assignedTo: '',
    status: 'todo',
    urgent: false,
    note: '',
    points: pointsFor(task.difficulty),
    createdAt: new Date(),
  }))
}

export function pointsFor(difficulty) {
  return { easy: 10, medium: 25, hard: 50 }[difficulty] ?? 25
}
