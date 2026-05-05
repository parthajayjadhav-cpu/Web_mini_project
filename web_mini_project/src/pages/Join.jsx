import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { previewCode } from '../lib/codes.js'
import { readSession, writeSession, clearSession } from '../lib/storage.js'
import { useToast } from '../context/ToastContext.jsx'
import styles from './Join.module.css'

const TEMPLATES = [
  {
    id: 'hackathon',
    name: 'Hackathon',
    desc: '24-48h sprint with MVP focus',
    icon: '⚡',
  },
  {
    id: 'college',
    name: 'College Project',
    desc: 'Team assignment with milestones',
    icon: '📚',
  },
  {
    id: 'blank',
    name: 'Blank Canvas',
    desc: 'Start fresh, add your own tasks',
    icon: '✨',
  },
]

export default function Join() {
  const navigate = useNavigate()
  const toast = useToast()

  // Form state
  const [mode, setMode] = useState('join') // 'join' | 'create'
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [template, setTemplate] = useState('hackathon')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Auto-rejoin state
  const [savedSession, setSavedSession] = useState(null)

  // Check for existing session on mount
  useEffect(() => {
    const session = readSession()
    if (session) {
      setSavedSession(session)
      setName(session.name)
    }
  }, [])

  // Generate a preview code when switching to create mode
  useEffect(() => {
    if (mode === 'create' && !code) {
      setCode(previewCode())
    }
  }, [mode, code])

  const handleGenerateCode = () => {
    setCode(previewCode())
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter your name')
      return
    }

    if (mode === 'join' && !code.trim()) {
      setError('Please enter a room code')
      return
    }

    setLoading(true)

    try {
      const payload = {
        name: name.trim(),
        ...(mode === 'create'
          ? { template }
          : { code: code.trim().toUpperCase() }),
      }

      const res = await api.joinOrCreate(payload)
      const workspaceCode = res.workspace.code

      // Save session for auto-rejoin
      writeSession(name.trim(), workspaceCode)

      // Navigate to dashboard
      navigate(`/sprint/${workspaceCode}`)
    } catch (err) {
      if (err.status === 404 || err.code === 'NOT_FOUND') {
        setError('Room not found. Check your code or create a new room.')
      } else {
        setError(err.message || 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRejoin = async () => {
    if (!savedSession) return
    setLoading(true)

    try {
      const res = await api.joinOrCreate({
        name: savedSession.name,
        code: savedSession.workspaceCode,
      })
      navigate(`/sprint/${res.workspace.code}`)
    } catch (err) {
      // Session invalid, clear it
      clearSession()
      setSavedSession(null)
      toast.error('Previous session expired')
    } finally {
      setLoading(false)
    }
  }

  const handleDismissRejoin = () => {
    clearSession()
    setSavedSession(null)
  }

  return (
    <div className={styles.container}>
      {/* Left decorative panel */}
      <div className={styles.leftPanel}>
        <span className={styles.watermark}>SPRINT BOARD</span>
        <div className={styles.ghostLeaderboard}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={styles.ghostRow}>
              <span className={styles.ghostRank}>{i}</span>
              <div className={styles.ghostAvatar} />
              <div className={styles.ghostBar} />
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className={styles.rightPanel}>
        {/* Logo mark */}
        <div className={styles.logoMark}>
          <div className={styles.logoSquares}>
            <div className={styles.logoSquare} />
            <div className={styles.logoSquare} />
          </div>
          <span className={styles.logoText}>SPRINTBOARD</span>
        </div>

        {/* Tab toggle */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${mode === 'join' ? styles.tabActive : ''}`}
            onClick={() => setMode('join')}
          >
            Join Existing
          </button>
          <button
            type="button"
            className={`${styles.tab} ${mode === 'create' ? styles.tabActive : ''}`}
            onClick={() => setMode('create')}
          >
            Create New
          </button>
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Name input */}
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="name">
              Call Sign
            </label>
            <input
              id="name"
              type="text"
              className={styles.input}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              autoComplete="off"
            />
          </div>

          {/* Code input (join mode) */}
          {mode === 'join' && (
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="code">
                Mission Code
              </label>
              <input
                id="code"
                type="text"
                className={`${styles.input} ${error && error.includes('Room') ? styles.inputError : ''}`}
                placeholder="Enter 5-letter code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase())
                  setError('')
                }}
                maxLength={8}
                autoComplete="off"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}
              />
            </div>
          )}

          {/* Code preview + generate (create mode) */}
          {mode === 'create' && (
            <div className={styles.codeRow}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Room Code</label>
                <input
                  type="text"
                  className={styles.input}
                  value={code}
                  readOnly
                  style={{
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.12em',
                    color: 'var(--amber)',
                  }}
                />
              </div>
              <button
                type="button"
                className={styles.generateBtn}
                onClick={handleGenerateCode}
              >
                Generate
              </button>
            </div>
          )}

          {/* Template selection (create mode) */}
          {mode === 'create' && (
            <div className={styles.templateSection}>
              <span className={styles.label}>Template</span>
              <div className={styles.templateGrid}>
                {TEMPLATES.map((t) => (
                  <div
                    key={t.id}
                    className={`${styles.templateCard} ${template === t.id ? styles.templateCardSelected : ''}`}
                    onClick={() => setTemplate(t.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setTemplate(t.id)
                    }}
                  >
                    <span className={styles.templateIcon}>{t.icon}</span>
                    <div className={styles.templateInfo}>
                      <div className={styles.templateName}>{t.name}</div>
                      <div className={styles.templateDesc}>{t.desc}</div>
                    </div>
                    <div className={styles.templateCheck}>
                      <div className={styles.templateCheckInner} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {error && <p className={styles.error}>{error}</p>}

          {/* Submit button */}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? (
              <span className={styles.loading}>
                <span className={styles.spinner} />
                {mode === 'join' ? 'Joining...' : 'Creating...'}
              </span>
            ) : mode === 'join' ? (
              'ENTER SPRINT'
            ) : (
              'START SPRINT'
            )}
          </button>
        </form>

        {/* Auto-rejoin notice */}
        {savedSession && !loading && (
          <div className={styles.rejoinNotice}>
            <p className={styles.rejoinText}>
              Continue as <strong>{savedSession.name}</strong> in room{' '}
              <span className={styles.rejoinCode}>
                {savedSession.workspaceCode}
              </span>
              ?
            </p>
            <div className={styles.rejoinActions}>
              <button
                type="button"
                className={`${styles.rejoinBtn} ${styles.rejoinBtnPrimary}`}
                onClick={handleRejoin}
              >
                Rejoin
              </button>
              <button
                type="button"
                className={`${styles.rejoinBtn} ${styles.rejoinBtnSecondary}`}
                onClick={handleDismissRejoin}
              >
                Start Fresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
