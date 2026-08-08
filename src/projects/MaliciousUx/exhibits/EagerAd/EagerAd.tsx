import { PointerEvent, useEffect, useRef, useState } from 'react'
import styles from './EagerAd.module.scss'
import { copy } from './data'

/** How long the advert waits after the cursor arrives — long enough to look like a slow network. */
export const ARRIVAL_MS = 450
/** How close the cursor must get to the button before the advert decides to pounce, in pixels. */
const ARRIVAL_RADIUS = 120

const Landed = { article: 'article', advert: 'advert' } as const
type Landed = (typeof Landed)[keyof typeof Landed]

export function EagerAd() {
  const [adShown, setAdShown] = useState(false)
  const [landed, setLanded] = useState<Landed | null>(null)
  const actionRef = useRef<HTMLButtonElement>(null)
  const arrival = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(arrival.current), [])

  // The advert loads once the cursor nears the button, and lands above it so the layout shifts under it.
  const onPointerNear = (event: PointerEvent) => {
    if (adShown || arrival.current !== undefined || actionRef.current === null) return
    const rect = actionRef.current.getBoundingClientRect()
    const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right)
    const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom)
    if (Math.hypot(dx, dy) > ARRIVAL_RADIUS) return
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

      <button
        type="button"
        ref={actionRef}
        className={styles.action}
        onClick={() => setLanded(Landed.article)}
      >
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
