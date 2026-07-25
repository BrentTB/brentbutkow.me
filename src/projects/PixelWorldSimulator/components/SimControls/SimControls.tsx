import { BRUSH_RADIUS } from '../../data'
import styles from './SimControls.module.scss'

type SimControlsProps = {
  isPaused: boolean
  radius: number
  onTogglePause(): void
  onStep(): void
  onClear(): void
  onRadius(radius: number): void
}

export function SimControls({
  isPaused,
  radius,
  onTogglePause,
  onStep,
  onClear,
  onRadius,
}: SimControlsProps) {
  const brushCells = radius * 2 + 1

  return (
    <div className={styles.controls}>
      <button type="button" className={styles.button} onClick={onTogglePause}>
        {isPaused ? 'Play' : 'Pause'}
      </button>

      <button type="button" className={styles.button} onClick={onStep} disabled={!isPaused}>
        Step
      </button>

      <button type="button" className={styles.button} onClick={onClear}>
        Clear
      </button>

      <label className={styles.slider}>
        Brush
        <input
          type="range"
          min={BRUSH_RADIUS.min}
          max={BRUSH_RADIUS.max}
          value={radius}
          onChange={(event) => onRadius(Number(event.target.value))}
        />
        <span className={styles.readout}>{brushCells} cells</span>
      </label>
    </div>
  )
}
