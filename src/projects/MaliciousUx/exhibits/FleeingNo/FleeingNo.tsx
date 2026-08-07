import { useEffect, useState } from 'react'
import { useFunMode } from '../../../../contexts/useFunMode'
import { hostilityFor } from '../../data'
import { useEvasiveTarget } from '../../useEvasiveTarget'
import styles from './FleeingNo.module.scss'
import { copy } from './data'

const Answer = { agreed: 'agreed', declined: 'declined' } as const
type Answer = (typeof Answer)[keyof typeof Answer]

export function FleeingNo() {
  const { isFunMode } = useFunMode()
  const { evadeRadius, dodgesBeforeSwap } = hostilityFor(isFunMode)
  const { arenaRef, targetRef, offset, dodges, settle } = useEvasiveTarget(evadeRadius)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [swapped, setSwapped] = useState(false)

  // Out of running room, it tries the other trick: the two buttons trade places and it starts over.
  useEffect(() => {
    if (dodges < dodgesBeforeSwap) return
    setSwapped((previous) => !previous)
    settle()
  }, [dodges, dodgesBeforeSwap, settle])

  return (
    <div className={styles.dialog}>
      <p className={styles.question}>{copy.question}</p>

      <div className={styles.row}>
        <button
          type="button"
          className={styles.yes}
          style={{ order: swapped ? 1 : 2 }}
          onClick={() => setAnswer(Answer.agreed)}
        >
          {copy.yes}
        </button>

        {/* The No gets a pen of its own, so running away can never park it on top of the Yes. */}
        <div className={styles.pen} ref={arenaRef} style={{ order: swapped ? 2 : 1 }}>
          <button
            type="button"
            className={styles.no}
            ref={targetRef}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
            onClick={() => setAnswer(Answer.declined)}
          >
            {copy.no}
          </button>
        </div>
      </div>

      <p className={styles.readout} aria-live="polite">
        {answer === null ? copy.waiting : copy[answer]}
      </p>
    </div>
  )
}
