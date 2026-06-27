import { PayloadMode } from '../../image-encoder.types'
import { baseOptions } from '../../data'
import { useEncoder } from '../../useEncoder'
import { ToggleableSection } from '../../../../components/ToggleableSection/ToggleableSection'
import { ImageDropper } from '../ImageDropper/ImageDropper'
import { FilePicker } from '../FilePicker/FilePicker'
import { CapacityMeter } from '../CapacityMeter/CapacityMeter'
import { KeyField } from '../KeyField/KeyField'
import { Segmented, SegmentedOption } from '../Segmented/Segmented'
import { PanelError } from '../PanelError/PanelError'
import styles from './EncodePanel.module.scss'

// Which version of the result the preview shows.
const ViewMode = { result: 'result', changes: 'changes' } as const
type ViewMode = (typeof ViewMode)[keyof typeof ViewMode]

const baseSegments = baseOptions.map((option) => ({ value: option.value, label: option.label }))
const payloadSegments = [
  { value: PayloadMode.text, label: 'Message' },
  { value: PayloadMode.file, label: 'File' },
]
const viewSegments: SegmentedOption<ViewMode>[] = [
  { value: ViewMode.result, label: 'Result' },
  { value: ViewMode.changes, label: 'Changes' },
]

export function EncodePanel() {
  const enc = useEncoder()
  const { suggestedBase, tooBig } = enc.fitHint

  const activeBlurb = baseOptions.find((option) => option.value === enc.base)?.blurb
  const suggestedLabel = baseOptions.find((option) => option.value === suggestedBase)?.label
  const overCapacity = enc.capacity ? !enc.capacity.fits : false
  const hasPayload =
    enc.payloadMode === PayloadMode.file ? enc.secretFile !== null : enc.message.length > 0
  const canEncode =
    !enc.busy &&
    enc.source !== null &&
    hasPayload &&
    !overCapacity &&
    (!enc.useKey || enc.passphrase.length > 0)

  const changedPct =
    enc.encoded && enc.encoded.stats.totalChannels > 0
      ? (enc.encoded.stats.changedChannels / enc.encoded.stats.totalChannels) * 100
      : 0

  // The "Changes" view needs a diff image; without one, fall back to the result.
  const showingDiff = enc.showDiff && enc.diffUrl !== null

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
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Hide</span>
            <Segmented
              ariaLabel="Hide a message or a file"
              options={payloadSegments}
              value={enc.payloadMode}
              onChange={enc.setPayloadMode}
            />
          </div>

          {enc.payloadMode === PayloadMode.text ? (
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
          ) : (
            <div className={styles.field}>
              <span className={styles.fieldLabel}>File</span>
              <FilePicker file={enc.secretFile} onFile={enc.loadSecretFile} />
            </div>
          )}

          <KeyField
            enabled={enc.useKey}
            value={enc.passphrase}
            onToggle={enc.setUseKey}
            onChange={enc.setPassphrase}
          />

          <ToggleableSection title="Settings">
            <div className={styles.settings}>
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

              <label className={styles.switchRow}>
                <input
                  type="checkbox"
                  checked={enc.spread}
                  onChange={(event) => enc.setSpread(event.target.checked)}
                />
                <span className={styles.switchLabel}>Spread the data across the whole image</span>
              </label>
              <p className={styles.blurb}>
                Scatters the change over the whole picture instead of one block. It looks better
                under "Changes", but makes the saved file a good deal bigger.
              </p>
            </div>
          </ToggleableSection>

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

      {enc.error && <PanelError message={enc.error} />}

      {enc.encoded && (
        <div className={styles.result}>
          <div className={styles.resultHead}>
            <h2 className={styles.resultTitle}>Your encoded image</h2>
            {enc.diffUrl && (
              <Segmented
                ariaLabel="Preview mode"
                options={viewSegments}
                value={showingDiff ? ViewMode.changes : ViewMode.result}
                onChange={(value) => enc.setShowDiff(value === ViewMode.changes)}
              />
            )}
          </div>

          <div className={styles.stage}>
            <img
              src={enc.showDiff && enc.diffUrl ? enc.diffUrl : enc.encoded.url}
              alt={
                showingDiff
                  ? 'The original image with changed pixels tinted gold'
                  : 'The encoded image'
              }
              className={styles.preview}
            />
          </div>

          <p className={styles.stats}>
            {enc.encoded.stats.changedPixels.toLocaleString()} pixels carry your data (
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
