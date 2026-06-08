import { SPACE_METAL_ABILITIES } from '../../engine/spaceMetalAbilities'
import sharedStyles from '../OverlayShared.module.scss'
import styles from './HelpScreen.module.scss'

type HelpScreenProps = {
  onClose: () => void
}

export function HelpScreen({ onClose }: HelpScreenProps) {
  return (
    <div className={styles.help}>
      <h2 className={sharedStyles.title}>How to play</h2>

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

      <button className={sharedStyles.primaryBtn} onClick={onClose}>
        Back
      </button>
    </div>
  )
}
