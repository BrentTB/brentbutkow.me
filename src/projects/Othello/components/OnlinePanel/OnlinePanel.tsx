import { FormEvent, useEffect, useRef, useState } from 'react'
import { ROOM_CODE_LENGTH, roomInviteUrl } from '../../../../multiplayer/room-code'
import {
  RoomOptions,
  RoomStatus,
  Seat,
  SeatProfile,
} from '../../../../multiplayer/multiplayer.types'
import { Connection, OnlineRoom } from '../../../../multiplayer/useOnlineRoom'
import { formatClock, useTurnClock } from '../../../../multiplayer/useTurnClock'
import { cssVars } from '../../css-vars'
import { MAX_NAME_LENGTH, gameCopy } from '../../data'
import { Player } from '../../othello.types'

/** The disc a seat plays, as an rgb swatch: the opener (the room's `firstSeat`) is always dark. */
const DISC_RGB: Record<Player, string> = {
  [Player.dark]: '22, 23, 28',
  [Player.light]: '233, 227, 214',
}
const seatDiscRgb = (seat: Seat, firstSeat: Seat): string =>
  DISC_RGB[seat === firstSeat ? Player.dark : Player.light]
import { LeaveIcon } from '../LeaveIcon/LeaveIcon'
import { RoomSettings } from './RoomSettings'
import { RoomSettingsDialog } from './RoomSettingsDialog'
import styles from './OnlinePanel.module.scss'

/** Where the countdown turns urgent, which is about when it starts affecting how you play. */
const LOW_CLOCK_SECONDS = 10

/** How long "Copied" stays on the button before it goes back to offering the link. */
const COPIED_FEEDBACK_MS = 2000

/**
 * A room code as the server issues them: letters and digits, upper case. Applied as it is typed, so a
 * pasted code with a stray space is not clipped to five characters by the field's own length limit.
 */
const sanitiseCode = (raw: string) => raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

/** What a room opens on before anyone touches the settings: you first, no clock, code only. */
const STANDARD_OPTIONS: Required<RoomOptions> = {
  firstSeat: Seat.first,
  isOpen: false,
  moveLimitSeconds: null,
}

interface OnlinePanelProps {
  room: OnlineRoom<number>
  /** The local player's name and colour, sent when creating, joining or matchmaking. */
  profile: SeatProfile
  /** A code pulled from an invite link, prefilling the join field. */
  initialCode?: string
}

