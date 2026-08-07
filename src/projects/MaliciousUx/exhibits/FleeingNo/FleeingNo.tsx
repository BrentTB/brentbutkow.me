import { useState } from 'react'
import { useFunMode } from '../../../../contexts/useFunMode'
import { hostilityFor } from '../../data'
import { useEvasiveTarget } from '../../useEvasiveTarget'
import styles from './FleeingNo.module.scss'
import { copy } from './data'

const Answer = { agreed: 'agreed', declined: 'declined' } as const
type Answer = (typeof Answer)[keyof typeof Answer]

export function FleeingNo() {
  const { isFunMode } = useFunMode()
  const { evadeRadius, hopDistance } = hostilityFor(isFunMode)
  const { arenaRef, targetRef, spot, dodges } = useEvasiveTarget(evadeRadius, hopDistance)
  const [answer, setAnswer] = useState<Answer | null>(null)

  return (
    <div className={styles.dialog}>
      <p className={styles.question}>{copy.question}</p>

      <div className={styles.row}>
        <button type="button" className={styles.yes} onClick={() => setAnswer(Answer.agreed)}>
          {copy.yes}
        </button>

        {/* The No is taken out of the flow entirely, so hopping around cannot shove the rest about. */}
        <div className={styles.pen} ref={arenaRef}>
          <button
            type="button"
            className={styles.no}
            ref={targetRef}
            style={{ left: spot.x, top: spot.y }}
            onClick={() => setAnswer(Answer.declined)}
          >
            {copy.no}
          </button>
        </div>
      </div>

      <p className={styles.readout} aria-live="polite">
        {answer === null ? copy.chasing(dodges) : copy[answer]}
      </p>
    </div>
  )
}
