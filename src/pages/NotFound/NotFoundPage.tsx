import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import styles from './NotFoundPage.module.scss'
import { useFunMode } from '../../contexts/useFunMode'
import { useParticleField } from './useParticleField'

const DEFAULT_SPRING = 0.1
const DEFAULT_DAMPING = 0.9

const PRESETS = [
  { label: 'Normal', spring: DEFAULT_SPRING, damping: DEFAULT_DAMPING },
  { label: 'Fly away', spring: 0, damping: 0.99 },
  { label: 'Bounce forever', spring: 0.5, damping: 1 },
]

export function NotFoundPage() {
  const { isFunMode } = useFunMode()
  const { pathname } = useLocation()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [spring, setSpring] = useState(DEFAULT_SPRING)
  const [damping, setDamping] = useState(DEFAULT_DAMPING)

  useParticleField(canvasRef, spring, damping)

  // A preset is "active" when the live values match it — so it also highlights
  // when the sliders are dragged to a preset's exact values.
  const isPresetActive = (preset: (typeof PRESETS)[number]) =>
    Math.abs(spring - preset.spring) < 1e-6 && Math.abs(damping - preset.damping) < 1e-6

  return (
    <main className={styles.main}>
      <div className={styles.content}>
        <p className={styles.shellLine}>
          <span className={styles.prompt}>brent@butkow:~$</span> cd {pathname}
        </p>
        <p className={styles.shellError}>bash: cd: {pathname}: No such file or directory</p>
        <h1>Page not found</h1>
        <p className={styles.description}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className={styles.canvasShell}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            role="img"
            aria-label="404 Error - Animated particle background"
          />
        </div>
        <div className={styles.controlsPanel}>
          <div className={styles.presets}>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={styles.presetButton}
                aria-pressed={isPresetActive(preset)}
                onClick={() => {
                  setSpring(preset.spring)
                  setDamping(preset.damping)
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {/* Raw physics sliders are a Fun-mode-only toy; Professional mode keeps just the presets. */}
          {isFunMode && (
            <>
              <div className={styles.controlGroup}>
                <label htmlFor="spring">Spring</label>
                <input
                  id="spring"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={spring}
                  onChange={(e) => setSpring(Number(e.target.value))}
                  className={styles.slider}
                />
              </div>
              <div className={styles.controlGroup}>
                <label htmlFor="damping">Damping</label>
                <input
                  id="damping"
                  type="range"
                  min="0.8"
                  max="1"
                  step="0.002"
                  value={damping}
                  onChange={(e) => setDamping(Number(e.target.value))}
                  className={styles.slider}
                />
              </div>
            </>
          )}
        </div>
        <Link to="/" className={styles.button}>
          Back to home
        </Link>
      </div>
    </main>
  )
}
