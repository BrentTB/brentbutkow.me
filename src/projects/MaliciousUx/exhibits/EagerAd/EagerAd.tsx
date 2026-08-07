import { useEffect, useRef, useState } from 'react'
import styles from './EagerAd.module.scss'
import { copy } from './data'

/** How long the advert waits after the cursor arrives — long enough to look like a slow network. */
const ARRIVAL_MS = 450

const Landed = { article: 'article', advert: 'advert' } as const
type Landed = (typeof Landed)[keyof typeof Landed]

export function EagerAd() {
  const [adShown, setAdShown] = useState(false)
  const [landed, setLanded] = useState<Landed | null>(null)
  const arrival = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(arrival.current), [])

  // The advert loads when a cursor approaches, and lands above the button so the layout shifts under it.
  const onPointerNear = () => {
    if (adShown || arrival.current !== undefined) return
    arrival.current = window.setTimeout(() => setAdShown(true), ARRIVAL_MS)
  }

  const reset = () => {
    window.clearTimeout(arrival.current)
    arrival.current = undefined
    setAdShown(false)
    setLanded(null)
  }

  return (
    <div className={styles.article} onPointerMove={onPointerNear}>
      <h4 className={styles.page}>{copy.page}</h4>
      <p className={styles.body}>{copy.body}</p>

      {adShown && (
        <div className={styles.ad}>
          <p className={styles.adText}>{copy.ad}</p>
          <button
            type="button"
            className={styles.adButton}
            onClick={() => setLanded(Landed.advert)}
          >
            {copy.adAction}
          </button>
        </div>
      )}

      <button type="button" className={styles.action} onClick={() => setLanded(Landed.article)}>
        {copy.action}
      </button>

      <div className={styles.footer}>
        <p className={styles.readout} aria-live="polite">
          {landed === null ? copy.quiet : copy[landed]}
        </p>
        {(adShown || landed !== null) && (
          <button type="button" className={styles.reset} onClick={reset}>
            {copy.reset}
          </button>
        )}
      </div>
    </div>
  )
}
