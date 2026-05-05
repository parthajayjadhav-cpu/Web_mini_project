import { useMemo } from 'react'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { initials, colorFromName } from '../lib/avatar.js'
import modalStyles from './Modal.module.css'
import styles from './SprintOverModal.module.css'

const POINT_MAP = { easy: 1, medium: 2, hard: 3 }

export default function SprintOverModal() {
  const { workspace, startNewSprint, exportSummary } = useWorkspace()

  // Calculate final rankings
  const rankings = useMemo(() => {
    if (!workspace) return []

    const players = {}
    workspace.tasks.forEach((task) => {
      if (task.status === 'done' && task.completedBy) {
        const name = task.completedBy
        if (!players[name]) {
          players[name] = { name, points: 0, tasks: 0 }
        }
        const pts = task.pointsAwarded || POINT_MAP[task.difficulty] || 0
        players[name].points += pts
        players[name].tasks += 1
      }
    })

    return Object.values(players)
      .sort((a, b) => b.points - a.points)
      .slice(0, 5)
  }, [workspace])

  const winner = rankings[0]

  return (
    <div className={modalStyles.overlay}>
      <div className={styles.modal}>
        {/* Confetti */}
        <div className={styles.confetti}>
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className={styles.confettiPiece} />
          ))}
        </div>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.trophy}>🏆</div>
          <h2 className={styles.title}>SPRINT COMPLETE!</h2>
          <p className={styles.subtitle}>
            {winner ? (
              <>
                <strong>{winner.name}</strong> wins with {winner.points} points!
              </>
            ) : (
              'Great effort, team!'
            )}
          </p>
        </div>

        {/* Final leaderboard */}
        {rankings.length > 0 && (
          <div className={styles.leaderboard}>
            <h3 className={styles.leaderboardTitle}>Final Standings</h3>
            <div className={styles.rankings}>
              {rankings.map((player, idx) => {
                const rank = idx + 1
                return (
                  <div
                    key={player.name}
                    className={`${styles.rankRow} ${rank === 1 ? styles.rankRowWinner : ''}`}
                  >
                    <span
                      className={`${styles.rank} ${
                        rank === 1
                          ? styles.rankFirst
                          : rank === 2
                            ? styles.rankSecond
                            : rank === 3
                              ? styles.rankThird
                              : ''
                      }`}
                    >
                      {rank}
                    </span>
                    <div
                      className={styles.avatar}
                      style={{ backgroundColor: colorFromName(player.name) }}
                    >
                      {initials(player.name)}
                    </div>
                    <span className={styles.playerName}>{player.name}</span>
                    <span className={styles.points}>
                      {player.points}
                      <span className={styles.pointsLabel}>pts</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={exportSummary}
          >
            Export Summary
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={startNewSprint}
          >
            Start New Sprint
          </button>
        </div>
      </div>
    </div>
  )
}
