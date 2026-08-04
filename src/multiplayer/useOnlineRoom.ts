import { useCallback, useEffect, useRef, useState } from 'react'
import { HttpError } from '../api/api'
import {
  beaconLeave,
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  matchmake,
  startGame,
  submitMove,
  updateProfile,
  updateSettings,
} from './rooms-api'
import { clearRoomFromUrl, showRoomInUrl } from './room-code'
import { RoomSession, clearRoomSession, loadRoomSession, saveRoomSession } from './room-session'
import {
  MoveCodec,
  Outcome,
  RoomCredentials,
  RoomOptions,
  RoomState,
  RoomStatus,
  Seat,
  SeatInfo,
  SeatProfile,
} from './multiplayer.types'

// A generic, turn-based online room. It coordinates two seats over short polling and knows no game's
// rules: a game supplies its id, its board size, and a codec mapping its move to the wire integer the
// server stores. Confirmed moves (the mover's own, echoed back, and the opponent's) are handed to
// `onRemoteMove` in order, so the consumer's deterministic engine stays the single source of truth.

const DEFAULT_POLL_MS = 2000

export const Connection = {
  idle: 'idle',
  connecting: 'connecting',
  connected: 'connected',
  error: 'error',
} as const
export type Connection = (typeof Connection)[keyof typeof Connection]

export interface UseOnlineRoomOptions<Move> {
  gameId: string
  cellCount: number
  codec: MoveCodec<Move>
  /** Called once per newly-confirmed move, in order, for both seats. `index` is its 0-based position. */
  onRemoteMove: (move: Move, index: number) => void
  /**
   * Called when a session or a fresh game begins, so the consumer can clear its board. Handed the room
   * it is clearing for: this runs before the new state is committed, so the consumer cannot read it yet,
   * and a game may open with either seat.
   */
  onReset?: (room: RoomState) => void
  pollMs?: number
}

export interface OnlineRoom<Move> {
  connection: Connection
  status: RoomStatus | null
  code: string | null
  mySeat: Seat | null
  seats: SeatInfo[]
  version: number
  isMyTurn: boolean
  opponentPresent: boolean
  /** True once somebody took the other seat and then left, as opposed to never having arrived. */
  opponentLeft: boolean
  /** Which seat opens the current game, so a consumer can map seats onto its own players. */
  firstSeat: Seat
  outcome: Outcome | null
  winnerSeat: Seat | null
  /** When the player on turn runs out of time, or null when no clock is running. */
  turnEndsAt: string | null
  moveLimitSeconds: number | null
  error: string | null
  create: (profile: SeatProfile, options?: RoomOptions) => Promise<void>
  join: (code: string, profile: SeatProfile) => Promise<void>
  /**
   * Drops into whoever is waiting for this game, opening a room to wait in when nobody is. The
   * options apply only to a room it opens; joining somebody plays by theirs.
   */
  findGame: (profile: SeatProfile, options?: RoomOptions) => Promise<void>
  /** Sends a move; resolves true once the server accepts it, false on rejection (with `error` set). */
  submit: (move: Move, finished?: boolean, won?: boolean) => Promise<boolean>
  /** Publishes your own name and colour to the room, so the opponent's board shows them. */
  publishProfile: (profile: SeatProfile) => Promise<void>
  /** Clears the board and begins play. Nothing starts on its own, first game or fifth. */
  start: () => Promise<void>
  /** Whether this seat may start a game: the owner's call, both players here, and none running. */
  canStart: boolean
  /**
   * Changes the room's own settings. Only the owner can, and only before the game starts. The whole
   * triple goes over: the endpoint replaces the settings rather than patching them.
   */
  changeSettings: (options: Required<RoomOptions>) => Promise<void>
  /** Whether this seat may change them, so a control can be shown rather than guessed at. */
  canChangeSettings: boolean
  isOpen: boolean
  leave: () => void
}

const rejectionMessage = (status: number): string => {
  if (status === 403) return 'It is not your turn.'
  if (status === 409) return 'The board moved on, try again.'
  if (status === 422) return 'That move is not allowed.'
  return 'Could not send your move.'
}

/**
 * A room that turns out to be for another game, or another board size.
 *
 * Its own error type so the reason survives back to whichever entry point asked, instead of arriving as
 * the generic "could not join" that a network failure gets.
 */
