import { useEffect, useRef } from 'react'
import { SimSetting, SimSettings } from '../../pixel-world.types'
import { SETTING_ROWS, simCopy } from '../../data'
import styles from './SettingsDialog.module.scss'

type SettingsDialogProps = {
  settings: SimSettings
  onToggle(setting: SimSetting): void
  onClose(): void
}

/** How the world is drawn, rather than what is in it: nothing here touches the simulation. */
export function SettingsDialog({ settings, onToggle, onClose }: SettingsDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Whatever opened the dialog gets the focus back when it closes, so the keyboard lands back on the
    // gear rather than at the top of the page.
    const opener = document.activeElement
    closeRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      // Tab cycles inside the panel: a modal that lets focus wander onto the world behind it leaves a
      // keyboard user tabbing through a page they cannot see.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>('button, input')
      if (focusable === undefined || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [onClose])

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      // Only clicks that start on the backdrop itself close it, so a drag off a switch doesn't.
      onClick={(event) => event.target === event.currentTarget && onClose()}
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
