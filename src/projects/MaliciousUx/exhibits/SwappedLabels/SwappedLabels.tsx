import { useRef, useState } from 'react'
import styles from './SwappedLabels.module.scss'
import { copy } from './data'

const Choice = { deleted: 'deleted', kept: 'kept' } as const
type Choice = (typeof Choice)[keyof typeof Choice]

export function SwappedLabels() {
  const [swapped, setSwapped] = useState(false)
  const [choice, setChoice] = useState<Choice | null>(null)
  // One swap per approach. Trading places puts a button under the cursor, and reacting to that would
  // leave the pair flickering for as long as the mouse sat still.
  const armed = useRef(true)

  // Reaching for the safe button is the trigger, so the pair only shuffles for a pointer. Tab lands on
  // them where they sit.
  const reachedForSafe = () => {
    if (!armed.current) return
    armed.current = false
    setSwapped((previous) => !previous)
  }

  return (
    <div className={styles.dialog}>
      <h4 className={styles.question}>{copy.question}</h4>
      <p className={styles.detail}>{copy.detail}</p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.destructive}
          style={{ order: swapped ? 2 : 1 }}
          onClick={() => setChoice(Choice.deleted)}
        >
          {copy.destructive}
        </button>
        <button
          type="button"
          className={styles.safe}
          style={{ order: swapped ? 1 : 2 }}
          onPointerEnter={reachedForSafe}
          onPointerLeave={() => {
            armed.current = true
          }}
          onClick={() => setChoice(Choice.kept)}
        >
          {copy.safe}
        </button>
      </div>

      <p className={styles.readout} aria-live="polite">
        {choice === null ? copy.waiting : copy[choice]}
      </p>
    </div>
  )
}
