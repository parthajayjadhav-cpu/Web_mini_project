import { useEffect, useState } from 'react'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { copyToClipboard } from '../lib/copy.js'
import { initials, colorFromName } from '../lib/avatar.js'
import { remainingMs, formatHMS, percentElapsed, timerColor } from '../lib/timer.js'
import styles from './Sidebar.module.css'

export default function Sidebar({ activeView, onViewChange, onOpenSettings, onOpenStats }) {
  const { workspace, code, name } = useWorkspace()
  const toast = useToast()
  const [now, setNow] = useState(Date.now())

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const handleCopyCode = async () => {
    const success = await copyToClipboard(code)
    if (success) toast.copy('Code copied!')
  }

  const handleInvite = async () => {
    const url = `${window.location.origin}/sprint/${code}`
    const success = await copyToClipboard(url)
    if (success) toast.copy('Invite link copied!')
  }

  if (!workspace) return null

  const remaining = remainingMs(workspace, now)
  const elapsed = percentElapsed(workspace, now)
  const color = timerColor(remaining)

  // Get unique members from tasks
  const memberSet = new Set()
  memberSet.add(name) // current user always included
  workspace.tasks.forEach((t) => {
    if (t.assignee) memberSet.add(t.assignee)
    if (t.completedBy) memberSet.add(t.completedBy)
  })
  const members = Array.from(memberSet).slice(0, 5)

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logoSection}>
        <div className={styles.logoSquares}>
          <div className={styles.logoSquare} />
          <div className={styles.logoSquare} />
        </div>
        <span className={styles.logoText}>SPRINTBOARD</span>
      </div>

      {/* Room info */}
      <div className={styles.roomInfo}>
        <span className={styles.roomLabel}>Room Code</span>
        <div className={styles.roomCode}>
          <span className={styles.code}>{code}</span>
          <button
            type="button"
            className={styles.copyBtn}
            onClick={handleCopyCode}
            aria-label="Copy room code"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
        </div>

        {/* Members online */}
        <div className={styles.members}>
          <span className={styles.roomLabel}>Team</span>
          <div className={styles.memberAvatars}>
            {members.map((m) => (
              <div
                key={m}
                className={styles.avatar}
                style={{ backgroundColor: colorFromName(m) }}
                title={m}
              >
                {initials(m)}
              </div>
            ))}
          </div>
          <span className={styles.memberCount}>
            {members.length} member{members.length !== 1 ? 's' : ''} active
          </span>
        </div>
      </div>

      {/* Timer */}
      <div className={styles.timerSection}>
        <span className={styles.roomLabel}>Time Remaining</span>
        <span
          className={`${styles.timerValue} ${
            color === 'teal'
              ? styles.timerTeal
              : color === 'amber'
                ? styles.timerAmber
                : styles.timerRed
          }`}
        >
          {formatHMS(remaining)}
        </span>
        <div className={styles.progressBar}>
          <div
            className={`${styles.progressFill} ${
              color === 'amber'
                ? styles.progressFillAmber
                : color === 'red'
                  ? styles.progressFillRed
                  : ''
            }`}
            style={{ width: `${100 - elapsed}%` }}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <button
          type="button"
          className={`${styles.navLink} ${activeView === 'tasks' ? styles.navLinkActive : ''}`}
          onClick={() => onViewChange('tasks')}
        >
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Tasks
        </button>
        <button
          type="button"
          className={`${styles.navLink} ${activeView === 'stats' ? styles.navLinkActive : ''}`}
          onClick={onOpenStats}
        >
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10" />
            <path d="M12 20V4" />
            <path d="M6 20v-6" />
          </svg>
          My Stats
        </button>
        <button
          type="button"
          className={`${styles.navLink} ${activeView === 'log' ? styles.navLinkActive : ''}`}
          onClick={() => onViewChange('log')}
        >
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          Sprint Log
        </button>
        <button
          type="button"
          className={styles.navLink}
          onClick={onOpenSettings}
        >
          <svg className={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h.09a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.09a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Settings
        </button>
      </nav>

      <div className={styles.spacer} />

      {/* Invite button */}
      <button type="button" className={styles.inviteBtn} onClick={handleInvite}>
        <svg className={styles.inviteIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
        Invite teammates
      </button>
    </aside>
  )
}
