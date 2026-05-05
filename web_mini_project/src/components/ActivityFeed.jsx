import { useMemo } from 'react'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import styles from './ActivityFeed.module.css'

const EVENT_CONFIG = {
  task_done: {
    icon: '✓',
    iconClass: 'iconTaskDone',
    format: (e) => (
      <>
        <strong>{e.actor}</strong> completed <strong>{e.taskTitle}</strong>
        {e.points && <span className={styles.highlight}> +{e.points}pts</span>}
      </>
    ),
  },
  task_added: {
    icon: '+',
    iconClass: 'iconTaskAdded',
    format: (e) => (
      <>
        <strong>{e.actor}</strong> added <strong>{e.taskTitle}</strong>
      </>
    ),
  },
  task_moved: {
    icon: '→',
    iconClass: 'iconDefault',
    format: (e) => (
      <>
        <strong>{e.actor}</strong> moved <strong>{e.taskTitle}</strong> to {e.toStatus}
      </>
    ),
  },
  urgent_flagged: {
    icon: '!',
    iconClass: 'iconUrgent',
    format: (e) => (
      <>
        <strong>{e.actor}</strong> flagged <strong>{e.taskTitle}</strong> as urgent
      </>
    ),
  },
  streak: {
    icon: '🔥',
    iconClass: 'iconStreak',
    format: (e) => (
      <>
        <strong>{e.actor}</strong> hit a <span className={styles.highlight}>{e.streak}-task streak!</span>
      </>
    ),
  },
  rank_change: {
    icon: '↑',
    iconClass: 'iconRankChange',
    format: (e) => (
      <>
        <strong>{e.actor}</strong> moved to <span className={styles.highlight}>#{e.newRank}</span>
      </>
    ),
  },
  clutch: {
    icon: '⚡',
    iconClass: 'iconClutch',
    format: (e) => (
      <>
        <strong>{e.actor}</strong> is now the <span className={styles.highlight}>Clutch Player!</span>
      </>
    ),
  },
  member_joined: {
    icon: '👋',
    iconClass: 'iconDefault',
    format: (e) => (
      <>
        <strong>{e.actor}</strong> joined the sprint
      </>
    ),
  },
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr)
  const now = Date.now()
  const diff = now - date.getTime()

  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ActivityFeed() {
  const { workspace } = useWorkspace()

  // Get activity log, reversed for newest first
  const activities = useMemo(() => {
    if (!workspace?.activityLog) return []
    return [...workspace.activityLog].reverse().slice(0, 50)
  }, [workspace])

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          Sprint Log
        </span>
      </div>

      {/* Activity list */}
      {activities.length === 0 ? (
        <div className={styles.empty}>No activity yet</div>
      ) : (
        <div className={styles.list}>
          {activities.map((event, idx) => {
            const config = EVENT_CONFIG[event.type] || {
              icon: '•',
              iconClass: 'iconDefault',
              format: () => event.type,
            }

            return (
              <div key={event._id || idx} className={styles.item}>
                <div className={`${styles.iconWrap} ${styles[config.iconClass]}`}>
                  {config.icon}
                </div>
                <div className={styles.content}>
                  <p className={styles.message}>{config.format(event)}</p>
                  <span className={styles.time}>{formatTimeAgo(event.timestamp)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
