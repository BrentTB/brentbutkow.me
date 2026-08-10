import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cssVars } from '../../../../utils/css-vars'
import styles from './UnsubscribeSlog.module.scss'
import { copy, imposedWaitSeconds, longestStatus, MAILINGS, UNSUBSCRIBE_MS } from './data'

export function UnsubscribeSlog() {
  const [gone, setGone] = useState<string[]>([])
  /** The one being processed. While anything is processing, the whole panel is out of action. */
  const [pending, setPending] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const listRef = useRef<HTMLUListElement>(null)
  const rejoinRef = useRef<HTMLButtonElement>(null)
  const doneCount = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Finishing one unsubscribe turns its button into a label; carry focus to the next button still
  // standing (or the resubscribe control) so a keyboard user keeps the slog instead of hitting body.
  useLayoutEffect(() => {
    const finishedOne = gone.length > doneCount.current && pending === null
    doneCount.current = gone.length
    if (!finishedOne) return
    const nextLeave = listRef.current?.querySelector<HTMLButtonElement>(
      `.${styles.leave}:not(:disabled)`
    )
    ;(nextLeave ?? rejoinRef.current)?.focus()
  }, [gone.length, pending])

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

      <ul className={styles.list} ref={listRef}>
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
        {/* The longest line the readout can show, handed to the CSS to reserve room for. It goes in as
            a property rather than an element so it is never read out, matched, or selectable. */}
        <div
          className={styles.readoutBox}
          style={cssVars({ '--longest-line': JSON.stringify(longestStatus()) })}
        >
          <p className={styles.readout} aria-live="polite">
            {status()}
          </p>
        </div>
        {anyGone && (
          <button type="button" ref={rejoinRef} className={styles.rejoin} onClick={rejoin}>
            {copy.resubscribe}
          </button>
        )}
      </div>
    </div>
  )
}
