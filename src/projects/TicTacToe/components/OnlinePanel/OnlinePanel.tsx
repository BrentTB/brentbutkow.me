import { FormEvent, useEffect, useState } from 'react'
import { ROOM_CODE_LENGTH, roomInviteUrl } from '../../../../multiplayer/room-code'
import { RoomStatus, Seat, SeatProfile } from '../../../../multiplayer/multiplayer.types'
import { Connection, OnlineRoom } from '../../../../multiplayer/useOnlineRoom'
import { formatClock, useTurnClock } from '../../../../multiplayer/useTurnClock'
import { cssVars } from '../../css-vars'
import { MOVE_LIMITS, ONLINE_STARTERS, gameCopy } from '../../data'
import { LeaveIcon } from '../LeaveIcon/LeaveIcon'
import styles from './OnlinePanel.module.scss'

/** Where the countdown turns urgent, which is about when it starts affecting how you play. */
const LOW_CLOCK_SECONDS = 10

interface OnlinePanelProps {
  room: OnlineRoom<number>
  /** The local player's name and colour, sent when creating, joining or matchmaking. */
  profile: SeatProfile
  /** A code pulled from an invite link, prefilling the join field. */
  initialCode?: string
}

/** Set up a room or join one, then show the code, both players, the clock, and whose move it is. */
export function OnlinePanel({ room, profile, initialCode = '' }: OnlinePanelProps) {
  const [code, setCode] = useState(initialCode)
  const [copied, setCopied] = useState(false)
  const [firstSeat, setFirstSeat] = useState<Seat>(Seat.first)
  const [moveLimit, setMoveLimit] = useState<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const copy = gameCopy.online
  const secondsLeft = useTurnClock(room.turnEndsAt)

  // Follows the code the page supplies, so an invite fills the field and leaving a room empties it.
  useEffect(() => setCode(initialCode), [initialCode])

  // Every code the server issues is this long, so a shorter one cannot match a room.
  const enteredCode = code.trim().toUpperCase()
  const codeComplete = enteredCode.length === ROOM_CODE_LENGTH

  const submitJoin = (event: FormEvent) => {
    event.preventDefault()
    if (codeComplete) void room.join(enteredCode, profile)
  }

  const copyLink = async () => {
    if (room.code === null) return
    try {
      await navigator.clipboard.writeText(roomInviteUrl(room.code))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be denied; the code is on screen to type by hand.
    }
  }

  if (room.connection === Connection.connected) {
    const finished = room.status === RoomStatus.finished
    const opponent = room.seats.find((seat) => seat.seat !== room.mySeat)
    /* Nothing to say about turns once a game is over: the result is on the status line above the board,
       and a finished room with an empty seat is not waiting for anyone to arrive. */
    const turn = finished
      ? null
      : !room.opponentPresent
        ? copy.waiting
        : room.isMyTurn
          ? copy.yourTurn
          : copy.theirTurn

    return (
      <section className={styles.panel} aria-labelledby="online-heading">
        <h2 id="online-heading" className={styles.heading}>
          {copy.title}
        </h2>
        <div className={styles.codeRow}>
          <span className={styles.codeLabel}>{copy.yourCode}</span>
          <span className={styles.code}>{room.code}</span>
        </div>
        <button type="button" className={styles.action} onClick={copyLink}>
          {copied ? copy.copied : copy.copyLink}
        </button>

        {/* Both seats as the room knows them, so a colour or name change is visibly shared. */}
        <ul className={styles.seats}>
          {room.seats.map((entry) => (
            <li key={entry.seat} className={styles.seat} data-away={!entry.joined || undefined}>
              <span
                className={styles.swatch}
                style={cssVars({ '--seat-rgb': entry.colour })}
                aria-hidden="true"
              />
              <span className={styles.seatName}>
                {entry.name.trim() || copy.unnamed}
                {entry.seat === room.mySeat && <span className={styles.mine}> {copy.youTag}</span>}
              </span>
            </li>
          ))}
        </ul>

        {turn !== null && (
          <p className={styles.status} aria-live="polite">
            {turn}
          </p>
        )}

        {/* The clock is a nudge, not the ruling: the server decides a game on time by itself. Left out
            of any live region so it is not read aloud once a second; the turn line above carries the
            state that matters. */}
        {secondsLeft !== null && !finished && (
          <p className={styles.clock} data-low={secondsLeft <= LOW_CLOCK_SECONDS || undefined}>
            {copy.timeLeft(formatClock(secondsLeft))}
          </p>
        )}

        {room.opponentLeft && (
          <p className={styles.note} role="status">
            {copy.opponentLeft(opponent?.name.trim() || copy.unnamed)}
          </p>
        )}

        {finished && room.opponentPresent && (
          <>
            <button type="button" className={styles.action} onClick={() => void room.playAgain()}>
              {copy.playAgain}
            </button>
            <p className={styles.hint}>{copy.playAgainHint}</p>
          </>
        )}

        {room.error !== null && (
          <p className={styles.error} role="alert">
            {room.error}
          </p>
        )}

        <button type="button" className={styles.leave} onClick={room.leave}>
          <LeaveIcon />
          {copy.leave}
        </button>
      </section>
    )
  }

  return (
    <section className={styles.panel} aria-labelledby="online-heading">
      <h2 id="online-heading" className={styles.heading}>
        {copy.title}
      </h2>
      <p className={styles.intro}>{copy.intro}</p>
      {room.connection === Connection.connecting ? (
        <p className={styles.status}>{copy.connecting}</p>
      ) : (
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
                  onClick={() => setFirstSeat(option.seat as Seat)}
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
                  aria-checked={moveLimit === option.seconds}
                  onClick={() => setMoveLimit(option.seconds)}
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
              onChange={(event) => setIsOpen(event.target.checked)}
            />
            <span className={styles.toggleText}>
              {copy.openLabel}
              <span className={styles.hint}>{copy.openHint}</span>
            </span>
          </label>

          <button
            type="button"
            className={styles.action}
            onClick={() =>
              void room.create(profile, { firstSeat, isOpen, moveLimitSeconds: moveLimit })
            }
          >
            {copy.create}
          </button>

          <div className={styles.findRow}>
            <button
              type="button"
              className={styles.action}
              onClick={() => void room.findGame(profile, moveLimit)}
            >
              {copy.findGame}
            </button>
            <p className={styles.hint}>{copy.findHint}</p>
          </div>

          <form className={styles.joinRow} onSubmit={submitJoin}>
            <label className={styles.codeLabel} htmlFor="room-code">
              {copy.codeLabel}
            </label>
            <div className={styles.joinControls}>
              <input
                id="room-code"
                className={styles.input}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={copy.codePlaceholder}
                maxLength={ROOM_CODE_LENGTH}
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className={styles.action} disabled={!codeComplete}>
                {copy.join}
              </button>
            </div>
          </form>
        </>
      )}
      {room.error !== null && (
        <p className={styles.error} role="alert">
          {room.error}
        </p>
      )}
    </section>
  )
}
