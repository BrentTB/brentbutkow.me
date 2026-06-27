import { useEffect, useRef, useState } from 'react'
import { baseOptions, formatBytes } from '../../data'
import { PayloadKind } from '../../engine/payload'
import { useDecoder } from '../../useDecoder'
import { ImageDropper } from '../ImageDropper/ImageDropper'
import { PasswordInput } from '../PasswordInput/PasswordInput'
import { PanelError } from '../PanelError/PanelError'
import styles from './DecodePanel.module.scss'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif']

function isImageName(name: string | null): boolean {
  const extension = name?.split('.').pop()?.toLowerCase()
  return extension !== undefined && IMAGE_EXTENSIONS.includes(extension)
}

// Transient state of the copy-to-clipboard button.
const CopyStatus = { idle: 'idle', copied: 'copied', failed: 'failed' } as const
type CopyStatus = (typeof CopyStatus)[keyof typeof CopyStatus]

const copyLabels: Record<CopyStatus, string> = {
  idle: 'Copy',
  copied: 'Copied',
  failed: 'Copy failed',
}

export function DecodePanel() {
  const dec = useDecoder()
  const decoded = dec.decoded
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(CopyStatus.idle)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => () => window.clearTimeout(copyTimer.current ?? undefined), [])

  const baseLabel = decoded
    ? baseOptions.find((option) => option.value === decoded.base)?.label
    : null

  // The clipboard API is missing in insecure contexts and can reject, so the
  // button reports failure rather than going dead — the message stays selectable.
  const copyMessage = async () => {
    const text = decoded?.text
    if (!text) return
    window.clearTimeout(copyTimer.current ?? undefined)
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(text)
      setCopyStatus(CopyStatus.copied)
    } catch {
      setCopyStatus(CopyStatus.failed)
    }
    copyTimer.current = window.setTimeout(() => setCopyStatus(CopyStatus.idle), 1500)
  }

  const badges = (
    <>
      {decoded?.encrypted && <span className={styles.badge}>encrypted</span>}
      {baseLabel && <span className={styles.badge}>{baseLabel.toLowerCase()}</span>}
    </>
  )

  return (
    <div className={styles.panel}>
      <ImageDropper
        label="Add an image to read"
        hint="Drag in a PNG made here, or click to choose"
        previewUrl={dec.source?.previewUrl ?? null}
        busy={dec.busy}
        onFile={dec.loadImage}
      />

      {dec.error && <PanelError message={dec.error} />}

      {decoded?.needsKey && (
        <div className={styles.locked}>
          <p className={styles.lockedTitle}>
            <span aria-hidden="true">🔒</span> This image is locked
          </p>
          <p className={styles.lockedNote}>
            Enter the key it was sealed with to read what's inside.
          </p>
          <div className={styles.keyRow}>
            <div className={styles.keyInputWrap}>
              <PasswordInput
                value={dec.passphrase}
                placeholder="Secret key"
                noun="key"
                onChange={dec.setPassphrase}
                onEnter={dec.submitKey}
              />
            </div>
            <button
              type="button"
              className={styles.primary}
              onClick={dec.submitKey}
              disabled={dec.busy || dec.passphrase.length === 0}
            >
              {dec.busy ? 'Unlocking…' : 'Unlock'}
            </button>
          </div>
        </div>
      )}

      {decoded?.kind === PayloadKind.text && (
        <div className={styles.reveal}>
          <div className={styles.revealHead}>
            <span className={styles.revealTitle}>
              <span aria-hidden="true">🔓</span> Hidden message
            </span>
            <span className={styles.revealMeta}>
              {badges}
              <button type="button" className={styles.copyBtn} onClick={copyMessage}>
                {copyLabels[copyStatus]}
              </button>
            </span>
          </div>
          <p className={styles.message}>{decoded.text}</p>
        </div>
      )}

      {decoded?.kind === PayloadKind.file && (
        <div className={styles.reveal}>
          <div className={styles.revealHead}>
            <span className={styles.revealTitle}>
              <span aria-hidden="true">🔓</span> Hidden file
            </span>
            <span className={styles.revealMeta}>{badges}</span>
          </div>

          {decoded.fileUrl && isImageName(decoded.fileName) && (
            <img
              src={decoded.fileUrl}
              alt={decoded.fileName ?? ''}
              className={styles.filePreview}
            />
          )}

          <div className={styles.fileRow}>
            <span className={styles.fileMeta}>
              <span className={styles.fileName}>{decoded.fileName}</span>
              <span className={styles.fileSize}>{formatBytes(decoded.fileSize ?? 0)}</span>
            </span>
            <button type="button" className={styles.primary} onClick={dec.downloadFile}>
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
