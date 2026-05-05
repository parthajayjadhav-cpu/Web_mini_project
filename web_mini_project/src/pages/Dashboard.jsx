import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { WorkspaceProvider, useWorkspace } from '../context/WorkspaceContext.jsx'
import { readSession } from '../lib/storage.js'
import Sidebar from '../components/Sidebar.jsx'
import TaskBoard from '../components/TaskBoard.jsx'
import Leaderboard from '../components/Leaderboard.jsx'
import ActivityFeed from '../components/ActivityFeed.jsx'
import MobileNav from '../components/MobileNav.jsx'
import StatsModal from '../components/StatsModal.jsx'
import SettingsModal from '../components/SettingsModal.jsx'
import SprintOverModal from '../components/SprintOverModal.jsx'
import styles from './Dashboard.module.css'

function DashboardContent() {
  const { workspace, loading, error, sprintOver } = useWorkspace()
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('tasks')
  const [showStats, setShowStats] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>LOADING SPRINT...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>
          {error.status === 404
            ? 'Sprint not found. It may have expired or the code is incorrect.'
            : 'Failed to load sprint. Please try again.'}
        </p>
        <button
          type="button"
          className={styles.errorBtn}
          onClick={() => navigate('/')}
        >
          Return Home
        </button>
      </div>
    )
  }

  if (!workspace) return null

  return (
    <div className={styles.container}>
      {/* Sidebar (hidden on mobile) */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenStats={() => setShowStats(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.contentGrid}>
          {/* Task board area */}
          <div className={styles.boardArea}>
            <TaskBoard />
          </div>

          {/* Right panels */}
          <div className={styles.rightPanels}>
            <Leaderboard />
            <ActivityFeed />
          </div>
        </div>

        {/* Mobile nav spacer */}
        <div className={styles.mobileNavSpacer} />
      </main>

      {/* Mobile bottom nav */}
      <MobileNav
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenStats={() => setShowStats(true)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Modals */}
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {sprintOver && <SprintOverModal />}
    </div>
  )
}

export default function Dashboard() {
  const { code } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  // Try to get name from location state (passed from Join) or from stored session
  const session = readSession()
  const name = location.state?.name || session?.name

  // If no name, redirect to join page
  if (!name) {
    // Allow the user to join via the join page with this code
    navigate('/', { state: { redirectCode: code } })
    return null
  }

  return (
    <WorkspaceProvider code={code} name={name}>
      <DashboardContent />
    </WorkspaceProvider>
  )
}
