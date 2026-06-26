import { DecodedInfo, SourceInfo } from '../../useImageEncoder'
import { baseOptions } from '../../data'
import { ImageDropper } from '../ImageDropper/ImageDropper'
import styles from './DecodePanel.module.scss'

interface DecodePanelProps {
  source: SourceInfo | null
  decoded: DecodedInfo | null
  passphrase: string
  busy: boolean
  error: string | null
  onFile: (file: File) => void
  onPassphrase: (value: string) => void
  onSubmitKey: () => void
}

export function DecodePanel({
  source,
  decoded,
  passphrase,
  busy,
  error,
  onFile,
  onPassphrase,
  onSubmitKey,
}: DecodePanelProps) {
  const baseLabel = decoded
    ? baseOptions.find((option) => option.value === decoded.base)?.label
    : null

  return (
    <div className={styles.panel}>
      <ImageDropper
        label="Add an image to read"
        hint="Drag in a PNG made here, or click to choose"
        previewUrl={source?.previewUrl ?? null}
        busy={busy}
        onFile={onFile}
      />

      {error && <p className={styles.error}>{error}</p>}

      {decoded?.needsKey && (
        <div className={styles.locked}>
          <p className={styles.lockedTitle}>
            <span aria-hidden="true">🔒</span> This image is locked
          </p>
          <p className={styles.lockedNote}>Enter the key it was sealed with to read the message.</p>
          <div className={styles.keyRow}>
            <input
              type="password"
              className={styles.keyInput}
              value={passphrase}
              placeholder="Secret key"
              autoComplete="off"
              onChange={(event) => onPassphrase(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && onSubmitKey()}
            />
            <button
              type="button"
              className={styles.primary}
              onClick={onSubmitKey}
              disabled={busy || passphrase.length === 0}
            >
              {busy ? 'Unlocking…' : 'Unlock'}
            </button>
          </div>
        </div>
      )}

      {decoded?.text !== null && decoded?.text !== undefined && (
        <div className={styles.reveal}>
          <div className={styles.revealHead}>
            <span className={styles.revealTitle}>
              <span aria-hidden="true">🔓</span> Hidden message
            </span>
            <span className={styles.badges}>
              {decoded.encrypted && <span className={styles.badge}>encrypted</span>}
              {baseLabel && <span className={styles.badge}>{baseLabel.toLowerCase()}</span>}
            </span>
          </div>
          <p className={styles.message}>{decoded.text}</p>
        </div>
      )}
    </div>
  )
}
