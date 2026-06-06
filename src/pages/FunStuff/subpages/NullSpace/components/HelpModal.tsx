import { useEffect, useRef } from 'react'
import { SPACE_METAL_ABILITIES } from '../engine/spaceMetalAbilities'
import styles from './HelpModal.module.scss'

type HelpModalProps = {
  onClose: () => void
  onSuspendTime: () => void
  onResumeTime: () => void
  // True only when the game is actively running. We only suspend then so
  // opening help during a paused / upgrade / wave-complete state doesn't
  // mess with their own timing.
  shouldSuspend: boolean
}

export function HelpModal({ onClose, onSuspendTime, onResumeTime, shouldSuspend }: HelpModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Move focus into the dialog on open, restore it to the trigger on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeBtnRef.current?.focus()
    return () => previouslyFocused?.focus?.()
  }, [])

  useEffect(() => {
    // Capture-phase swallow: stops every key from reaching the game's window
    // keydown handler while the modal is open (otherwise F/G/number keys still
    // fire abilities and P desyncs the pause). Escape / ? close the modal.
    const handleKey = (e: KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Escape' || e.key === '?') onClose()
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [onClose])

  useEffect(() => {
    if (!shouldSuspend) return
    onSuspendTime()
    return () => onResumeTime()
    // shouldSuspend captured at mount — flipping phases mid-modal shouldn't
    // toggle suspend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="How to play"
        aria-modal="true"
      >
        <h2 className={styles.title}>How to play</h2>

        <section className={styles.section}>
          <h3 className={styles.heading}>Gameplay</h3>
          <p>
            You are a cosmic guardian, tasked with protecting a lone ship patrolling a hostile void.
            Use your abilities to blast away enemies before they can damage the ship.
          </p>
        </section>

        <section className={styles.section}>
          <h3 className={styles.heading}>Controls</h3>
          <ul className={styles.list}>
            <li>
              <kbd>Click</kbd> anywhere in space to cast the selected ability at that spot.
            </li>
            <li>
              <kbd>Hold</kbd> click for channelled abilities (Telekinesis, Solar Flare).
            </li>
            <li>
              <kbd>1</kbd>&nbsp;<kbd>2</kbd>&nbsp;<kbd>3</kbd>&nbsp;… switch ability. Slots fill in
              the order you unlock things.
            </li>
            <li>
              <kbd>P</kbd> pause / resume.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h3 className={styles.heading}>Space metal abilities</h3>
          <p>Some enemies drop ⬡ space metal. Use it for emergency moves:</p>
          <ul className={styles.list}>
            {SPACE_METAL_ABILITIES.map((a) => (
              <li key={a.kind}>
                <kbd>{a.hotkey}</kbd> {a.meta.label} — costs ⬡ {a.cost}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h3 className={styles.heading}>Progression</h3>
          <p>
            Kill enemies to earn ✦ Stardust. Every 3 waves opens the upgrade shop: buy ability
            upgrades, ship stats, or unlock a new power to ensure the ship's survival.
          </p>
        </section>

        <button ref={closeBtnRef} className={styles.closeBtn} onClick={onClose} type="button">
          Got it
        </button>
      </div>
    </div>
  )
}
