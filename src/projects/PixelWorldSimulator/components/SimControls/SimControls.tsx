import { Preset } from '../../engine/presets'
import { ShareOutcome } from '../../useShareLink'
import { BRUSH_RADIUS, PRESETS, SIM_SPEEDS, simCopy } from '../../data'
import { pluralize } from '../../../../utils/pluralize'
import { Select } from '../../../../components/inputs/Select'
import type { SelectOption } from '../../../../components/inputs/option.types'
import styles from './SimControls.module.scss'

// The trigger sits on its placeholder rather than any one world, so picking a preset always reads as an
// action ("load this") instead of a setting, and reloading the same one stays a click away. New presets
// drop into this list without fighting the other controls for a button's worth of width.
const PRESET_PROMPT = ''
const presetOptions: SelectOption[] = [
  { value: PRESET_PROMPT, label: 'Load a preset…', disabled: true },
  ...PRESETS.map(({ preset, label }) => ({ value: preset, label })),
]

type SimControlsProps = {
  isPaused: boolean
  speed: number
  radius: number
  onTogglePause(): void
  onSpeed(rate: number): void
  onStep(): void
  onClear(): void
  onRadius(radius: number): void
  onLoad(preset: Preset): void
  /** Left out where the browser cannot build a link, rather than shown and broken. */
  canShare: boolean
  /** How the last attempt went, so the control shows it without the reader having to read the line below. */
  shareOutcome: ShareOutcome
  onShare(): void
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
  onLoad,
  canShare,
  shareOutcome,
  onShare,
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

      <Select
        value={PRESET_PROMPT}
        options={presetOptions}
        ariaLabel="Load a preset"
        triggerClassName={styles.presetTrigger}
        onChange={(value) => {
          const chosen = PRESETS.find(({ preset }) => preset === value)
          if (chosen) onLoad(chosen.preset)
        }}
      />

      {canShare && (
        <button
          type="button"
          className={`${styles.button} ${styles.share}`}
          title={simCopy.share.title}
          // Not colour alone: the outcome names itself here and spells itself out in the line under the
          // world, so the green is a shortcut rather than the only way to tell.
          data-outcome={shareOutcome}
          onClick={onShare}
        >
          {simCopy.share.button}
          <span className={styles.mark} aria-hidden="true">
            {shareOutcome === ShareOutcome.copied
              ? '✓'
              : shareOutcome === ShareOutcome.refused
                ? '✕'
                : shareOutcome === ShareOutcome.inBar
                  ? '!'
                  : ''}
          </span>
        </button>
      )}

      <label className={styles.slider}>
        Brush
        <input
          type="range"
          min={BRUSH_RADIUS.min}
          max={BRUSH_RADIUS.max}
          value={radius}
          onChange={(event) => onRadius(Number(event.target.value))}
        />
        <span className={styles.readout}>{pluralize(brushCells, 'cell', 'cells')}</span>
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
