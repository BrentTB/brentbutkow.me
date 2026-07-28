import { useRef } from 'react'
import { SimSetting, SimSettings } from '../../pixel-world.types'
import { SETTING_SECTIONS, simCopy } from '../../data'
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

        {SETTING_SECTIONS.map(({ title, rows }) => (
          <fieldset key={title} className={styles.section}>
            <legend className={styles.sectionTitle}>{title}</legend>
            <ul className={styles.rows}>
              {rows.map(({ setting, label, hint, requires }) => {
                // A row whose dependency is off would show nothing, so it reads as off and cannot be pressed.
                // The stored preference is left alone: turn air back on and the overlay returns as it was.
                const available = requires === undefined || settings[requires]
                return (
                  <li key={setting}>
                    <label className={`${styles.row} ${available ? '' : styles.rowLocked}`}>
                      <input
                        type="checkbox"
                        className={styles.check}
                        checked={available && settings[setting]}
                        disabled={!available}
                        onChange={() => {
                          // `disabled` already blocks a real click; guard the handler too, so the row stays
                          // inert even if the disabled attribute is ever dropped by mistake.
                          if (available) onToggle(setting)
                        }}
                      />
                      <span className={styles.switch} aria-hidden="true" />
                      <span className={styles.label}>{label}</span>
                      <span className={styles.hint}>
                        {hint}
                        {available ? null : ` ${simCopy.settings.locked}`}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        ))}

        <div className={styles.actions}>
          <button ref={closeRef} type="button" className={styles.done} onClick={onClose}>
            {simCopy.settings.close}
          </button>
        </div>
      </div>
    </div>
  )
}
