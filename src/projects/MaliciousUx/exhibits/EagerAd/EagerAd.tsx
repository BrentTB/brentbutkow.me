import { PointerEvent, useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '../../../../components/utils/useMediaQuery'
import styles from './EagerAd.module.scss'
import { copy } from './data'

/** How long the advert waits after the cursor arrives — long enough to look like a slow network. */
export const ARRIVAL_MS = 450
/** How close the cursor must get to the button before the advert decides to pounce, in pixels. */
const ARRIVAL_RADIUS = 120

/** No hover means no cursor to watch approaching, so the exhibit says what to do instead. */
const TOUCH_QUERY = '(hover: none)'

/** A press this exhibit treats as a finger rather than a cursor. */
const isTouchPress = (pointerType: string) => pointerType === 'touch' || pointerType === 'pen'

const Landed = { article: 'article', advert: 'advert' } as const
type Landed = (typeof Landed)[keyof typeof Landed]

export function EagerAd() {
  const isTouch = useMediaQuery(TOUCH_QUERY)
  const [adShown, setAdShown] = useState(false)
  const [landed, setLanded] = useState<Landed | null>(null)
  const actionRef = useRef<HTMLButtonElement>(null)
  const arrival = useRef<number | undefined>(undefined)
  /** Whether the advert appeared under a finger already on its way down, and so owns that tap. */
  const tapTaken = useRef(false)

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

  /**
   * The touch version of the same crime. A finger never approaches — it arrives — so there is no
   * warning to be given and nothing for the proximity check above to watch. The advert instead loads
   * between press and release, taking both the space above the button and the tap that was aimed at it.
   * Left to the cursor code alone the exhibit simply did nothing on a phone.
   */
  const onActionPress = (event: PointerEvent) => {
    /* A press owns the tap only if the advert lands during that press. Clearing first means a press
       abandoned by dragging off the button cannot leave the flag set and steal a later click. */
    tapTaken.current = false
    if (!isTouchPress(event.pointerType) || adShown || landed !== null) return
    window.clearTimeout(arrival.current)
    arrival.current = undefined
    setAdShown(true)
    tapTaken.current = true
  }

  const onActionRelease = () => {
    if (!tapTaken.current) {
      setLanded(Landed.article)
      return
    }
    tapTaken.current = false
    setLanded(Landed.advert)
  }

  const reset = () => {
    window.clearTimeout(arrival.current)
    arrival.current = undefined
    tapTaken.current = false
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
        onPointerDown={onActionPress}
        onClick={onActionRelease}
      >
        {copy.action}
      </button>

      <div className={styles.footer}>
        <p className={styles.readout} aria-live="polite">
          {landed !== null ? copy[landed] : isTouch ? copy.quietTouch : copy.quiet}
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
