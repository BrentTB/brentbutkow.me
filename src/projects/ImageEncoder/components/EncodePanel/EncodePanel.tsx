import { Base } from '../../image-encoder.types'
import { CapacityInfo, EncodedInfo, SourceInfo } from '../../useImageEncoder'
import { baseOptions } from '../../data'
import { ImageDropper } from '../ImageDropper/ImageDropper'
import { CapacityMeter } from '../CapacityMeter/CapacityMeter'
import { KeyField } from '../KeyField/KeyField'
import { Segmented } from '../Segmented/Segmented'
import styles from './EncodePanel.module.scss'

interface EncodePanelProps {
  source: SourceInfo | null
  message: string
  base: Base
  useKey: boolean
  passphrase: string
  capacity: CapacityInfo | null
  encoded: EncodedInfo | null
  diffUrl: string | null
  showDiff: boolean
  busy: boolean
  error: string | null
  onFile: (file: File) => void
  onMessage: (value: string) => void
  onBase: (base: Base) => void
  onToggleKey: (enabled: boolean) => void
  onPassphrase: (value: string) => void
  onEncode: () => void
  onDownload: () => void
  onShowDiff: (show: boolean) => void
}

const baseSegments = baseOptions.map((option) => ({ value: option.value, label: option.label }))
const viewSegments = [
  { value: 'result', label: 'Result' },
  { value: 'changes', label: 'Changes' },
]

export function EncodePanel({
  source,
  message,
  base,
  useKey,
  passphrase,
  capacity,
  encoded,
  diffUrl,
  showDiff,
  busy,
  error,
  onFile,
  onMessage,
  onBase,
  onToggleKey,
  onPassphrase,
  onEncode,
  onDownload,
  onShowDiff,
}: EncodePanelProps) {
  const activeBlurb = baseOptions.find((option) => option.value === base)?.blurb
  const overCapacity = capacity ? !capacity.fits : false
  const canEncode =
    !busy &&
    source !== null &&
    message.length > 0 &&
    !overCapacity &&
    (!useKey || passphrase.length > 0)

  const changedPct =
    encoded && encoded.stats.totalChannels > 0
      ? (encoded.stats.changedChannels / encoded.stats.totalChannels) * 100
      : 0

  return (
    <div className={styles.panel}>
      <ImageDropper
        label="Add a cover image"
        hint="Drag a photo here, or click to choose — PNG or JPEG"
        previewUrl={source?.previewUrl ?? null}
        busy={busy}
        onFile={onFile}
      />

      {source && (
        <div className={styles.controls}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Message</span>
            <textarea
              className={styles.textarea}
              value={message}
              placeholder="Type the words you want to hide…"
              rows={3}
              onChange={(event) => onMessage(event.target.value)}
            />
          </label>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Density</span>
            <Segmented
              ariaLabel="Encoding density"
              options={baseSegments}
              value={base}
              onChange={onBase}
            />
            {activeBlurb && <p className={styles.blurb}>{activeBlurb}</p>}
          </div>

          <KeyField
            enabled={useKey}
            value={passphrase}
            onToggle={onToggleKey}
            onChange={onPassphrase}
          />

          {capacity && (
            <CapacityMeter
              usedBytes={capacity.usedBytes}
              maxBytes={capacity.maxBytes}
              fits={capacity.fits}
            />
          )}

          <button type="button" className={styles.primary} onClick={onEncode} disabled={!canEncode}>
            {busy ? 'Encoding…' : 'Hide message'}
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {encoded && (
        <div className={styles.result}>
          <div className={styles.resultHead}>
            <h2 className={styles.resultTitle}>Your encoded image</h2>
            <Segmented
              ariaLabel="Preview mode"
              options={viewSegments}
              value={showDiff ? 'changes' : 'result'}
              onChange={(value) => onShowDiff(value === 'changes')}
            />
          </div>

          <div className={styles.stage}>
            <img
              src={(showDiff ? diffUrl : encoded.url) ?? encoded.url}
              alt={showDiff ? 'Heatmap of the pixels that changed' : 'The encoded image'}
              className={styles.preview}
            />
          </div>

          <p className={styles.stats}>
            {encoded.stats.changedPixels.toLocaleString()} pixels carry your message —{' '}
            {changedPct.toFixed(2)}% of the image moved.
          </p>

          <button type="button" className={styles.primary} onClick={onDownload}>
            Download PNG
          </button>
        </div>
      )}
    </div>
  )
}
