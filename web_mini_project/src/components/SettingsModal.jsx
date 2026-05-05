import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../context/WorkspaceContext.jsx'
import { clearSession } from '../lib/storage.js'
import modalStyles from './Modal.module.css'

export default function SettingsModal({ onClose }) {
  const { workspace, setSettings } = useWorkspace()
  const navigate = useNavigate()

  const [duration, setDuration] = useState(
    workspace?.sessionDuration ? String(workspace.sessionDuration) : '120'
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const mins = parseInt(duration, 10)
    if (isNaN(mins) || mins < 1 || mins > 1440) return

    setSaving(true)
    await setSettings({ sessionDuration: mins })
    setSaving(false)
    onClose()
  }

  const handleLeave = () => {
    clearSession()
    navigate('/')
  }

  return (
    <div className={modalStyles.overlay} onClick={onClose}>
      <div className={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={modalStyles.header}>
          <h2 className={modalStyles.title}>SETTINGS</h2>
          <button type="button" className={modalStyles.closeBtn} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={modalStyles.body}>
          <div className={modalStyles.formGroup}>
            <label className={modalStyles.label} htmlFor="duration">
              Session Duration (minutes)
            </label>
            <input
              id="duration"
              type="number"
              className={modalStyles.input}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min={1}
              max={1440}
            />
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '20px' }}>
            Changing the duration will reset the timer from the original start time with the new duration.
          </p>
        </div>

        <div className={modalStyles.footer}>
          <button
            type="button"
            className={`${modalStyles.btn} ${modalStyles.btnDanger}`}
            onClick={handleLeave}
          >
            Leave Sprint
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className={`${modalStyles.btn} ${modalStyles.btnSecondary}`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${modalStyles.btn} ${modalStyles.btnPrimary}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
