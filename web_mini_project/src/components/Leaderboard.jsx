import { useMemo, useEffect, useRef, useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { initials, colorFromName } from '../lib/avatar.js'
import { sparklinePath, pointsPerHour } from '../lib/sparkline.js'
import styles from './Leaderboard.module.css'

const POINT_MAP = { easy: 1, medium: 2, hard: 3 }

export default function Leaderboard() {
  const { workspace, clutch } = useWorkspace()
  const [animatingPoints, setAnimatingPoints] = useState({})
  const prevPoints = useRef({})

  // Calculate leaderboard from tasks
  const rankings = useMemo(() => {
    if (!workspace) return []

    const players = {}

    workspace.tasks.forEach((task) => {
      if (task.status === 'done' && task.completedBy) {
        const name = task.completedBy
        if (!players[name]) {
          players[name] = { name, points: 0, streak: 0, tasks: 0, history: [] }
        }
        const pts = task.pointsAwarded || POINT_MAP[task.difficulty] || 0
        players[name].points += pts
        players[name].tasks += 1

        // Build point history for sparkline
        if (task.completedAt) {
          players[name].history.push({
            time: task.completedAt,
            points: players[name].points,
          })
        }
      }
    })

    // Get streaks from workspace.streaks
    if (workspace.streaks) {
      Object.entries(workspace.streaks).forEach(([name, streak]) => {
        if (players[name]) {
          players[name].streak = streak
        }
      })
    }

    return Object.values(players)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)
  }, [workspace])

  // Detect point changes for animation
  useEffect(() => {
    const newAnimating = {}
    rankings.forEach((player) => {
      const prev = prevPoints.current[player.name] || 0
      if (player.points > prev) {
        newAnimating[player.name] = true
      }
    })

    if (Object.keys(newAnimating).length > 0) {
      setAnimatingPoints(newAnimating)
      setTimeout(() => setAnimatingPoints({}), 300)
    }

    // Update previous points
    const next = {}
    rankings.forEach((p) => {
      next[p.name] = p.points
    })
    prevPoints.current = next
  }, [rankings])

  if (!workspace) return null

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.title}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0012 0V2Z" />
          </svg>
          Leaderboard
        </span>
        <div className={styles.liveIndicator}>
          <span className={styles.liveDot} />
          LIVE
        </div>
      </div>

      {/* Rankings */}
      {rankings.length === 0 ? (
        <div className={styles.empty}>
          Complete tasks to appear on the leaderboard
        </div>
      ) : (
        <div className={styles.list}>
          {rankings.map((player, idx) => {
            const rank = idx + 1
            const sparkData = pointsPerHour(player.history, 6)
            const path = sparklinePath(sparkData, 50, 16)

            return (
              <div
                key={player.name}
                className={`${styles.row} ${
                  rank === 1
                    ? styles.rowFirst
                    : rank === 2
                      ? styles.rowSecond
                      : rank === 3
                        ? styles.rowThird
                        : ''
                }`}
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
                <div className={styles.playerInfo}>
                  <span className={styles.playerName}>{player.name}</span>
                  <div className={styles.playerMeta}>
                    {player.streak > 1 && (
                      <span className={styles.streak}>
                        <span className={styles.streakIcon}>🔥</span>
                        {player.streak}x
                      </span>
                    )}
                  </div>
                </div>
                {path && (
                  <svg className={styles.sparkline} viewBox="0 0 50 16">
                    <path className={styles.sparklinePath} d={path} />
                  </svg>
                )}
                <div className={styles.pointsSection}>
                  <span
                    className={`${styles.points} ${
                      animatingPoints[player.name] ? styles.pointsAnimating : ''
                    }`}
                  >
                    {player.points}
                  </span>
                  <span className={styles.pointsLabel}>pts</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Clutch Player */}
      {clutch && (
        <div className={styles.clutchSection}>
          <div className={styles.clutchHeader}>
            <span className={styles.clutchIcon}>⚡</span>
            <span className={styles.clutchTitle}>Clutch Player</span>
          </div>
          <div className={styles.clutchPlayer}>
            <div
              className={styles.clutchAvatar}
              style={{ backgroundColor: colorFromName(clutch.name) }}
            >
              {initials(clutch.name)}
            </div>
            <div className={styles.clutchInfo}>
              <span className={styles.clutchName}>{clutch.name}</span>
              <span className={styles.clutchReason}>{clutch.reason}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
