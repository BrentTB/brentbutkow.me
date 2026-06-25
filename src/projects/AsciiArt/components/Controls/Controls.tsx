import { ChangeEvent } from 'react'
import { ColorMode } from '../../ascii-art.types'
import { AsciiOptions, Charset, CharsetName, MAX_COLS, MIN_COLS } from '../../data'
import styles from './Controls.module.scss'

type ControlsProps = {
  options: AsciiOptions
  onColorMode: (mode: ColorMode) => void
  onRamp: (ramp: string) => void
  onCols: (cols: number) => void
  onInvert: (invert: boolean) => void
}

const charsetNames = Object.keys(Charset) as CharsetName[]

export function Controls({ options, onColorMode, onRamp, onCols, onInvert }: ControlsProps) {
  const handleCols = (e: ChangeEvent<HTMLInputElement>) => onCols(Number(e.target.value))
  const handleRamp = (e: ChangeEvent<HTMLSelectElement>) =>
    onRamp(Charset[e.target.value as CharsetName])

  return (
    <div className={styles.controls}>
      <div className={styles.group}>
        <span className={styles.label}>Color</span>
        <div className={styles.segmented}>
          <button
            className={options.colorMode === ColorMode.grayscale ? styles.active : ''}
            onClick={() => onColorMode(ColorMode.grayscale)}
          >
            Grayscale
          </button>
          <button
            className={options.colorMode === ColorMode.color ? styles.active : ''}
            onClick={() => onColorMode(ColorMode.color)}
          >
            Color
          </button>
        </div>
      </div>

      <label className={styles.group}>
        <span className={styles.label}>Resolution: {options.cols}</span>
        <input
          type="range"
          min={MIN_COLS}
          max={MAX_COLS}
          value={options.cols}
          onChange={handleCols}
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
    </div>
  )
}
