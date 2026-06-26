import { baseOptions } from '../../data'
import { useEncoder } from '../../useEncoder'
import { ImageDropper } from '../ImageDropper/ImageDropper'
import { CapacityMeter } from '../CapacityMeter/CapacityMeter'
import { KeyField } from '../KeyField/KeyField'
import { Segmented } from '../Segmented/Segmented'
import styles from './EncodePanel.module.scss'

const baseSegments = baseOptions.map((option) => ({ value: option.value, label: option.label }))
const viewSegments = [
  { value: 'result', label: 'Result' },
  { value: 'changes', label: 'Changes' },
]

export function EncodePanel() {
  const enc = useEncoder()
  const { suggestedBase, tooBig } = enc.fitHint

  const activeBlurb = baseOptions.find((option) => option.value === enc.base)?.blurb
  const suggestedLabel = baseOptions.find((option) => option.value === suggestedBase)?.label
  const overCapacity = enc.capacity ? !enc.capacity.fits : false
  const canEncode =
    !enc.busy &&
    enc.source !== null &&
    enc.message.length > 0 &&
    !overCapacity &&
    (!enc.useKey || enc.passphrase.length > 0)

  const changedPct =
    enc.encoded && enc.encoded.stats.totalChannels > 0
      ? (enc.encoded.stats.changedChannels / enc.encoded.stats.totalChannels) * 100
      : 0

  return (
    <div className={styles.panel}>
      <ImageDropper
        label="Add a cover image"
        hint="Drag a photo here, or click to choose (PNG or JPEG)"
        previewUrl={enc.source?.previewUrl ?? null}
        busy={enc.busy}
        onFile={enc.loadImage}
      />

      {enc.source && (
        <div className={styles.controls}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Message</span>
            <textarea
              className={styles.textarea}
              value={enc.message}
              placeholder="Type the words you want to hide…"
              rows={3}
              onChange={(event) => enc.setMessage(event.target.value)}
            />
          </label>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Density</span>
            <Segmented
              ariaLabel="Encoding density"
              options={baseSegments}
              value={enc.base}
              onChange={enc.setBase}
            />
            {activeBlurb && <p className={styles.blurb}>{activeBlurb}</p>}
          </div>

          <KeyField
            enabled={enc.useKey}
            value={enc.passphrase}
            onToggle={enc.setUseKey}
            onChange={enc.setPassphrase}
          />

          {enc.capacity && (
            <CapacityMeter
              usedBytes={enc.capacity.usedBytes}
              maxBytes={enc.capacity.maxBytes}
              fits={enc.capacity.fits}
            />
          )}

          {overCapacity && suggestedBase && suggestedLabel && (
            <button
              type="button"
              className={styles.swap}
              onClick={() => enc.setBase(suggestedBase)}
            >
              Swap to {suggestedLabel} to fit
            </button>
          )}

          {overCapacity && tooBig && (
            <p className={styles.tooBig}>
              Too big to hide in this image, even at the highest density. Use a larger image or a
              shorter message.
            </p>
          )}

          <button
            type="button"
            className={styles.primary}
            onClick={enc.runEncode}
            disabled={!canEncode}
          >
            {enc.busy ? 'Encoding…' : 'Hide message'}
          </button>
        </div>
      )}

      {enc.error && <p className={styles.error}>{enc.error}</p>}

      {enc.encoded && (
        <div className={styles.result}>
          <div className={styles.resultHead}>
            <h2 className={styles.resultTitle}>Your encoded image</h2>
            <Segmented
              ariaLabel="Preview mode"
              options={viewSegments}
              value={enc.showDiff ? 'changes' : 'result'}
              onChange={(value) => enc.setShowDiff(value === 'changes')}
            />
          </div>

          <div className={styles.stage}>
            <img
              src={(enc.showDiff ? enc.diffUrl : enc.encoded.url) ?? enc.encoded.url}
              alt={
                enc.showDiff
                  ? 'The original image with changed pixels tinted gold'
                  : 'The encoded image'
              }
              className={styles.preview}
            />
          </div>

          <p className={styles.stats}>
            {enc.encoded.stats.changedPixels.toLocaleString()} pixels carry your message (
            {changedPct.toFixed(2)}% of the image).
          </p>

          <button type="button" className={styles.primary} onClick={enc.downloadEncoded}>
            Download PNG
          </button>
        </div>
      )}
    </div>
  )
}
