import { useCallback } from 'react'
import { useTypewriter } from '../useTypewriter'
import { takeQueuedEyebrowText } from '../eyebrow-queue'
import styles from './Eyebrow.module.scss'

type EyebrowProps = {
  label: string
  /** Quieter variant for secondary rails (e.g. the Currently row). */
  muted?: boolean
  /** Types the path out character by character with a terminal caret — the hero's load moment. */
  typed?: boolean
  /** Other identities the typed eyebrow cycles through, returning to `label` between each. */
  alternates?: string[]
}

function toPath(label: string): string {
  return `~/${label.toLowerCase().replace(/\s+/g, '-')}`
}

/** Section label as a terminal path: "About" → `~/about`. */
export function Eyebrow({ label, muted, typed, alternates }: EyebrowProps) {
  // Terminal-written lines (`echo [text] > .eyebrow`) jump the rotation queue, path-styled.
  const nextOverride = useCallback(() => {
    const queued = takeQueuedEyebrowText()
    return queued ? toPath(queued) : null
  }, [])

  const typedText = useTypewriter(toPath(label), {
    alternates: (alternates ?? []).map(toPath),
    randomizeOrder: true,
    nextOverride,
    enabled: typed === true,
  })

  return (
    <span className={`${styles.eyebrow} ${muted ? styles.muted : ''}`} aria-label={label}>
      <span aria-hidden="true">
        {typedText}
        {typed && <span className={styles.cursor} />}
      </span>
    </span>
  )
}
