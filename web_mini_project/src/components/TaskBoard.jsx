import { useState, useMemo } from 'react'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { initials, colorFromName } from '../lib/avatar.js'
import styles from './TaskBoard.module.css'

const COLUMNS = [
  { id: 'todo', label: 'To Do', dotClass: 'columnDotTodo' },
  { id: 'inprogress', label: 'In Progress', dotClass: 'columnDotProgress' },
  { id: 'done', label: 'Done', dotClass: 'columnDotDone' },
]

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', points: 1 },
  { value: 'medium', label: 'Medium', points: 2 },
  { value: 'hard', label: 'Hard', points: 3 },
]

const POINT_MAP = { easy: 1, medium: 2, hard: 3 }

export default function TaskBoard() {
  const { workspace, name, addTask, setStatus, setUrgent, setNote } = useWorkspace()

  // Add task form state
  const [newTitle, setNewTitle] = useState('')
  const [newDifficulty, setNewDifficulty] = useState('medium')
  const [newAssignee, setNewAssignee] = useState('')
  const [adding, setAdding] = useState(false)

  // Filter/sort state
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  // Drag state
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)

  // Expanded notes state
  const [expandedNotes, setExpandedNotes] = useState(new Set())

  // Get unique assignees for filter dropdown
  const assignees = useMemo(() => {
    if (!workspace) return []
    const set = new Set()
    workspace.tasks.forEach((t) => {
      if (t.assignee) set.add(t.assignee)
    })
    return Array.from(set)
  }, [workspace])

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    if (!workspace) return []
    let tasks = [...workspace.tasks]

    // Filter by assignee
    if (filterAssignee !== 'all') {
      tasks = tasks.filter((t) => t.assignee === filterAssignee)
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        break
      case 'oldest':
        tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        break
      case 'difficulty':
        tasks.sort((a, b) => POINT_MAP[b.difficulty] - POINT_MAP[a.difficulty])
        break
      case 'urgent':
        tasks.sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0))
        break
      default:
        break
    }

    return tasks
  }, [workspace, filterAssignee, sortBy])

  // Group tasks by status
  const tasksByColumn = useMemo(() => {
    const grouped = { todo: [], inprogress: [], done: [] }
    filteredTasks.forEach((t) => {
      if (grouped[t.status]) {
        grouped[t.status].push(t)
      }
    })
    return grouped
  }, [filteredTasks])

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!newTitle.trim() || adding) return

    setAdding(true)
    try {
      await addTask({
        title: newTitle.trim(),
        difficulty: newDifficulty,
        assignee: newAssignee || name,
      })
      setNewTitle('')
      setNewAssignee('')
    } finally {
      setAdding(false)
    }
  }

  // Drag handlers
  const handleDragStart = (e, taskId) => {
    setDraggedId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e, columnId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault()
    setDragOverColumn(null)

    const taskId = e.dataTransfer.getData('text/plain')
    console.log('Drop event:', { taskId, targetStatus, tasks: workspace.tasks })
    if (!taskId) {
      console.warn('No taskId found in drop event')
      return
    }

    const task = workspace.tasks.find((t) => t._id === taskId)
    if (!task) {
      console.warn('No matching task found for _id:', taskId)
      return
    }
    if (task.status === targetStatus) {
      console.info('Task already in target status:', targetStatus)
      return
    }

    await setStatus(taskId, targetStatus)
  }

  const toggleNotes = (taskId) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const handleNoteChange = (taskId, note) => {
    setNote(taskId, note)
  }

  if (!workspace) return null

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        {/* Add task form */}
        <form className={styles.addForm} onSubmit={handleAddTask}>
          <input
            type="text"
            className={styles.addInput}
            placeholder="Add a new task..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            maxLength={100}
          />
          <select
            className={styles.difficultySelect}
            value={newDifficulty}
            onChange={(e) => setNewDifficulty(e.target.value)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label} ({d.points}pt)
              </option>
            ))}
          </select>
          <select
            className={styles.assigneeSelect}
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
          >
            <option value="">Assign to me</option>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className={styles.addBtn}
            disabled={!newTitle.trim() || adding}
          >
            {adding ? 'Adding...' : 'Add Task'}
          </button>
        </form>

        {/* Filter/sort controls */}
        <div className={styles.controls}>
          <select
            className={styles.filterSelect}
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="all">All Members</option>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="difficulty">By Difficulty</option>
            <option value="urgent">Urgent First</option>
          </select>
        </div>
      </div>

      {/* Kanban columns */}
      <div className={styles.columnsWrapper}>
        <div className={styles.columns}>
          {COLUMNS.map((col) => (
            <div key={col.id} className={styles.column}>
              <div className={styles.columnHeader}>
                <span className={styles.columnTitle}>
                  <span className={`${styles.columnDot} ${styles[col.dotClass]}`} />
                  {col.label}
                </span>
                <span className={styles.columnCount}>
                  {tasksByColumn[col.id].length}
                </span>
              </div>
              <div
                className={`${styles.columnBody} ${
                  dragOverColumn === col.id ? styles.columnBodyDragOver : ''
                }`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {tasksByColumn[col.id].length === 0 ? (
                  <div className={styles.emptyColumn}>Drop tasks here</div>
                ) : (
                  tasksByColumn[col.id].map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      isDragging={draggedId === task._id}
                      isNotesExpanded={expandedNotes.has(task._id)}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onToggleUrgent={() => setUrgent(task._id, !task.urgent)}
                      onToggleNotes={() => toggleNotes(task._id)}
                      onNoteChange={(note) => handleNoteChange(task._id, note)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TaskCard({
  task,
  isDragging,
  isNotesExpanded,
  onDragStart,
  onDragEnd,
  onToggleUrgent,
  onToggleNotes,
  onNoteChange,
}) {
  const [localNote, setLocalNote] = useState(task.note || '')
  const [noteTimeout, setNoteTimeout] = useState(null)

  const handleNoteInput = (e) => {
    const value = e.target.value
    setLocalNote(value)

    // Debounce the save
    if (noteTimeout) clearTimeout(noteTimeout)
    setNoteTimeout(
      setTimeout(() => {
        onNoteChange(value)
      }, 500)
    )
  }

  const isDone = task.status === 'done'

  return (
    <div
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''} ${
        task.urgent ? styles.cardUrgent : ''
      } ${isDone ? styles.cardDone : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, task._id)}
      onDragEnd={onDragEnd}
    >
      {/* Left accent */}
      <div
        className={`${styles.cardAccent} ${
          task.difficulty === 'easy'
            ? styles.cardAccentEasy
            : task.difficulty === 'hard'
              ? styles.cardAccentHard
              : styles.cardAccentMedium
        }`}
      />

      {/* Top row */}
      <div className={styles.cardTop}>
        <span className={styles.cardTitle}>{task.title}</span>
        <div className={styles.cardActions}>
          <button
            type="button"
            className={`${styles.actionBtn} ${task.urgent ? styles.actionBtnActive : ''}`}
            onClick={onToggleUrgent}
            title={task.urgent ? 'Remove urgent flag' : 'Mark as urgent'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={onToggleNotes}
            title="Add note"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className={styles.cardMeta}>
        <span
          className={`${styles.difficultyBadge} ${
            task.difficulty === 'easy'
              ? styles.difficultyEasy
              : task.difficulty === 'hard'
                ? styles.difficultyHard
                : styles.difficultyMedium
          }`}
        >
          {task.difficulty}
        </span>
        <span className={styles.pointsBadge}>
          {POINT_MAP[task.difficulty]} pt{POINT_MAP[task.difficulty] !== 1 ? 's' : ''}
        </span>
        {task.assignee && (
          <div className={styles.assigneeBadge}>
            <div
              className={styles.assigneeAvatar}
              style={{ backgroundColor: colorFromName(task.assignee) }}
            >
              {initials(task.assignee)}
            </div>
            <span className={styles.assigneeName}>{task.assignee}</span>
          </div>
        )}
      </div>

      {/* Notes section */}
      {isNotesExpanded && (
        <div className={styles.cardNotes}>
          <textarea
            className={styles.noteInput}
            placeholder="Add a note..."
            value={localNote}
            onChange={handleNoteInput}
          />
        </div>
      )}

      {/* Display note preview if not expanded but has content */}
      {!isNotesExpanded && task.note && (
        <div className={styles.cardNotes} onClick={onToggleNotes}>
          <p className={styles.noteDisplay}>
            {task.note.length > 80 ? `${task.note.slice(0, 80)}...` : task.note}
          </p>
        </div>
      )}
    </div>
  )
}
