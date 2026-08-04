import { useCallback, useEffect, useRef, useState } from 'react'
import { HttpError } from '../api/api'
import { createRoom, getRoom, joinRoom, submitMove, updateProfile } from './rooms-api'
import { MoveCodec, RoomState, RoomStatus, Seat, SeatInfo, SeatProfile } from './multiplayer.types'

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
  /** Called when a session begins, before any moves replay, so the consumer can clear its board. */
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
  error: string | null
  create: (profile: SeatProfile) => Promise<void>
  join: (code: string, profile: SeatProfile) => Promise<void>
  /** Sends a move; resolves true once the server accepts it, false on rejection (with `error` set). */
  submit: (move: Move, finished?: boolean) => Promise<boolean>
  /** Publishes your own name and colour to the room, so the opponent's board shows them. */
  publishProfile: (profile: SeatProfile) => Promise<void>
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

  const reconcile = useCallback(
    (next: RoomState) => {
      for (let i = appliedRef.current; i < next.moves.length; i++) {
        onMoveRef.current(codecRef.current.fromWire(next.moves[i]), i)
      }
      appliedRef.current = next.moves.length
      roomRef.current = next
      setRoom(next)
      if (next.status === RoomStatus.finished || next.status === RoomStatus.abandoned) stopPolling()
    },
    [stopPolling]
  )

  const pollOnce = useCallback(async () => {
    const session = sessionRef.current
    if (session === null) return
    try {
      reconcile(await getRoom(session.code))
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
      startPolling()
    },
    [reconcile, startPolling]
  )

  const create = useCallback(
    async (profile: SeatProfile) => {
      setConnection(Connection.connecting)
      setError(null)
      try {
        const creds = await createRoom(gameId, profile, cellCount)
        begin(
          { code: creds.code, token: creds.token, seat: creds.seat },
          {
            code: creds.code,
            gameId,
            cellCount,
            moves: [],
            // The creator's own seat, so their name and colour show before the first poll lands.
            seats: [{ seat: creds.seat, name: profile.name, colour: profile.colour, joined: true }],
            status: creds.status,
            version: 0,
            expiresAt: '',
          }
        )
      } catch {
        setConnection(Connection.error)
        setError('Could not create the room.')
      }
    },
    [begin, cellCount, gameId]
  )

  const join = useCallback(
    async (code: string, profile: SeatProfile) => {
      setConnection(Connection.connecting)
      setError(null)
      try {
        const creds = await joinRoom(code, profile)
        const state = await getRoom(creds.code)
        begin({ code: creds.code, token: creds.token, seat: creds.seat }, state)
      } catch (err) {
        setConnection(Connection.error)
        if (err instanceof HttpError && err.status === 409) setError('That room is already full.')
        else if (err instanceof HttpError && (err.status === 404 || err.status === 410))
          setError('That room code was not found.')
        else setError('Could not join the room.')
      }
    },
    [begin]
  )

  const submit = useCallback(
    async (move: Move, finished = false): Promise<boolean> => {
      const session = sessionRef.current
      const current = roomRef.current
      if (session === null || current === null) return false
      try {
        const result = await submitMove(
          session.code,
          session.token,
          codecRef.current.toWire(move),
          appliedRef.current,
          finished
        )
        reconcile({
          ...current,
          moves: result.moves,
          status: result.status,
          version: result.version,
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

  const leave = useCallback(() => {
    stopPolling()
    sessionRef.current = null
    roomRef.current = null
    appliedRef.current = 0
    setRoom(null)
    setMySeat(null)
    setConnection(Connection.idle)
    setError(null)
  }, [stopPolling])

  // A tab returning to the foreground catches up at once rather than waiting for the next interval.
  useEffect(() => {
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) void pollOnce()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [pollOnce])

  useEffect(() => stopPolling, [stopPolling]) // stop the loop on unmount

  const seats = room?.seats ?? []
  const version = room?.version ?? 0
  const isMyTurn = mySeat !== null && room?.status === RoomStatus.active && version % 2 === mySeat

  return {
    connection,
    status: room?.status ?? null,
    code: room?.code ?? null,
    mySeat,
    seats,
    version,
    isMyTurn,
    opponentPresent: seats.filter((seat) => seat.joined).length >= 2,
    error,
    create,
    join,
    submit,
    publishProfile,
    leave,
  }
}
