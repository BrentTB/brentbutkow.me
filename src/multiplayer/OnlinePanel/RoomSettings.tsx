import { Seat } from '../multiplayer.types'
import { MOVE_LIMITS, NO_MOVE_LIMIT_LABEL, ONLINE_STARTERS } from '../room-options'
import { OnlineCopy } from '../online-copy'
import styles from './OnlinePanel.module.scss'

interface RoomSettingsProps {
  firstSeat: Seat
  moveLimitSeconds: number | null
  isOpen: boolean
  /** The room's board size, shown only for a game whose size can vary. */
  cellCount: number
  /** Whose side of the table to describe the opening move from. Defaults to the seat that opened the room. */
  mySeat?: Seat
  copy: OnlineCopy
}

/**
 * Any limit the room can be running, not only the four this page offers: a matchmade room may come back
 * with something else, and reading that as "None" while a clock counts down is worse than no answer.
 */
const limitLabelFor = (seconds: number | null): string => {
  const offered = MOVE_LIMITS.find((option) => option.seconds === seconds)
  if (offered !== undefined) return offered.label
  return seconds === null ? NO_MOVE_LIMIT_LABEL : `${seconds}s`
}

/** The two starter labels are written from the setter's own seat, so read them back the same way. */
const openerLabel = (firstSeat: Seat, mySeat: Seat): string => {
  const side = firstSeat === mySeat ? Seat.first : Seat.second
  return ONLINE_STARTERS.find((option) => option.seat === side)?.label ?? ''
}

/**
 * The terms a room is played under: who opens, how long a move may take, and whether a stranger can
 * drop in. Plain text, so a game you were matched into is never a mystery.
 */
export function RoomSettings({
  firstSeat,
  moveLimitSeconds,
  isOpen,
  cellCount,
  mySeat = Seat.first,
  copy,
}: RoomSettingsProps) {
  // Only a game whose board size varies supplies these; for everyone else the line is left out.
  const boardSize = copy.boardSizeSummary?.(cellCount) ?? null

  return (
    <dl className={styles.readOnly}>
      {boardSize !== null && copy.boardSizeLabel !== undefined && (
        <div className={styles.readRow}>
          <dt className={styles.codeLabel}>{copy.boardSizeLabel}</dt>
          <dd className={styles.readValue}>{boardSize}</dd>
        </div>
      )}
      <div className={styles.readRow}>
        <dt className={styles.codeLabel}>{copy.firstMoveLabel}</dt>
        {/* Named from the reader's seat, so the joiner isn't told "You" about the other player. */}
        <dd className={styles.readValue}>{openerLabel(firstSeat, mySeat)}</dd>
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
