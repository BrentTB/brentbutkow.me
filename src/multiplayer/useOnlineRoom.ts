import { useCallback, useEffect, useRef, useState } from 'react'
import { HttpError } from '../api/api'
import {
  beaconLeave,
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  matchmake,
  rematch,
  submitMove,
  updateProfile,
  updateSettings,
} from './rooms-api'
import { clearRoomFromUrl, showRoomInUrl } from './room-code'
import { clearRoomSession, loadRoomSession, saveRoomSession } from './room-session'
import {
  MoveCodec,
  Outcome,
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
  /** Called when a session or a fresh game begins, so the consumer can clear its board. */
  onReset?: () => void
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
  /** Clears the board for another game in the same room, with the other seat opening. */
  playAgain: () => Promise<void>
  /** Changes the room's own settings. Only the opener can, and only before the game starts. */
  changeSettings: (options: RoomOptions) => Promise<void>
  /** Whether this seat may change them, so a control can be shown rather than guessed at. */
  canChangeSettings: boolean
  isOpen: boolean
  leave: () => void
}

interface Session {
  code: string
  token: string
  seat: Seat
}

const rejectionMessage = (status: number): string => {
  if (status === 403) return 'It is not your turn.'
  if (status === 409) return 'The board moved on, try again.'
  if (status === 422) return 'That move is not allowed.'
  return 'Could not send your move.'
}

const joinFailure = (err: unknown): string => {
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

  const sessionRef = useRef<Session | null>(null)
  const roomRef = useRef<RoomState | null>(null)
  const appliedRef = useRef(0) // how many moves already handed to onRemoteMove
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
  }, [])

  /**
   * Brings the local board in line with the room.
   *
   * Moves are handed over one at a time from wherever the last one left off. A move list shorter than
   * the count already applied means another game has started in the same room, so the board is cleared
   * and replayed from the beginning.
   */
  const reconcile = useCallback((next: RoomState) => {
    if (next.moves.length < appliedRef.current) {
      appliedRef.current = 0
      onResetRef.current?.()
    }
    for (let i = appliedRef.current; i < next.moves.length; i++) {
      onMoveRef.current(codecRef.current.fromWire(next.moves[i]), i)
    }
    appliedRef.current = next.moves.length
    roomRef.current = next
    setRoom(next)
  }, [])

  const pollOnce = useCallback(async () => {
    const session = sessionRef.current
    if (session === null) return
    try {
      // The poll carries the seat token, so reading the room is also how a seat stays counted present.
      reconcile(await getRoom(session.code, session.token))
    } catch (err) {
      // A gone/expired room ends the session; a transient blip is ignored so it doesn't kill the game.
      if (err instanceof HttpError && (err.status === 404 || err.status === 410)) {
        stopPolling()
        setConnection(Connection.error)
        setError('This room is no longer available.')
      }
    }
  }, [reconcile, stopPolling])

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
    (session: Session, initial: RoomState) => {
      sessionRef.current = session
      appliedRef.current = 0
      onResetRef.current?.()
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

  /** Turns fresh credentials into a live session, reading the room so both seats are known. */
  const enter = useCallback(
    async (creds: { code: string; token: string; seat: Seat }) => {
      const state = await getRoom(creds.code, creds.token)
      begin({ code: creds.code, token: creds.token, seat: creds.seat }, state)
    },
    [begin]
  )

  const create = useCallback(
    async (profile: SeatProfile, options: RoomOptions = {}) => {
      setConnection(Connection.connecting)
      setError(null)
      try {
        await enter(await createRoom(gameId, profile, cellCount, options))
      } catch {
        setConnection(Connection.error)
        setError('Could not create the room.')
      }
    },
    [cellCount, enter, gameId]
  )

  const join = useCallback(
    async (code: string, profile: SeatProfile) => {
      setConnection(Connection.connecting)
      setError(null)
      try {
        await enter(await joinRoom(code, profile))
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
        await enter(await matchmake(gameId, profile, cellCount, options))
      } catch {
        setConnection(Connection.error)
        setError('Could not find a game.')
      }
    },
    [cellCount, enter, gameId]
  )

  const submit = useCallback(
    async (move: Move, finished = false, won = false): Promise<boolean> => {
      const session = sessionRef.current
      const current = roomRef.current
      if (session === null || current === null) return false
      try {
        const result = await submitMove(
          session.code,
          session.token,
          codecRef.current.toWire(move),
          appliedRef.current,
          finished,
          won
        )
        reconcile({
          ...current,
          moves: result.moves,
          status: result.status,
          version: result.version,
          outcome: result.outcome,
          winnerSeat: result.winnerSeat,
        })
        return true
      } catch (err) {
        // A rejected move (turn/stale/illegal) is recoverable: surface it, then re-poll to converge on
        // the server's truth so the consumer can drop its pending preview.
        setError(
          err instanceof HttpError ? rejectionMessage(err.status) : 'Could not send your move.'
        )
        void pollOnce()
        return false
      }
    },
    [pollOnce, reconcile]
  )

  const publishProfile = useCallback(
    async (profile: SeatProfile) => {
      const session = sessionRef.current
      if (session === null) return
      try {
        // The response is the whole room, so the opponent's latest details arrive with the write.
        reconcile(await updateProfile(session.code, session.token, profile))
      } catch {
        // Cosmetic: a failed rename leaves the old name showing, so it is not worth interrupting play.
      }
    },
    [reconcile]
  )

  const playAgain = useCallback(async () => {
    const session = sessionRef.current
    if (session === null) return
    try {
      reconcile(await rematch(session.code, session.token))
    } catch (err) {
      setError(
        err instanceof HttpError && err.status === 409
          ? 'Your opponent has to be here for another game.'
          : 'Could not start another game.'
      )
    }
  }, [reconcile])

  const changeSettings = useCallback(
    async (options: RoomOptions) => {
      const session = sessionRef.current
      if (session === null) return
      try {
        reconcile(await updateSettings(session.code, session.token, options))
      } catch (err) {
        setError(
          err instanceof HttpError && err.status === 409
            ? 'The game has already started.'
            : 'Could not change the settings.'
        )
      }
    },
    [reconcile]
  )

  /** Wipes the local session. Split out so both a deliberate leave and an unmount can use it. */
  const forget = useCallback(() => {
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
        if (!cancelled) begin(stored, state)
      } catch {
        // Gone, expired, or somebody else's seat: nothing to come back to, so drop it.
        clearRoomSession(gameId)
      }
    })()
    return () => {
      cancelled = true
      resumingRef.current = false
    }
  }, [begin, gameId])

  // A tab returning to the foreground catches up at once rather than waiting for the next interval.
  useEffect(() => {
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) void pollOnce()
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

  useEffect(() => stopPolling, [stopPolling]) // stop the loop on unmount

  const seats = room?.seats ?? []
  const firstSeat = room?.firstSeat ?? Seat.first
  const version = room?.version ?? 0
  const isMyTurn =
    mySeat !== null && room?.status === RoomStatus.active && (firstSeat + version) % 2 === mySeat
  const opponentSeat = seats.find((seat) => seat.seat !== mySeat)

  return {
    connection,
    status: room?.status ?? null,
    code: room?.code ?? null,
    mySeat,
    seats,
    version,
    isMyTurn,
    opponentPresent: seats.filter((seat) => seat.joined).length >= 2,
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
    playAgain,
    changeSettings,
    // The opener sets the terms, and only while the room is still waiting for its second player.
    canChangeSettings: mySeat === Seat.first && room?.status === RoomStatus.waiting,
    isOpen: room?.isOpen ?? false,
    leave,
  }
}