/** Set up a room or join one, then show the code, both players, the clock, and whose move it is. */
export function OnlinePanel({ room, profile, initialCode = '' }: OnlinePanelProps) {
  const [code, setCode] = useState(() => sanitiseCode(initialCode))
  const [copied, setCopied] = useState(false)
  /* The settings dialog is the only place settings are edited: shut, nothing is pending anywhere. */
  const [editing, setEditing] = useState(false)
  const copy = gameCopy.online
  const secondsLeft = useTurnClock(room.turnEndsAt)

  // Follows the code the page supplies, so an invite fills the field and leaving a room empties it.
  useEffect(() => setCode(sanitiseCode(initialCode)), [initialCode])

  // Every code the server issues is this long, so a shorter one cannot match a room.
  const codeComplete = code.length === ROOM_CODE_LENGTH

  const submitJoin = (event: FormEvent) => {
    event.preventDefault()
    if (codeComplete) void room.join(code, profile)
  }

  /* Held so the panel can drop it: switching out of online mode unmounts this inside the two seconds. */
  const copiedTimer = useRef<number>()
  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])

  const copyLink = async () => {
    if (room.code === null) return
    try {
      await navigator.clipboard.writeText(roomInviteUrl(room.code))
      setCopied(true)
      window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
    } catch {
      // Clipboard access can be denied; the code is on screen to type by hand.
    }
  }

  if (room.connection === Connection.connected) {
    const running = room.status === RoomStatus.active
    const finished = room.status === RoomStatus.finished
    // A room that has a game behind it says "play again" rather than "start".
    const played = finished || room.version > 0
    const opponent = room.seats.find((seat) => seat.seat !== room.mySeat)
    const opponentName = (opponent?.name.trim() ?? '').slice(0, MAX_NAME_LENGTH)
    /* Nothing to say about turns once a game is over: the result is on the status line above the board,
       and a finished room with an empty seat is not waiting for anyone to arrive. A seat somebody walked
       out of is not waiting either — the note below says what happened to it. */
    const turn =
      finished || room.opponentLeft
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
        {/* Code and the button that shares it on one line: they are the same errand. */}
        <div className={styles.codeRow}>
          <span className={styles.codeLabel}>{copy.yourCode}</span>
          <span className={styles.code}>{room.code}</span>
          <button type="button" className={styles.copy} onClick={copyLink}>
            {copied ? copy.copied : copy.copyLink}
          </button>
        </div>

        {/* Both seats as the room knows them, so a colour or name change is visibly shared. */}
        <ul className={styles.seats}>
          {room.seats.map((entry) => (
            <li key={entry.seat} className={styles.seat} data-away={!entry.joined || undefined}>
              <span
                className={styles.swatch}
                style={cssVars({ '--seat-rgb': seatDiscRgb(entry.seat, room.firstSeat) })}
                aria-hidden="true"
              />
              <span className={styles.seatName}>
                {/* Capped here as well as in the field: the name arrives from the server, and the other
                    player's client is not something this row can take at its word. */}
                {entry.name.trim().slice(0, MAX_NAME_LENGTH) || copy.unnamed}
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
            {/* Somebody who never typed a name has no name to put in the sentence, so it is reworded
                rather than reading "No name yet left the room". */}
            {opponentName === '' ? copy.opponentLeftUnnamed : copy.opponentLeft(opponentName)}
          </p>
        )}

        {/* The terms this room runs under, so a game you were matched into is never a mystery. Read-only
            for both players: changing them goes through the dialog, on confirm. */}
        {!running && (
          <>
            <RoomSettings
              firstSeat={room.firstSeat}
              moveLimitSeconds={room.moveLimitSeconds}
              isOpen={room.isOpen}
              mySeat={room.mySeat ?? undefined}
            />
            {room.canChangeSettings && (
              <button type="button" className={styles.secondary} onClick={() => setEditing(true)}>
                {copy.editSettings}
              </button>
            )}
          </>
        )}

        {/* Nothing starts on its own: the same button opens the first game and every one after it. */}
        {room.canStart && (
          <>
            <button type="button" className={styles.action} onClick={() => void room.start()}>
              {played ? copy.playAgain : copy.startGame}
            </button>
            <p className={styles.hint}>{copy.startHint}</p>
          </>
        )}

        {!running && !room.canStart && room.opponentPresent && (
          <p className={styles.hint}>{copy.waitingToStart}</p>
        )}

        {editing && (
          <RoomSettingsDialog
            options={{
              firstSeat: room.firstSeat,
              isOpen: room.isOpen,
              moveLimitSeconds: room.moveLimitSeconds,
            }}
            confirmLabel={copy.saveSettings}
            onCancel={() => setEditing(false)}
            onConfirm={(next) => {
              setEditing(false)
              void room.changeSettings(next)
            }}
          />
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
          {/* Two ways in, kept apart: open a room of your own, or get into somebody else's. Opening one
              asks about its settings first, in the dialog. */}
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>{copy.createTitle}</h3>
            <button type="button" className={styles.action} onClick={() => setEditing(true)}>
              {copy.create}
            </button>
          </div>

          <div className={styles.block}>
            <h3 className={styles.blockTitle}>{copy.joinTitle}</h3>
            <button
              type="button"
              className={styles.action}
              onClick={() => void room.findGame(profile, STANDARD_OPTIONS)}
            >
              {copy.findGame}
            </button>
            <p className={styles.hint}>{copy.findHint}</p>

            <form className={styles.joinRow} onSubmit={submitJoin}>
              <label className={styles.codeLabel} htmlFor="room-code">
                {copy.codeLabel}
              </label>
              <div className={styles.joinControls}>
                <input
                  id="room-code"
                  className={styles.input}
                  value={code}
                  onChange={(event) => setCode(sanitiseCode(event.target.value))}
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
          </div>

          {editing && (
            <RoomSettingsDialog
              options={STANDARD_OPTIONS}
              confirmLabel={copy.openRoom}
              onCancel={() => setEditing(false)}
              onConfirm={(next) => {
                setEditing(false)
                void room.create(profile, next)
              }}
            />
          )}
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