class RoomMismatchError extends Error {
  constructor() {
    super('That room is playing a different game.')
    this.name = 'RoomMismatchError'
  }
}

const entryFailure = (err: unknown, fallback: string): string =>
  err instanceof RoomMismatchError ? err.message : fallback

const joinFailure = (err: unknown): string => {
  if (err instanceof RoomMismatchError) return err.message
  if (err instanceof HttpError && err.status === 409) return 'That room is already full.'
  if (err instanceof HttpError && (err.status === 404 || err.status === 410)) {
    return 'That room code was not found.'
  }
  return 'Could not join the room.'
}

export function useOnlineRoom<Move>({
  gameId,
  cellCount,
  codec,
  onRemoteMove,
  onReset,
  pollMs = DEFAULT_POLL_MS,
}: UseOnlineRoomOptions<Move>): OnlineRoom<Move> {
  const [connection, setConnection] = useState<Connection>(Connection.idle)
  const [room, setRoom] = useState<RoomState | null>(null)
  const [mySeat, setMySeat] = useState<Seat | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sessionRef = useRef<RoomSession | null>(null)
  const roomRef = useRef<RoomState | null>(null)
  const appliedRef = useRef(0) // how many moves already handed to onRemoteMove
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /**
   * Bumped every time the session changes identity — a room entered, left, or unmounted.
   *
   * Captured before a request goes out and checked again after it comes back, so a response that
   * resolves into a room nobody is in any more is dropped rather than reviving it.
   */
  const epochRef = useRef(0)
  /** Bumped on every accepted update, so a read can tell whether it was overtaken while in flight. */
  const revisionRef = useRef(0)
  const inFlightRef = useRef(false)
  const pollAbortRef = useRef<AbortController | null>(null)

  // Held in refs so a changed callback or a poll tick never restarts the loop or fires a stale closure.
  const onMoveRef = useRef(onRemoteMove)
  onMoveRef.current = onRemoteMove
  const onResetRef = useRef(onReset)
  onResetRef.current = onReset
  const codecRef = useRef(codec)
  codecRef.current = codec

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    pollAbortRef.current?.abort()
    pollAbortRef.current = null
    inFlightRef.current = false
  }, [])

  /** Wipes the local session. Split out so a deliberate leave, a dead room and an unmount can share it. */
  const forget = useCallback(() => {
    epochRef.current += 1
    stopPolling()
    sessionRef.current = null
    roomRef.current = null
    appliedRef.current = 0
    setRoom(null)
    setMySeat(null)
    setConnection(Connection.idle)
    setError(null)
    // Nothing left to invite anyone into, so the link comes back out of the address bar.
    clearRoomFromUrl()
    clearRoomSession(gameId)
  }, [gameId, stopPolling])

  /**
   * Ends the session and says why.
   *
   * The session goes first and the message second: forgetting clears the error, so the other order
   * leaves the explanation on screen for a tenth of a second and then wipes it.
   */
  const endSession = useCallback(
    (message: string) => {
      forget()
      setConnection(Connection.error)
      setError(message)
    },
    [forget]
  )

  /**
   * Brings the local board in line with the room.
   *
   * Moves are handed over one at a time from wherever the last one left off. A move list shorter than
   * the count already applied means another game has started in the same room, so the board is cleared
   * and replayed from the beginning. Callers only hand over a snapshot nothing newer has overtaken —
   * a write's own response, or a read that finished without one landing in the meantime — so a shorter
   * list is a new game rather than a stale view of this one.
   *
   * A move off the board would no-op in the consumer's engine while the version marched on, flipping
   * whose turn it is without placing anything: the two boards would then disagree forever. Refusing the
   * snapshot ends the session instead, which is at least visible. Returns whether it was applied, so a
   * caller does not report success for a snapshot that just ended the session.
   */
  const reconcile = useCallback(
    (next: RoomState): boolean => {
      const playable = (wire: number) => Number.isInteger(wire) && wire >= 0 && wire < cellCount
      if (next.moves.length > cellCount || !next.moves.every(playable)) {
        endSession('This game no longer matches the board. Start a new one.')
        return false
      }

      if (next.moves.length < appliedRef.current) {
        appliedRef.current = 0
        onResetRef.current?.(next)
      }
      for (let i = appliedRef.current; i < next.moves.length; i++) {
        onMoveRef.current(codecRef.current.fromWire(next.moves[i]), i)
      }
      appliedRef.current = next.moves.length
      revisionRef.current += 1
      roomRef.current = next
      setRoom(next)
      return true
    },
    [cellCount, endSession]
  )

  /**
   * Reads the room once.
   *
   * Reads never overlap and never apply out of order. Only one is in flight at a time, and a read that
   * finishes after something newer has already been applied — the player's own move landing while it was
   * out, or a leave — is thrown away. Applying it would rewind the board to before that move, hand the
   * whole list back to the consumer a second time, and lose the newest move.
   *
   * `keepError` is for the read that follows a rejected move: it converges the board without wiping the
   * reason the move was turned down, which the player has not read yet.
   */
  const pollOnce = useCallback(
    async ({ keepError = false }: { keepError?: boolean } = {}) => {
      const session = sessionRef.current
      if (session === null || inFlightRef.current) return

      const epoch = epochRef.current
      const revision = revisionRef.current
      const controller = new AbortController()
      inFlightRef.current = true
      pollAbortRef.current = controller

      try {
        // The poll carries the seat token, so reading the room is also how a seat stays counted present.
        const next = await getRoom(session.code, session.token, controller.signal)
        if (epoch !== epochRef.current || revision !== revisionRef.current) return
        // A read that lands cleanly clears whatever the last rejection said, so "not your turn" does not
        // sit there as a live alert for the rest of the game.
        if (reconcile(next) && !keepError) setError(null)
      } catch (err) {
        if (epoch !== epochRef.current) return
        // A gone/expired room ends the session, so nothing is left pointing at a room that always fails.
        // A transient blip is ignored so it doesn't kill the game.
        if (err instanceof HttpError && (err.status === 404 || err.status === 410)) {
          endSession('This room is no longer available.')
        }
      } finally {
        if (pollAbortRef.current === controller) {
          pollAbortRef.current = null
          inFlightRef.current = false
        }
      }
    },
    [endSession, reconcile]
  )

  /**
   * Reads on every tick, background tabs included.
   *
   * Browsers already throttle interval timers in a hidden tab to roughly once a minute, which is the
   * battery saving this would otherwise be hand-rolling. Skipping ticks of our own on top of that
   * multiplies with the throttle and leaves a backgrounded game minutes stale, so the pacing is left
   * to the browser. Coming back to the tab forces an immediate read either way.
   *
   * The loop keeps running once a game finishes: either player may start another one, and that only
   * shows up on a read.
   */
  const startPolling = useCallback(() => {
    stopPolling()
    pollRef.current = setInterval(() => {
      void pollOnce()
    }, pollMs)
  }, [pollMs, pollOnce, stopPolling])

  const begin = useCallback(
    (session: RoomSession, initial: RoomState) => {
      epochRef.current += 1
      sessionRef.current = session
      appliedRef.current = 0
      onResetRef.current?.(initial)
      setMySeat(session.seat)
      reconcile(initial) // replays any moves already on the board (a mid-game join)
      setConnection(Connection.connected)
      setError(null)
      // The address bar becomes the invite, so the URL can be sent as-is without the copy button.
      showRoomInUrl(session.code)
      // Kept for this tab only, so reloading the page puts you back in the seat you are holding.
      saveRoomSession(gameId, session)
      startPolling()
    },
    [gameId, reconcile, startPolling]
  )

  /**
   * Whether a room is the one this hook is set up to play.
   *
   * Both come back on every response and neither is ours to assume: a stale invite, a hand-typed code or
   * a board resized between sessions all land you in a room whose moves mean something else entirely.
   */
  const belongsHere = useCallback(
    (state: RoomState) => state.gameId === gameId && state.cellCount === cellCount,
    [cellCount, gameId]
  )

  /**
   * Turns credentials being fetched into a live session, reading the room so both seats are known.
   *
   * Takes the request rather than its result so the epoch is captured before anything is in flight: a
   * create or join slow enough that you gave up and walked away must not drop you into the room when it
   * finally answers.
   */
  const enter = useCallback(
    async (credentials: Promise<RoomCredentials>) => {
      const epoch = epochRef.current
      const creds = await credentials
      if (epoch !== epochRef.current) return
      const state = await getRoom(creds.code, creds.token)
      if (epoch !== epochRef.current) return
      if (!belongsHere(state)) throw new RoomMismatchError()
      begin({ code: creds.code, token: creds.token, seat: creds.seat }, state)
    },
    [begin, belongsHere]
  )

  const create = useCallback(
    async (profile: SeatProfile, options: RoomOptions = {}) => {
      setConnection(Connection.connecting)
      setError(null)
      try {
        await enter(createRoom(gameId, profile, cellCount, options))
      } catch (err) {
        setConnection(Connection.error)
        setError(entryFailure(err, 'Could not create the room.'))
      }
    },
    [cellCount, enter, gameId]
  )

  const join = useCallback(
    async (code: string, profile: SeatProfile) => {
      setConnection(Connection.connecting)
      setError(null)
      try {
        await enter(joinRoom(code, profile))
      } catch (err) {
        setConnection(Connection.error)
        setError(joinFailure(err))
      }
    },
    [enter]
  )

  const findGame = useCallback(
    async (profile: SeatProfile, options: RoomOptions = {}) => {
      setConnection(Connection.connecting)
      setError(null)
      try {
        await enter(matchmake(gameId, profile, cellCount, options))
      } catch (err) {
        setConnection(Connection.error)
        setError(entryFailure(err, 'Could not find a game.'))
      }
    },
    [cellCount, enter, gameId]
  )

  const submit = useCallback(
    async (move: Move, finished = false, won = false): Promise<boolean> => {
      const session = sessionRef.current
      const current = roomRef.current
      if (session === null || current === null) return false
      const epoch = epochRef.current
      try {
        const result = await submitMove(
          session.code,
          session.token,
          codecRef.current.toWire(move),
          current.version,
          finished,
          won
        )
        if (epoch !== epochRef.current) return false
        const applied = reconcile({
          ...current,
          moves: result.moves,
          status: result.status,
          version: result.version,
          outcome: result.outcome,
          winnerSeat: result.winnerSeat,
          // The move handed the turn over, so the clock belongs to the next player's deadline rather
          // than the one this move just beat.
          turnEndsAt: result.turnEndsAt ?? null,
        })
        if (applied) setError(null)
        return applied
      } catch (err) {
        if (epoch !== epochRef.current) return false
        // A rejected move (turn/stale/illegal) is recoverable: surface it, then re-poll to converge on
        // the server's truth so the consumer can drop its pending preview.
        setError(
          err instanceof HttpError ? rejectionMessage(err.status) : 'Could not send your move.'
        )
        void pollOnce({ keepError: true })
        return false
      }
    },
    [pollOnce, reconcile]
  )

  const publishProfile = useCallback(
    async (profile: SeatProfile) => {
      const session = sessionRef.current
      if (session === null) return
      const epoch = epochRef.current
      try {
        // The response is the whole room, so the opponent's latest details arrive with the write.
        const state = await updateProfile(session.code, session.token, profile)
        if (epoch === epochRef.current) reconcile(state)
      } catch {
        // Cosmetic: a failed rename leaves the old name showing, so it is not worth interrupting play.
      }
    },
    [reconcile]
  )

  const start = useCallback(async () => {
    const session = sessionRef.current
    if (session === null) return
    const epoch = epochRef.current
    try {
      const state = await startGame(session.code, session.token)
      if (epoch !== epochRef.current) return
      if (reconcile(state)) setError(null)
    } catch (err) {
      if (epoch !== epochRef.current) return
      setError(
        err instanceof HttpError && err.status === 409
          ? 'Both players have to be here to start.'
          : 'Could not start the game.'
      )
    }
  }, [reconcile])

  const changeSettings = useCallback(
    async (options: Required<RoomOptions>) => {
      const session = sessionRef.current
      if (session === null) return
      const epoch = epochRef.current
      try {
        const state = await updateSettings(session.code, session.token, options)
        if (epoch !== epochRef.current) return
        if (reconcile(state)) setError(null)
      } catch (err) {
        if (epoch !== epochRef.current) return
        setError(
          err instanceof HttpError && err.status === 409
            ? 'The game has already started.'
            : 'Could not change the settings.'
        )
      }
    },
    [reconcile]
  )

  const leave = useCallback(() => {
    const session = sessionRef.current
    // Told to the server as well as forgotten locally, so the opponent hears about it at once rather
    // than waiting out the presence timeout.
    if (session !== null) void leaveRoom(session.code, session.token).catch(() => undefined)
    forget()
  }, [forget])

  /**
   * Puts you back in your seat after a reload.
   *
   * Resuming rather than rejoining: the seat is already yours, so the token stored for this tab is all it
   * takes, and the name, colour and side you had come back with it.
   *
   * Guarded by a ref so a re-rendered callback cannot drag you back into a room you have left, and the
   * guard is released on cleanup: React's development double-mount cancels the first attempt, and a guard
   * that stayed set would leave the second mount skipping the resume altogether.
   */
  const resumingRef = useRef(false)
  useEffect(() => {
    if (resumingRef.current) return
    resumingRef.current = true

    const stored = loadRoomSession(gameId)
    if (stored === null) return

    let cancelled = false
    void (async () => {
      try {
        const state = await getRoom(stored.code, stored.token)
        if (cancelled) return
        // A room for another game or another board size is not the seat you left, whatever the token says.
        if (!belongsHere(state)) {
          clearRoomSession(gameId)
          return
        }
        begin(stored, state)
      } catch {
        // Gone, expired, or somebody else's seat: nothing to come back to, so drop it.
        clearRoomSession(gameId)
      }
    })()
    return () => {
      cancelled = true
      resumingRef.current = false
    }
  }, [begin, belongsHere, gameId])

  // A tab returning to the foreground catches up at once rather than waiting for the next interval.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) void pollOnce()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [pollOnce])

  /**
   * A closed tab gives up its seat too.
   *
   * `pagehide` rather than `beforeunload`: it fires on mobile backgrounding as well, and it is the one
   * browsers still honour a beacon from.
   */
  useEffect(() => {
    const onGone = () => {
      const session = sessionRef.current
      if (session !== null) beaconLeave(session.code, session.token)
    }
    window.addEventListener('pagehide', onGone)
    return () => window.removeEventListener('pagehide', onGone)
  }, [])

  /**
   * Leaving the page gives up the seat, whether the tab closed or the router moved on.
   *
   * `pagehide` covers the tab; it does not fire on a client-side navigation, so the same beacon goes out
   * from here. Without it a seat walked away from sits there holding the room full until it times out.
   *
   * Bumping the epoch first invalidates anything still in flight, so a response that arrives after this
   * cannot feed the abandoned game back into a consumer that has already gone.
   */
  useEffect(
    () => () => {
      epochRef.current += 1
      stopPolling()
      const session = sessionRef.current
      if (session !== null) beaconLeave(session.code, session.token)
    },
    [stopPolling]
  )

  const seats = room?.seats ?? []
  const opponentSeat = seats.find((seat) => seat.seat !== mySeat)
  // Asked of the other seat itself rather than counted: two joined seats in a list that somehow
  // contains yours twice would otherwise read as an opponent who is not there.
  const opponentPresentNow = opponentSeat?.joined === true
  const firstSeat = room?.firstSeat ?? Seat.first
  /* The room is the owner's until they walk out, when the server hands it to whoever is left. */
  const isOwner = mySeat !== null && mySeat === room?.ownerSeat
  // The server bumps the version once per accepted move, so it doubles as the move count the turn
  // alternates on — the same field `submit` sends as its expected version.
  const version = room?.version ?? 0
  const isMyTurn =
    mySeat !== null && room?.status === RoomStatus.active && (firstSeat + version) % 2 === mySeat

  return {
    connection,
    status: room?.status ?? null,
    code: room?.code ?? null,
    mySeat,
    seats,
    version,
    isMyTurn,
    opponentPresent: opponentPresentNow,
    // A seat that exists but sits empty belongs to somebody who was here and went.
    opponentLeft: opponentSeat !== undefined && !opponentSeat.joined,
    firstSeat,
    outcome: room?.outcome ?? null,
    winnerSeat: room?.winnerSeat ?? null,
    turnEndsAt: room?.turnEndsAt ?? null,
    moveLimitSeconds: room?.moveLimitSeconds ?? null,
    error,
    create,
    join,
    findGame,
    submit,
    publishProfile,
    start,
    canStart: isOwner && opponentPresentNow && room?.status !== RoomStatus.active,
    changeSettings,
    // The opener sets the terms, and only while the room is still waiting for its second player.
    canChangeSettings: isOwner && room?.status !== RoomStatus.active,
    isOpen: room?.isOpen ?? false,
    leave,
  }
}
