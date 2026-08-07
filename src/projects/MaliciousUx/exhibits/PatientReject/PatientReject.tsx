import { CSSProperties, useEffect, useState } from 'react'
import { useFunMode } from '../../../../contexts/useFunMode'
import { hostilityFor } from '../../data'
import { usePointerIntent } from '../../usePointerIntent'
import styles from './PatientReject.module.scss'
import { copy } from './data'

const TICK_MS = 100

const Phase = { idle: 'idle', waiting: 'waiting', ready: 'ready' } as const
type Phase = (typeof Phase)[keyof typeof Phase]

const Outcome = { accepted: 'accepted', rejected: 'rejected' } as const
type Outcome = (typeof Outcome)[keyof typeof Outcome]

export function PatientReject() {
  const { isFunMode } = useFunMode()
  const { rejectDelayMs } = hostilityFor(isFunMode)
  const { viaPointer, intentProps } = usePointerIntent()
  const [phase, setPhase] = useState<Phase>(Phase.idle)
  const [msLeft, setMsLeft] = useState(rejectDelayMs)
  const [presses, setPresses] = useState(0)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  useEffect(() => {
    if (phase !== Phase.waiting) return
    const tick = setInterval(() => setMsLeft((left) => Math.max(0, left - TICK_MS)), TICK_MS)
    return () => clearInterval(tick)
  }, [phase])

  useEffect(() => {
    if (phase === Phase.waiting && msLeft === 0) setPhase(Phase.ready)
  }, [phase, msLeft])

  const onReject = () => {
    setPresses((count) => count + 1)
    // Waiting is a thing done to a cursor. Reached by Tab, the button rejects on the first press.
    if (!viaPointer.current || phase === Phase.ready) {
      setOutcome(Outcome.rejected)
      return
    }
    if (phase === Phase.idle) {
      setMsLeft(rejectDelayMs)
      setPhase(Phase.waiting)
    }
  }

  const status = () => {
    if (outcome === Outcome.accepted) return copy.accepted
    if (outcome === Outcome.rejected) return copy.rejected(presses)
    if (phase === Phase.waiting) return copy.preparing((msLeft / 1000).toFixed(1))
    if (phase === Phase.ready) return copy.ready
    return copy.quiet
  }

  const progress = phase === Phase.idle ? 0 : 1 - msLeft / rejectDelayMs

  return (
    <div className={styles.consent}>
      <h4 className={styles.title}>{copy.title}</h4>
      <p className={styles.detail}>{copy.detail}</p>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.accept}
          onClick={() => {
            setPresses((count) => count + 1)
            setOutcome(Outcome.accepted)
          }}
        >
          {copy.accept}
        </button>

        <button type="button" className={styles.reject} onClick={onReject} {...intentProps}>
          <span
            className={styles.ring}
            style={{ '--progress': `${progress * 360}deg` } as CSSProperties}
            aria-hidden="true"
          />
          {copy.reject}
        </button>
      </div>

      <p className={styles.readout} aria-live="polite">
        {status()}
      </p>
    </div>
  )
}
