import { useRef, useState } from 'react'
import { RoomChange, RoomOptions, Seat } from '../multiplayer.types'
import { MOVE_LIMITS, ONLINE_STARTERS } from '../room-options'
import { OnlineCopy } from '../online-copy'
import { useDialogChrome } from '../../components/utils/useDialogChrome'
import { useRovingRadio } from '../../components/utils/useRovingRadio'
import styles from './RoomSettingsDialog.module.scss'

/** A board size the room can open at, for a game whose size can change. */
export interface BoardSizeOption {
  /** The cell count that stands for this size. */
  value: number
  label: string
}

interface RoomSettingsDialogProps {
  /** What the room is set to now, or what a new room would open with. */
  options: RoomChange
  /** Names the action the dialog leads to: opening a room, or saving a change to one. */
  confirmLabel: string
  onConfirm: (settings: RoomChange) => void
  onCancel: () => void
  copy: OnlineCopy
  /** Board sizes to choose from, for a game whose size can change. Omitted hides the control. */
  boardSizes?: readonly BoardSizeOption[]
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
  copy,
  boardSizes,
}: RoomSettingsDialogProps) {
  const [draft, setDraft] = useState(options)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const { panelRef } = useDialogChrome(onCancel, confirmRef)
  // A press that starts on a control and drifts onto the backdrop is still a press on the control.
  const pressedBackdrop = useRef(false)

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
          cellCount={draft.cellCount}
          boardSizes={boardSizes}
          copy={copy}
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

interface RoomSettingsFieldsProps extends RoomChange {
  copy: OnlineCopy
  boardSizes?: readonly BoardSizeOption[]
  /** Carries only the setting that moved, so two quick changes cannot undo each other. */
  onChange: (change: RoomOptions) => void
}

// The values behind the groups, so the keyboard handling has a list to walk.
const STARTER_SEATS: readonly Seat[] = ONLINE_STARTERS.map((option) => option.seat)
const LIMIT_SECONDS: readonly (number | null)[] = MOVE_LIMITS.map((option) => option.seconds)

/** The room's settings as controls, for the dialog that proposes a change to them. */
function RoomSettingsFields({
  firstSeat,
  moveLimitSeconds,
  isOpen,
  cellCount,
  boardSizes,
  copy,
  onChange,
}: RoomSettingsFieldsProps) {
  const sizeValues = boardSizes?.map((size) => size.value) ?? []
  const sizeKeys = useRovingRadio(sizeValues, cellCount ?? null, (value) =>
    onChange({ cellCount: value ?? undefined })
  )
  const starterKeys = useRovingRadio(STARTER_SEATS, firstSeat, (seat) =>
    onChange({ firstSeat: seat })
  )
  const limitKeys = useRovingRadio(LIMIT_SECONDS, moveLimitSeconds, (seconds) =>
    onChange({ moveLimitSeconds: seconds })
  )

  return (
    <>
      {boardSizes !== undefined && boardSizes.length > 0 && copy.boardSizeLabel !== undefined && (
        <div className={styles.settingRow}>
          <span className={styles.label} id="board-size-label">
            {copy.boardSizeLabel}
          </span>
          <div className={styles.segmented} role="radiogroup" aria-labelledby="board-size-label">
            {boardSizes.map((size, index) => (
              <button
                key={size.value}
                type="button"
                role="radio"
                aria-checked={cellCount === size.value}
                onClick={() => onChange({ cellCount: size.value })}
                {...sizeKeys(index)}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
