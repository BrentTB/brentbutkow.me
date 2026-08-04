import { useRef, useState } from 'react'
import { RoomOptions, Seat } from '../../../../multiplayer/multiplayer.types'
import { useDialogChrome } from '../../../../components/utils/useDialogChrome'
import { useRovingRadio } from '../../../../components/utils/useRovingRadio'
import { MOVE_LIMITS, ONLINE_STARTERS, gameCopy } from '../../data'
import styles from './RoomSettingsDialog.module.scss'

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
        <h3 id="room-settings-title" className={styles.title}>
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

interface RoomSettingsFieldsProps extends Required<RoomOptions> {
  /** Carries only the setting that moved, so two quick changes cannot undo each other. */
  onChange: (change: RoomOptions) => void
}

// The values behind the two groups, so the keyboard handling has a list to walk.
const STARTER_SEATS: readonly Seat[] = ONLINE_STARTERS.map((option) => option.seat)
const LIMIT_SECONDS: readonly (number | null)[] = MOVE_LIMITS.map((option) => option.seconds)

/** The same three settings as controls, for the dialog that proposes a change to them. */
function RoomSettingsFields({
  firstSeat,
  moveLimitSeconds,
  isOpen,
  onChange,
}: RoomSettingsFieldsProps) {
  const copy = gameCopy.online

  const starterKeys = useRovingRadio(STARTER_SEATS, firstSeat, (seat) =>
    onChange({ firstSeat: seat })
  )
  const limitKeys = useRovingRadio(LIMIT_SECONDS, moveLimitSeconds, (seconds) =>
    onChange({ moveLimitSeconds: seconds })
  )

  return (
    <>
      <div className={styles.settingRow}>
        <span className={styles.label} id="first-move-label">
          {copy.firstMoveLabel}
        </span>
        <div className={styles.segmented} role="radiogroup" aria-labelledby="first-move-label">
          {ONLINE_STARTERS.map((option, index) => (
            <button
              key={option.seat}
              type="button"
              role="radio"
              aria-checked={firstSeat === option.seat}
              onClick={() => onChange({ firstSeat: option.seat })}
              {...starterKeys(index)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.settingRow}>
        <span className={styles.label} id="clock-label">
          {copy.clockLabel}
        </span>
        <div className={styles.segmented} role="radiogroup" aria-labelledby="clock-label">
          {MOVE_LIMITS.map((option, index) => (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={moveLimitSeconds === option.seconds}
              onClick={() => onChange({ moveLimitSeconds: option.seconds })}
              {...limitKeys(index)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className={styles.toggleRow}>
        <input
          type="checkbox"
          checked={isOpen}
          onChange={(event) => onChange({ isOpen: event.target.checked })}
        />
        <span className={styles.toggleText}>
          {copy.openLabel}
          <span className={styles.hint}>{copy.openHint}</span>
        </span>
      </label>
    </>
  )
}
