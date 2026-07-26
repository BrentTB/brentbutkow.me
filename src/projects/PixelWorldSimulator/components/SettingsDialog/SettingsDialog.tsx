import { useRef } from 'react'
import { SimSetting, SimSettings } from '../../pixel-world.types'
import { SETTING_ROWS, simCopy } from '../../data'
import { useDialogChrome } from '../../useDialogChrome'
import styles from './SettingsDialog.module.scss'

type SettingsDialogProps = {
  settings: SimSettings
  onToggle(setting: SimSetting): void
  onClose(): void
}

/** How the world is drawn, rather than what is in it: nothing here touches the simulation. */
export function SettingsDialog({ settings, onToggle, onClose }: SettingsDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const { panelRef } = useDialogChrome(onClose, closeRef)
  // A press that starts on a switch and drifts onto the backdrop is still a press on the switch.
  const pressedBackdrop = useRef(false)

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget
      }}
      // Close only when both the press and the release land on the backdrop, so a drag off a switch doesn't.
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pixel-world-settings-title"
      >
        <h2 id="pixel-world-settings-title" className={styles.title}>
          {simCopy.settings.title}
        </h2>

        <ul className={styles.rows}>
          {SETTING_ROWS.map(({ setting, label, hint }) => (
            <li key={setting}>
              <label className={styles.row}>
                <input
                  type="checkbox"
                  className={styles.check}
                  checked={settings[setting]}
                  onChange={() => onToggle(setting)}
                />
                <span className={styles.switch} aria-hidden="true" />
                <span className={styles.label}>{label}</span>
                <span className={styles.hint}>{hint}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          <button ref={closeRef} type="button" className={styles.done} onClick={onClose}>
            {simCopy.settings.close}
          </button>
        </div>
      </div>
    </div>
  )
}
