import { ChangeEvent } from 'react'
import { BackgroundMode, ColorMode, SourceKind } from '../../ascii-art.types'
import { AsciiOptions, Charset, CharsetName, MAX_ROWS, MIN_ROWS } from '../../data'
import styles from './Controls.module.scss'

type ControlsProps = {
  options: AsciiOptions
  sourceKind: SourceKind
  onColorMode: (mode: ColorMode) => void
  onBackground: (background: BackgroundMode) => void
  onRamp: (ramp: Charset) => void
  onRows: (rows: number) => void
  onInvert: (invert: boolean) => void
  onMirror: (mirror: boolean) => void
}

const charsetNames = Object.keys(Charset) as CharsetName[]

export function Controls({
  options,
  sourceKind,
  onColorMode,
  onBackground,
  onRamp,
  onRows,
  onInvert,
  onMirror,
}: ControlsProps) {
  const handleRows = (e: ChangeEvent<HTMLInputElement>) => onRows(Number(e.target.value))
  const handleRamp = (e: ChangeEvent<HTMLSelectElement>) =>
    onRamp(Charset[e.target.value as CharsetName])

  return (
    <div className={styles.controls}>
      <div className={styles.group}>
        <span className={styles.label}>Color</span>
        <div className={styles.segmented}>
          <button
            type="button"
            className={options.colorMode === ColorMode.grayscale ? styles.active : ''}
            onClick={() => onColorMode(ColorMode.grayscale)}
          >
            Grayscale
          </button>
          <button
            type="button"
            className={options.colorMode === ColorMode.color ? styles.active : ''}
            onClick={() => onColorMode(ColorMode.color)}
          >
            Color
          </button>
        </div>
      </div>

      <div className={styles.group}>
        <span className={styles.label}>Background</span>
        <div className={styles.segmented}>
          <button
            type="button"
            className={options.background === BackgroundMode.dark ? styles.active : ''}
            onClick={() => onBackground(BackgroundMode.dark)}
          >
            Dark
          </button>
          <button
            type="button"
            className={options.background === BackgroundMode.light ? styles.active : ''}
            onClick={() => onBackground(BackgroundMode.light)}
          >
            Light
          </button>
        </div>
      </div>

      <label className={styles.group}>
        <span className={styles.label}>Resolution: {options.rows}</span>
        <input
          type="range"
          min={MIN_ROWS}
          max={MAX_ROWS}
          value={options.rows}
          onChange={handleRows}
        />
      </label>

      <label className={styles.group}>
        <span className={styles.label}>Charset</span>
        <select
          className={styles.select}
          value={charsetNames.find((name) => Charset[name] === options.ramp) ?? 'classic'}
          onChange={handleRamp}
        >
          {charsetNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className={`${styles.group} ${styles.checkbox}`}>
        <input
          type="checkbox"
          checked={options.invert}
          onChange={(e) => onInvert(e.target.checked)}
        />
        <span className={styles.label}>Invert</span>
      </label>

      {sourceKind === SourceKind.webcam && (
        <label className={`${styles.group} ${styles.checkbox}`}>
          <input
            type="checkbox"
            checked={options.mirror}
            onChange={(e) => onMirror(e.target.checked)}
          />
          <span className={styles.label}>Mirror</span>
        </label>
      )}
    </div>
  )
}
