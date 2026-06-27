import { ChangeEvent } from 'react'
import { BackgroundMode, ColorMode, SourceKind } from '../../ascii-art.types'
import {
  AsciiOptions,
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  CONTRAST_MAX,
  CONTRAST_MIN,
  CUSTOM_CHARSET,
  Charset,
  CharsetName,
  CharsetSelection,
  MAX_ROWS,
  MIN_ROWS,
} from '../../data'
import { Select } from '../../../../components/inputs/Select'
import type { SelectOption } from '../../../../components/inputs/option.types'
import styles from './Controls.module.scss'

type ControlsProps = {
  options: AsciiOptions
  sourceKind: SourceKind
  onColorMode: (mode: ColorMode) => void
  onBackground: (background: BackgroundMode) => void
  onCharset: (charset: CharsetSelection) => void
  onCustomRamp: (ramp: string) => void
  onRows: (rows: number) => void
  onInvert: (invert: boolean) => void
  onBrightness: (brightness: number) => void
  onContrast: (contrast: number) => void
  onMirror: (mirror: boolean) => void
}

const charsetNames = Object.keys(Charset) as CharsetName[]
const charsetOptions: SelectOption[] = [
  ...charsetNames.map((name) => ({ value: name, label: name })),
  { value: CUSTOM_CHARSET, label: 'custom' },
]

export function Controls({
  options,
  sourceKind,
  onColorMode,
  onBackground,
  onCharset,
  onCustomRamp,
  onRows,
  onInvert,
  onBrightness,
  onContrast,
  onMirror,
}: ControlsProps) {
  const handleRows = (e: ChangeEvent<HTMLInputElement>) => onRows(Number(e.target.value))
  const isCustomRamp = options.charset === CUSTOM_CHARSET

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
        <span className={styles.label}>Brightness: {options.brightness}</span>
        <input
          type="range"
          min={BRIGHTNESS_MIN}
          max={BRIGHTNESS_MAX}
          value={options.brightness}
          onChange={(e) => onBrightness(Number(e.target.value))}
        />
      </label>

      <label className={styles.group}>
        <span className={styles.label}>Contrast: {options.contrast.toFixed(2)}</span>
        <input
          type="range"
          min={CONTRAST_MIN}
          max={CONTRAST_MAX}
          step={0.05}
          value={options.contrast}
          onChange={(e) => onContrast(Number(e.target.value))}
        />
      </label>

      <div className={styles.group}>
        <span className={styles.label}>Charset</span>
        <Select
          value={options.charset}
          options={charsetOptions}
          onChange={(value) => onCharset(value as CharsetSelection)}
          ariaLabel="Charset"
        />
        {isCustomRamp && (
          <input
            type="text"
            className={styles.textInput}
            value={options.customRamp}
            onChange={(e) => onCustomRamp(e.target.value)}
            placeholder="dark → light"
            aria-label="Custom ramp"
            spellCheck={false}
          />
        )}
      </div>

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
