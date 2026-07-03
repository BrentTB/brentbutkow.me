import { useEffect, useRef, useState } from 'react'
import { Estimate, PDF_FPS_OPTIONS, PDF_MAX_FRAMES } from '../../export/pdf-estimate'
import styles from './PdfExportDialog.module.scss'

type PdfExportDialogProps = {
  clipDuration: number
  estimate: (fps: number, durationSec: number) => Estimate | null
  onConfirm: (fps: number, durationSec: number) => void
  onClose: () => void
}

const MIN_FPS = PDF_FPS_OPTIONS[0]
// Longest clip the frame budget can cover, even at the lowest rate.
const MAX_LENGTH = PDF_MAX_FRAMES / MIN_FPS

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

const formatClock = (secs: number) => {
  if (secs < 60) return Number.isInteger(secs) ? `${secs}s` : `${secs.toFixed(1)}s`
  const mins = Math.floor(secs / 60)
  const rest = Math.round(secs % 60)
  return `${mins}m ${String(rest).padStart(2, '0')}s`
}

export function PdfExportDialog({
  clipDuration,
  estimate,
  onConfirm,
  onClose,
}: PdfExportDialogProps) {
  const maxLength = Math.max(0.5, Math.min(clipDuration || 0.5, MAX_LENGTH))
  const budgetCapped = clipDuration > MAX_LENGTH
  const [length, setLength] = useState(maxLength)
  const [fps, setFps] = useState(12)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // A rate is feasible when it fits the frame budget at the chosen length. The
  // lowest rate always fits (length is capped to MAX_LENGTH); if the picked rate
  // exceeds the budget, use the fastest one that fits.
  const feasible = PDF_FPS_OPTIONS.filter((option) => option * length <= PDF_MAX_FRAMES)
  const activeFps = feasible.includes(fps) ? fps : Math.max(...feasible)

  const est = estimate(activeFps, length)

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      // Close only on clicks that start on the backdrop itself, not inside the panel.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-export-title"
      >
        <h2 id="pdf-export-title" className={styles.title}>
          Export ASCII PDF
        </h2>
        <p className={styles.hint}>
          A shorter clip lets you keep a higher frame rate; both grow the file.
        </p>

        <label className={styles.field}>
          <span className={styles.label}>Length: {formatClock(length)}</span>
          <input
            type="range"
            min={0.5}
            max={maxLength}
            step={0.5}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
          />
          {budgetCapped && (
            <span className={styles.sub}>
              Capped at {formatClock(maxLength)} by the frame budget.
            </span>
          )}
        </label>

        <div className={styles.field}>
          <span className={styles.label}>Frame rate</span>
          <div className={styles.segmented}>
            {PDF_FPS_OPTIONS.map((option) => {
              const disabled = !feasible.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  disabled={disabled}
                  className={activeFps === option ? styles.active : ''}
                  onClick={() => setFps(option)}
                  title={disabled ? 'Shorten the clip to use this rate' : undefined}
                >
                  {option} fps
                </button>
              )
            })}
          </div>
          {feasible.length < PDF_FPS_OPTIONS.length && (
            <span className={styles.sub}>Higher rates need a shorter clip.</span>
          )}
        </div>

        <dl className={styles.estimate}>
          <div>
            <dt>Frames</dt>
            <dd>{est ? est.frames : '—'}</dd>
          </div>
          <div>
            <dt>Est. size</dt>
            <dd>{est ? `~${formatBytes(est.bytes)}` : '—'}</dd>
          </div>
          <div>
            <dt>Est. encode</dt>
            <dd>{est ? `~${formatClock(Math.round(est.encodeMs / 1000))}` : '—'}</dd>
          </div>
        </dl>

        <p className={styles.note}>NB: Best viewed in Chrome. Other PDF viewers may not animate.</p>

        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={styles.primary}
            onClick={() => onConfirm(activeFps, length)}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  )
}
