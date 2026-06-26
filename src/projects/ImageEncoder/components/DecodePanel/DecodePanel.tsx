import { useEffect, useRef, useState } from 'react'
import { baseOptions } from '../../data'
import { useDecoder } from '../../useDecoder'
import { ImageDropper } from '../ImageDropper/ImageDropper'
import { PasswordInput } from '../PasswordInput/PasswordInput'
import styles from './DecodePanel.module.scss'

export function DecodePanel() {
  const dec = useDecoder()
  const decoded = dec.decoded
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => () => window.clearTimeout(copyTimer.current ?? undefined), [])

  const baseLabel = decoded
    ? baseOptions.find((option) => option.value === decoded.base)?.label
    : null

  const copyMessage = () => {
    const text = decoded?.text
    if (!text) return
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true)
        window.clearTimeout(copyTimer.current ?? undefined)
        copyTimer.current = window.setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  }

  return (
    <div className={styles.panel}>
      <ImageDropper
        label="Add an image to read"
        hint="Drag in a PNG made here, or click to choose"
        previewUrl={dec.source?.previewUrl ?? null}
        busy={dec.busy}
        onFile={dec.loadImage}
      />

      {dec.error && <p className={styles.error}>{dec.error}</p>}

      {decoded?.needsKey && (
        <div className={styles.locked}>
          <p className={styles.lockedTitle}>
            <span aria-hidden="true">🔒</span> This image is locked
          </p>
          <p className={styles.lockedNote}>Enter the key it was sealed with to read the message.</p>
          <div className={styles.keyRow}>
            <div className={styles.keyInputWrap}>
              <PasswordInput
                value={dec.passphrase}
                placeholder="Secret key"
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

      {decoded?.text !== null && decoded?.text !== undefined && (
        <div className={styles.reveal}>
          <div className={styles.revealHead}>
            <span className={styles.revealTitle}>
              <span aria-hidden="true">🔓</span> Hidden message
            </span>
            <span className={styles.revealMeta}>
              {decoded.encrypted && <span className={styles.badge}>encrypted</span>}
              {baseLabel && <span className={styles.badge}>{baseLabel.toLowerCase()}</span>}
              <button type="button" className={styles.copyBtn} onClick={copyMessage}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </span>
          </div>
          <p className={styles.message}>{decoded.text}</p>
        </div>
      )}
    </div>
  )
}
