import { useState } from 'react'
import { BackgroundMode, ColorMode, RenderMode, SourceKind } from '../../ascii-art.types'
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
  isRecording: boolean
  canRecord: boolean
  onColorMode: (mode: ColorMode) => void
  onBackground: (background: BackgroundMode) => void
  onRenderMode: (mode: RenderMode) => void
  onCharset: (charset: CharsetSelection) => void
  onCustomRamp: (ramp: string) => void
  onRows: (rows: number) => void
  onInvert: (invert: boolean) => void
  onBrightness: (brightness: number) => void
  onContrast: (contrast: number) => void
  onMirror: (mirror: boolean) => void
  onSaveImage: () => void
  onCopyText: () => Promise<boolean>
  onDownloadText: () => void
  onToggleRecording: () => void
}

const charsetNames = Object.keys(Charset) as CharsetName[]
const charsetOptions: SelectOption[] = [
  ...charsetNames.map((name) => ({ value: name, label: name })),
  { value: CUSTOM_CHARSET, label: 'custom' },
]

export function Controls({
  options,
  sourceKind,
  isRecording,
  canRecord,
  onColorMode,
  onBackground,
  onRenderMode,
  onCharset,
  onCustomRamp,
  onRows,
  onInvert,
  onBrightness,
  onContrast,
  onMirror,
  onSaveImage,
  onCopyText,
  onDownloadText,
  onToggleRecording,
}: ControlsProps) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    if (await onCopyText()) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }
  }

  const isCustomRamp = options.charset === CUSTOM_CHARSET
  // Edges use fixed line glyphs and are magnitude-based, so charset + invert don't apply.
  const edgesMode = options.renderMode === RenderMode.edges

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <span className={styles.sectionLabel}>Look</span>
        <div className={styles.sectionBody}>
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

          <div className={styles.group}>
            <span className={styles.label}>Style</span>
            <div className={styles.segmented}>
              <button
                type="button"
                className={options.renderMode === RenderMode.normal ? styles.active : ''}
                onClick={() => onRenderMode(RenderMode.normal)}
              >
                Normal
              </button>
              <button
                type="button"
                className={options.renderMode === RenderMode.edges ? styles.active : ''}
                onClick={() => onRenderMode(RenderMode.edges)}
              >
                Edges
              </button>
            </div>
          </div>

          <label
            className={`${styles.group} ${styles.checkbox} ${edgesMode ? styles.disabledGroup : ''}`}
          >
            <input
              type="checkbox"
              checked={options.invert}
              onChange={(e) => onInvert(e.target.checked)}
              disabled={edgesMode}
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
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Detail</span>
        <div className={styles.sectionBody}>
          <label className={styles.group}>
            <span className={styles.label}>Resolution: {options.rows}</span>
            <input
              type="range"
              min={MIN_ROWS}
              max={MAX_ROWS}
              value={options.rows}
              onChange={(e) => onRows(Number(e.target.value))}
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
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Glyphs</span>
        <div className={`${styles.sectionBody} ${edgesMode ? styles.disabledGroup : ''}`}>
          <Select
            value={options.charset}
            options={charsetOptions}
            onChange={(value) => onCharset(value as CharsetSelection)}
            ariaLabel="Charset"
            disabled={edgesMode}
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
              disabled={edgesMode}
            />
          )}
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.sectionLabel}>Export</span>
        <div className={styles.sectionBody}>
          <button type="button" className={styles.actionButton} onClick={onSaveImage}>
            Save image
          </button>
          <button type="button" className={styles.actionButton} onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy text'}
          </button>
          <button type="button" className={styles.actionButton} onClick={onDownloadText}>
            Download .txt
          </button>
          {canRecord && (
            <button
              type="button"
              className={`${styles.actionButton} ${isRecording ? styles.recording : ''}`}
              onClick={onToggleRecording}
            >
              {isRecording ? 'Stop recording' : 'Record video'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
