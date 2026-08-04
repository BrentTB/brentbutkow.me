import { useRef, useState } from 'react'
import { RoomOptions } from '../../../../multiplayer/multiplayer.types'
import { useDialogChrome } from '../../../../components/utils/useDialogChrome'
import { gameCopy } from '../../data'
import { RoomSettingsFields } from './RoomSettings'
import styles from './OnlinePanel.module.scss'

interface RoomSettingsDialogProps {
  /** What the room is set to now, or what a new room would open with. */
  options: Required<RoomOptions>
  /** Names the action the dialog leads to: opening a room, or saving a change to one. */
  confirmLabel: string
  onConfirm: (options: Required<RoomOptions>) => void
  onCancel: () => void
}

/**
 * The room's terms, edited in one place and applied on confirm.
 *
 * Held apart from the room until then: settings that took effect as you touched them would be visible
 * to the other player mid-thought, and half of them decide how a game plays.
 */
export function RoomSettingsDialog({
  options,
  confirmLabel,
  onConfirm,
  onCancel,
}: RoomSettingsDialogProps) {
  const [draft, setDraft] = useState(options)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const { panelRef } = useDialogChrome(onCancel, confirmRef)
  // A press that starts on a control and drifts onto the backdrop is still a press on the control.
  const pressedBackdrop = useRef(false)
  const copy = gameCopy.online

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onPointerDown={(event) => {
        pressedBackdrop.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        ref={panelRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-settings-title"
      >
        <h3 id="room-settings-title" className={styles.heading}>
          {copy.settingsTitle}
        </h3>

        <RoomSettingsFields
          firstSeat={draft.firstSeat}
          moveLimitSeconds={draft.moveLimitSeconds}
          isOpen={draft.isOpen}
          onChange={(change) => setDraft((prev) => ({ ...prev, ...change }))}
        />

        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondary} onClick={onCancel}>
            {copy.cancel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={styles.action}
            onClick={() => onConfirm(draft)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
