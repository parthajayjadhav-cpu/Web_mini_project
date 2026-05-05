import styles from './Toast.module.css'

export default function ToastStack({ toasts, onDismiss }) {
  return (
    <div className={styles.stack} aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${styles.toast} ${styles[t.variant] || styles.info}`}
          role="status"
          onClick={() => onDismiss(t.id)}
        >
          <span className={styles.bar} aria-hidden="true" />
          <span className={styles.message}>{t.message}</span>
        </div>
      ))}
    </div>
  )
}
