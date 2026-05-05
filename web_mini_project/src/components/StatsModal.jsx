import { useMemo } from 'react'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { pointsPerHour } from '../lib/sparkline.js'
import modalStyles from './Modal.module.css'
import styles from './StatsModal.module.css'

const POINT_MAP = { easy: 1, medium: 2, hard: 3 }

export default function StatsModal({ onClose }) {
  const { workspace, name } = useWorkspace()

  // Calculate stats for current user
  const stats = useMemo(() => {
    if (!workspace) return null

    let totalPoints = 0
    let tasksCompleted = 0
    let longestStreak = 0
    const history = []

    workspace.tasks.forEach((task) => {
      if (task.status === 'done' && task.completedBy === name) {
        const pts = task.pointsAwarded || POINT_MAP[task.difficulty] || 0
        totalPoints += pts
        tasksCompleted += 1

        if (task.completedAt) {
          history.push({ time: task.completedAt, points: totalPoints })
        }
      }
    })

    // Get streak from workspace.streaks
    if (workspace.streaks && workspace.streaks[name]) {
      longestStreak = workspace.streaks[name]
    }

    // Calculate rank
    const playerPoints = {}
    workspace.tasks.forEach((task) => {
      if (task.status === 'done' && task.completedBy) {
        const pts = task.pointsAwarded || POINT_MAP[task.difficulty] || 0
        playerPoints[task.completedBy] = (playerPoints[task.completedBy] || 0) + pts
      }
    })

    const sortedPlayers = Object.entries(playerPoints)
      .sort((a, b) => b[1] - a[1])
      .map(([n]) => n)

    const currentRank = sortedPlayers.indexOf(name) + 1 || '-'

    // Points per hour for chart
    const pph = pointsPerHour(history, 6)

    return { totalPoints, tasksCompleted, longestStreak, currentRank, pointsPerHour: pph }
  }, [workspace, name])

  if (!stats) return null

  const maxPPH = Math.max(...stats.pointsPerHour, 1)
  const hours = ['5h ago', '4h ago', '3h ago', '2h ago', '1h ago', 'Now']

  return (
    <div className={modalStyles.overlay} onClick={onClose}>
      <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={modalStyles.header}>
          <h2 className={modalStyles.title}>MY STATS</h2>
          <button type="button" className={modalStyles.closeBtn} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={modalStyles.body}>
          {/* Stats grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.statValueAmber}`}>
                {stats.totalPoints}
              </div>
              <div className={styles.statLabel}>Total Points</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.statValueGreen}`}>
                {stats.tasksCompleted}
              </div>
              <div className={styles.statLabel}>Tasks Done</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.statValueAmber}`}>
                {stats.longestStreak}x
              </div>
              <div className={styles.statLabel}>Best Streak</div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statValue} ${styles.statValueTeal}`}>
                #{stats.currentRank}
              </div>
              <div className={styles.statLabel}>Current Rank</div>
            </div>
          </div>

          {/* Points per hour chart */}
          <div className={styles.chartSection}>
            <h3 className={styles.chartTitle}>Points Per Hour</h3>
            <div className={styles.chart}>
              {stats.pointsPerHour.map((val, i) => (
                <div
                  key={i}
                  className={styles.bar}
                  style={{ height: `${(val / maxPPH) * 100}%` }}
                >
                  {val > 0 && <span className={styles.barValue}>{val}</span>}
                </div>
              ))}
            </div>
            <div className={styles.chartLabels}>
              {hours.map((h, i) => (
                <span key={i} className={styles.chartLabel}>
                  {h}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
