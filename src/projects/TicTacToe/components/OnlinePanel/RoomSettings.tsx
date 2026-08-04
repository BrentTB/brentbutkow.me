import { RoomOptions, Seat } from '../../../../multiplayer/multiplayer.types'
import { MOVE_LIMITS, ONLINE_STARTERS, gameCopy } from '../../data'
import styles from './OnlinePanel.module.scss'

interface RoomSettingsProps {
  firstSeat: Seat
  moveLimitSeconds: number | null
  isOpen: boolean
  /** False shows the same settings as plain text, for a player who cannot change them. */
  editable: boolean
  onChange: (options: RoomOptions) => void
}

/**
 * The terms a room is played under: who opens, how long a move may take, and whether a stranger can
 * drop in.
 *
 * The same three settings whether you are setting a room up or looking at one you have joined, so
 * "what am I in?" is answered by the same rows that asked the question. Only the player who opened the
 * room can change them, and only before the game starts.
 */
export function RoomSettings({
  firstSeat,
  moveLimitSeconds,
  isOpen,
  editable,
  onChange,
}: RoomSettingsProps) {
  const copy = gameCopy.online
  const limitLabel =
    MOVE_LIMITS.find((option) => option.seconds === moveLimitSeconds)?.label ?? MOVE_LIMITS[0].label
  const starterLabel = ONLINE_STARTERS.find((option) => option.seat === firstSeat)?.label

  if (!editable) {
    return (
      <dl className={styles.readOnly}>
        <div className={styles.readRow}>
          <dt className={styles.codeLabel}>{copy.firstMoveLabel}</dt>
          <dd className={styles.readValue}>{starterLabel}</dd>
        </div>
        <div className={styles.readRow}>
          <dt className={styles.codeLabel}>{copy.clockLabel}</dt>
          <dd className={styles.readValue}>{limitLabel}</dd>
        </div>
        <div className={styles.readRow}>
          <dt className={styles.codeLabel}>{copy.openLabel}</dt>
          <dd className={styles.readValue}>{isOpen ? copy.openYes : copy.openNo}</dd>
        </div>
      </dl>
    )
  }

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
              onClick={() => onChange({ firstSeat: option.seat, isOpen, moveLimitSeconds })}
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
              onClick={() => onChange({ firstSeat, isOpen, moveLimitSeconds: option.seconds })}
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
          onChange={(event) =>
            onChange({ firstSeat, moveLimitSeconds, isOpen: event.target.checked })
          }
        />
        <span className={styles.toggleText}>
          {copy.openLabel}
          <span className={styles.hint}>{copy.openHint}</span>
        </span>
      </label>
    </>
  )
}
