import { RoomOptions, Seat } from '../../../../multiplayer/multiplayer.types'
import { MOVE_LIMITS, ONLINE_STARTERS, gameCopy } from '../../data'
import styles from './OnlinePanel.module.scss'

interface RoomSettingsProps {
  firstSeat: Seat
  moveLimitSeconds: number | null
  isOpen: boolean
  /** Whose side of the table to describe the opening move from. Defaults to the seat that opened the room. */
  mySeat?: Seat
}

const limitLabelFor = (seconds: number | null) =>
  MOVE_LIMITS.find((option) => option.seconds === seconds)?.label ?? MOVE_LIMITS[0].label

/**
 * The terms a room is played under: who opens, how long a move may take, and whether a stranger can
 * drop in. Plain text, so a game you were matched into is never a mystery.
 */
export function RoomSettings({
  firstSeat,
  moveLimitSeconds,
  isOpen,
  mySeat = Seat.first,
}: RoomSettingsProps) {
  const copy = gameCopy.online

  return (
    <dl className={styles.readOnly}>
      <div className={styles.readRow}>
        <dt className={styles.codeLabel}>{copy.firstMoveLabel}</dt>
        {/* Named from the reader's seat, so the joiner isn't told "You" about the other player. */}
        <dd className={styles.readValue}>
          {firstSeat === mySeat ? ONLINE_STARTERS[0].label : ONLINE_STARTERS[1].label}
        </dd>
      </div>
      <div className={styles.readRow}>
        <dt className={styles.codeLabel}>{copy.clockLabel}</dt>
        <dd className={styles.readValue}>{limitLabelFor(moveLimitSeconds)}</dd>
      </div>
      <div className={styles.readRow}>
        <dt className={styles.codeLabel}>{copy.openLabel}</dt>
        <dd className={styles.readValue}>{isOpen ? copy.openYes : copy.openNo}</dd>
      </div>
    </dl>
  )
}

interface RoomSettingsFieldsProps extends Required<RoomOptions> {
  /** Carries only the setting that moved, so two quick changes cannot undo each other. */
  onChange: (change: RoomOptions) => void
}

/** The same three settings as controls, for the dialog that proposes a change to them. */
export function RoomSettingsFields({
  firstSeat,
  moveLimitSeconds,
  isOpen,
  onChange,
}: RoomSettingsFieldsProps) {
  const copy = gameCopy.online

  return (
    <>
      <div className={styles.settingRow}>
        <span className={styles.codeLabel} id="first-move-label">
          {copy.firstMoveLabel}
        </span>
        <div className={styles.segmented} role="radiogroup" aria-labelledby="first-move-label">
          {ONLINE_STARTERS.map((option) => (
            <button
              key={option.seat}
              type="button"
              role="radio"
              aria-checked={firstSeat === option.seat}
              onClick={() => onChange({ firstSeat: option.seat })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.settingRow}>
        <span className={styles.codeLabel} id="clock-label">
          {copy.clockLabel}
        </span>
        <div className={styles.segmented} role="radiogroup" aria-labelledby="clock-label">
          {MOVE_LIMITS.map((option) => (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={moveLimitSeconds === option.seconds}
              onClick={() => onChange({ moveLimitSeconds: option.seconds })}
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
