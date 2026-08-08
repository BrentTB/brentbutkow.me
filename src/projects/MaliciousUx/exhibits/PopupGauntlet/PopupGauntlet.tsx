import { UIEvent, useRef, useState } from 'react'
import { dueInterruption, INTERRUPTION_DEPTHS, scrollDepth } from '../../engine/scroll-triggers'
import styles from './PopupGauntlet.module.scss'
import { AD_AFTER_INTERRUPTIONS, copy, INTERRUPTIONS } from './data'

/** Where the advert wedges itself in: high enough up to move the text you were reading. */
const AD_BEFORE_PARAGRAPH = 2

export function PopupGauntlet() {
  const article = useRef<HTMLDivElement>(null)
  const [fired, setFired] = useState(0)
  const [showing, setShowing] = useState<number | null>(null)
  const [reachedEnd, setReachedEnd] = useState(false)

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    const depth = scrollDepth(scrollTop, scrollHeight, clientHeight)

    const due = dueInterruption(depth, fired)
    const nextFired = due === null ? fired : due + 1
    if (due !== null) {
      setFired(nextFired)
      setShowing(due)
    }
    // The end only counts once every interruption has been paid for. Flinging the scrollbar to the
    // bottom skips past the triggers, and claiming the article was finished then would be a lie.
    // Counting nextFired, not fired, so the last interruption landing at the bottom still counts.
    // Browsers rarely let scrollTop reach the exact maximum, so allow a couple of pixels of slack.
    const atBottom = scrollHeight - clientHeight - scrollTop <= 2
    if (atBottom && nextFired >= INTERRUPTION_DEPTHS.length) setReachedEnd(true)
  }

  const restart = () => {
    setFired(0)
    setShowing(null)
    setReachedEnd(false)
    if (article.current !== null) article.current.scrollTop = 0
  }

  const interruption = showing === null ? null : (INTERRUPTIONS[showing] ?? null)
  const adShown = fired >= AD_AFTER_INTERRUPTIONS

  const status = () => {
    if (reachedEnd) return copy.finished(fired)
    if (fired > 0) return copy.interrupted(fired)
    return copy.quiet
  }

  return (
    <div className={styles.page}>
      <h4 className={styles.title}>{copy.title}</h4>

      {/* The frame gives the popup something the full height of the article to cover. */}
      <div className={styles.frame}>
        {/* Scrolling is frozen while a popup is up: reading past it is the one escape it will not allow. */}
        <div
          className={`${styles.article} ${interruption !== null ? styles.locked : ''}`}
          ref={article}
          onScroll={onScroll}
          data-locked={interruption !== null}
          data-testid="gauntlet-article"
        >
          {copy.paragraphs.map((paragraph, index) => (
            <div key={paragraph}>
              {/* Loads late and lands above the line you were on, so the text moves as you read it. */}
              {adShown && index === AD_BEFORE_PARAGRAPH && (
                <div className={styles.advert}>
                  <span className={styles.advertLabel}>{copy.advert}</span>
                  <span className={styles.advertBody}>{copy.advertBody}</span>
                </div>
              )}
              <p className={styles.paragraph}>{paragraph}</p>
            </div>
          ))}
        </div>

        {interruption !== null && (
          <div className={styles.overlay}>
            <div className={styles.panel} role="dialog" aria-label={interruption.heading}>
              <p className={styles.panelHeading}>{interruption.heading}</p>
              <p className={styles.panelBody}>{interruption.body}</p>
              <div className={styles.panelActions}>
                <button type="button" className={styles.dismiss} onClick={() => setShowing(null)}>
                  {interruption.dismiss}
                </button>
                <button type="button" className={styles.accept} onClick={() => setShowing(null)}>
                  {interruption.accept}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <p className={styles.readout} aria-live="polite">
          {status()}
        </p>
        {fired >= INTERRUPTION_DEPTHS.length && (
          <button type="button" className={styles.again} onClick={restart}>
            {copy.again}
          </button>
        )}
      </div>
    </div>
  )
}
