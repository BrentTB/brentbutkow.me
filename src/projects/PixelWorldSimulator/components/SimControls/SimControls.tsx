import { BRUSH_RADIUS, SIM_SPEEDS } from '../../data'
import styles from './SimControls.module.scss'

type SimControlsProps = {
  isPaused: boolean
  speed: number
  radius: number
  onTogglePause(): void
  onSpeed(rate: number): void
  onStep(): void
  onClear(): void
  onRadius(radius: number): void
}

export function SimControls({
  isPaused,
  speed,
  radius,
  onTogglePause,
  onSpeed,
  onStep,
  onClear,
  onRadius,
}: SimControlsProps) {
  const brushCells = radius * 2 + 1

  return (
    <div className={styles.controls}>
      <div className={styles.transport}>
        <button
          type="button"
          className={styles.play}
          aria-label={isPaused ? 'Play' : 'Pause'}
          onClick={onTogglePause}
        >
          {isPaused ? <PlayIcon /> : <PauseIcon />}
        </button>

        <button
          type="button"
          className={styles.button}
          onClick={onStep}
          disabled={!isPaused}
          aria-label="Step one frame"
        >
          <StepIcon />
        </button>

        <div className={styles.speeds} role="group" aria-label="Speed">
          {SIM_SPEEDS.map(({ label, rate }) => (
            <button
              key={label}
              type="button"
              className={styles.speed}
              aria-pressed={speed === rate}
              onClick={() => onSpeed(rate)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className={styles.slider}>
        Brush
        <input
          type="range"
          min={BRUSH_RADIUS.min}
          max={BRUSH_RADIUS.max}
          value={radius}
          onChange={(event) => onRadius(Number(event.target.value))}
        />
        <span className={styles.readout}>
          {brushCells} {brushCells === 1 ? 'cell' : 'cells'}
        </span>
      </label>

      {/* Off on its own at the far end: it throws the world away, and against the transport a miss while
          reaching for a speed costs you everything you had drawn. */}
      <button type="button" className={`${styles.button} ${styles.clear}`} onClick={onClear}>
        Clear
      </button>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="M3 1.5 10 6 3 10.5Z" fill="currentColor" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
      <rect x="3" y="1.5" width="2.5" height="9" fill="currentColor" />
      <rect x="6.5" y="1.5" width="2.5" height="9" fill="currentColor" />
    </svg>
  )
}

function StepIcon() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="M2 1.5 8 6 2 10.5Z" fill="currentColor" />
      <rect x="9" y="1.5" width="1.6" height="9" fill="currentColor" />
    </svg>
  )
}
