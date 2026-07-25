import { Tool } from '../../pixel-world.types'
import { BRUSH_RADIUS } from '../../data'
import styles from './SimControls.module.scss'

type SimControlsProps = {
  isPaused: boolean
  tool: Tool
  radius: number
  onTogglePause(): void
  onStep(): void
  onClear(): void
  onTool(tool: Tool): void
  onRadius(radius: number): void
}

export function SimControls({
  isPaused,
  tool,
  radius,
  onTogglePause,
  onStep,
  onClear,
  onTool,
  onRadius,
}: SimControlsProps) {
  const inspecting = tool === Tool.inspect
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

      <button
        type="button"
        className={styles.button}
        aria-pressed={inspecting}
        onClick={() => onTool(inspecting ? Tool.paint : Tool.inspect)}
      >
        Identify
      </button>

      <label className={styles.slider}>
        Brush
        <input
          type="range"
          min={BRUSH_RADIUS.min}
          max={BRUSH_RADIUS.max}
          value={radius}
          onChange={(event) => onRadius(Number(event.target.value))}
          disabled={inspecting}
        />
        <span className={styles.readout}>{brushCells} cells</span>
      </label>
    </div>
  )
}
