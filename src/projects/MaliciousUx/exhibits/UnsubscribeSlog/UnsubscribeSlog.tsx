import { useEffect, useRef, useState } from 'react'
import styles from './UnsubscribeSlog.module.scss'
import { copy, imposedWaitSeconds, MAILINGS, UNSUBSCRIBE_MS } from './data'

export function UnsubscribeSlog() {
  const [gone, setGone] = useState<string[]>([])
  /** The one being processed. While anything is processing, the whole panel is out of action. */
  const [pending, setPending] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // One at a time, and nothing else can be pressed until this one finishes. Queueing them up would
  // let a visitor fire all nine in a second and never feel the wait at all.
  const leave = (mailing: string) => {
    setRestored(false)
    setPending(mailing)
    timer.current = window.setTimeout(() => {
      setGone((current) => [...current, mailing])
      setPending(null)
    }, UNSUBSCRIBE_MS)
  }

  // Coming back is one press and no waiting whatsoever. That asymmetry is the exhibit.
  const rejoin = () => {
    window.clearTimeout(timer.current)
    timer.current = undefined
    setGone([])
    setPending(null)
    setRestored(true)
  }

  const left = MAILINGS.length - gone.length
  const anyGone = gone.length > 0

  const status = () => {
    if (restored) return copy.restored
    if (left === 0) return copy.cleared(imposedWaitSeconds(MAILINGS.length))
    if (pending !== null) return copy.waiting
    if (anyGone) return copy.progress(left)
    return copy.quiet(MAILINGS.length)
  }

  return (
    <div className={styles.panel}>
      <h4 className={styles.heading}>{copy.heading}</h4>
      <p className={styles.detail}>{copy.detail}</p>

      <ul className={styles.list}>
        {MAILINGS.map((mailing) => (
          <li className={styles.row} key={mailing}>
            <span className={styles.name}>{mailing}</span>
            {gone.includes(mailing) ? (
              <span className={styles.gone}>{copy.gone}</span>
            ) : (
              <button
                type="button"
                className={styles.leave}
                disabled={pending !== null}
                onClick={() => leave(mailing)}
              >
                {pending === mailing ? copy.pending : copy.unsubscribe}
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <p className={styles.readout} aria-live="polite">
          {status()}
        </p>
        {anyGone && (
          <button type="button" className={styles.rejoin} onClick={rejoin}>
            {copy.resubscribe}
          </button>
        )}
      </div>
    </div>
  )
}
