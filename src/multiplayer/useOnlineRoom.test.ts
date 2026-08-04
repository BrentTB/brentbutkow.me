import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../api/api'
import * as api from './rooms-api'
import {
  MoveCodec,
  Outcome,
  RoomCredentials,
  RoomState,
  RoomStatus,
  Seat,
  SeatInfo,
} from './multiplayer.types'
import { useOnlineRoom } from './useOnlineRoom'

vi.mock('./rooms-api')
const mocked = vi.mocked(api)

// The two players' profiles, distinct so a test can prove the seats never render alike.
const ADA = { name: 'Ada', colour: '1,2,3' }
const BO = { name: 'Bo', colour: '4,5,6' }

// A move is just its cell index on the wire, so the codec is the identity.
const idCodec: MoveCodec<number> = { toWire: (m) => m, fromWire: (w) => w }

const seat = (n: Seat, name: string, colour: string, joined = true): SeatInfo => ({
  seat: n,
  name,
  colour,
  joined,
})

const state = (over: Partial<RoomState>): RoomState => ({
  code: 'AB2K9M',
  gameId: 'ttt',
  cellCount: 64,
  moves: [],
  seats: [seat(Seat.first, 'Ada', '1,2,3'), seat(Seat.second, 'Bo', '4,5,6')],
  status: RoomStatus.active,
  version: 0,
  expiresAt: '',
  firstSeat: Seat.first,
  isOpen: false,
  moveLimitSeconds: null,
  turnEndsAt: null,
  outcome: null,
  winnerSeat: null,
  ...over,
})

const credentials = (over: Partial<RoomCredentials> = {}): RoomCredentials => ({
  code: 'AB2K9M',
  gameId: 'ttt',
  cellCount: 64,
  seat: Seat.first,
  token: 'tok',
  status: RoomStatus.waiting,
  ...over,
})

const setup = (onRemoteMove = vi.fn(), onReset = vi.fn()) => {
  const view = renderHook(() =>
    useOnlineRoom({
      gameId: 'ttt',
      cellCount: 64,
      codec: idCodec,
      onRemoteMove,
      onReset,
      pollMs: 1000,
    })
  )
  return { view, onRemoteMove, onReset }
}

/** Creates a room and settles the first poll, which is where both seats become known. */
const connect = async (view: ReturnType<typeof setup>['view'], room = state({})) => {
  mocked.getRoom.mockResolvedValue(room)
  await act(async () => {
    await view.result.current.create(ADA)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  mocked.createRoom.mockResolvedValue(credentials())
  mocked.getRoom.mockResolvedValue(state({}))
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('useOnlineRoom', () => {
  it('creates a room and connects as seat 0', async () => {
    const { view } = setup()
    await connect(
      view,
      state({ status: RoomStatus.waiting, seats: [seat(Seat.first, 'Ada', '1,2,3')] })
    )
    expect(mocked.createRoom).toHaveBeenCalledWith('ttt', ADA, 64, {})
    expect(view.result.current.connection).toBe('connected')
    expect(view.result.current.mySeat).toBe(Seat.first)
    expect(view.result.current.opponentPresent).toBe(false)
    expect(view.result.current.opponentLeft).toBe(false)
  })

  it('passes the room settings the creator chose', async () => {
    const { view } = setup()
    mocked.getRoom.mockResolvedValue(state({}))
    await act(async () => {
      await view.result.current.create(ADA, {
        firstSeat: Seat.second,
        isOpen: true,
        moveLimitSeconds: 60,
      })
    })
    expect(mocked.createRoom).toHaveBeenCalledWith('ttt', ADA, 64, {
      firstSeat: Seat.second,
      isOpen: true,
      moveLimitSeconds: 60,
    })
  })

  it('reads the poll with the seat token, which is what keeps the seat present', async () => {
    const { view } = setup()
    await connect(view)
    expect(mocked.getRoom).toHaveBeenCalledWith('AB2K9M', 'tok')
  })

  it('applies the opponent move it sees on the next poll', async () => {
    const { view, onRemoteMove } = setup()
    await connect(view)
    mocked.getRoom.mockResolvedValue(state({ moves: [9], version: 1 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(onRemoteMove).toHaveBeenCalledWith(9, 0)
    expect(view.result.current.opponentPresent).toBe(true)
    expect(view.result.current.isMyTurn).toBe(false) // one move in, so seat 1 is on turn
  })

  it('reports whose turn it is from whichever seat opens', async () => {
    const { view } = setup()
    // Seat 1 opens, so seat 0 (me) waits even at move zero.
    await connect(view, state({ firstSeat: Seat.second }))
    expect(view.result.current.firstSeat).toBe(Seat.second)
    expect(view.result.current.isMyTurn).toBe(false)

    mocked.getRoom.mockResolvedValue(state({ firstSeat: Seat.second, moves: [4], version: 1 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.isMyTurn).toBe(true)
  })

  it('submits a move and applies the confirmed result', async () => {
    const { view, onRemoteMove } = setup()
    await connect(view)
    expect(view.result.current.isMyTurn).toBe(true)

    mocked.submitMove.mockResolvedValue({
      version: 1,
      moves: [5],
      status: RoomStatus.active,
      outcome: null,
      winnerSeat: null,
    })
    let accepted: boolean | undefined
    await act(async () => {
      accepted = await view.result.current.submit(5)
    })
    expect(accepted).toBe(true)
    expect(mocked.submitMove).toHaveBeenCalledWith('AB2K9M', 'tok', 5, 0, false, false)
    expect(onRemoteMove).toHaveBeenCalledWith(5, 0)
  })

  it('passes on a winning move so the server can record who took it', async () => {
    const { view } = setup()
    await connect(view)
    mocked.submitMove.mockResolvedValue({
      version: 1,
      moves: [5],
      status: RoomStatus.finished,
      outcome: Outcome.win,
      winnerSeat: Seat.first,
    })
    await act(async () => {
      await view.result.current.submit(5, true, true)
    })
    expect(mocked.submitMove).toHaveBeenCalledWith('AB2K9M', 'tok', 5, 0, true, true)
    expect(view.result.current.outcome).toBe(Outcome.win)
    expect(view.result.current.winnerSeat).toBe(Seat.first)
  })

  it('reports a rejected move without applying it', async () => {
    const { view, onRemoteMove } = setup()
    await connect(view)
    onRemoteMove.mockClear()
    mocked.submitMove.mockRejectedValueOnce(new HttpError(403))

    let accepted: boolean | undefined
    await act(async () => {
      accepted = await view.result.current.submit(5)
    })
    expect(accepted).toBe(false)
    expect(onRemoteMove).not.toHaveBeenCalled()
    expect(view.result.current.error).toMatch(/your turn/i)
  })

  it('notices an opponent who was here and left', async () => {
    const { view } = setup()
    await connect(view)
    expect(view.result.current.opponentLeft).toBe(false)

    mocked.getRoom.mockResolvedValue(
      state({
        seats: [seat(Seat.first, 'Ada', '1,2,3'), seat(Seat.second, 'Bo', '4,5,6', false)],
        status: RoomStatus.finished,
        outcome: Outcome.forfeit,
        winnerSeat: Seat.first,
      })
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.opponentLeft).toBe(true)
    expect(view.result.current.outcome).toBe(Outcome.forfeit)
  })

  it('surfaces a loss on time from the room', async () => {
    const { view } = setup()
    await connect(view, state({ moveLimitSeconds: 30, turnEndsAt: '2030-01-01T00:00:30.000Z' }))
    expect(view.result.current.moveLimitSeconds).toBe(30)
    expect(view.result.current.turnEndsAt).toBe('2030-01-01T00:00:30.000Z')

    mocked.getRoom.mockResolvedValue(
      state({
        status: RoomStatus.finished,
        outcome: Outcome.timeout,
        winnerSeat: Seat.second,
        turnEndsAt: null,
      })
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.outcome).toBe(Outcome.timeout)
    expect(view.result.current.winnerSeat).toBe(Seat.second)
    expect(view.result.current.isMyTurn).toBe(false)
  })

  it('clears the board when another game starts in the same room', async () => {
    const { view, onRemoteMove, onReset } = setup()
    await connect(view, state({ moves: [1, 2], version: 2 }))
    expect(onRemoteMove).toHaveBeenCalledTimes(2)
    onReset.mockClear()
    onRemoteMove.mockClear()

    // A rematch empties the move list, which is how a fresh game announces itself.
    mocked.rematch.mockResolvedValue(state({ moves: [], version: 0, firstSeat: Seat.second }))
    await act(async () => {
      await view.result.current.playAgain()
    })
    expect(mocked.rematch).toHaveBeenCalledWith('AB2K9M', 'tok')
    expect(onReset).toHaveBeenCalled()
    expect(onRemoteMove).not.toHaveBeenCalled()
    expect(view.result.current.firstSeat).toBe(Seat.second)
  })

  it('explains a rematch nobody is around for', async () => {
    const { view } = setup()
    await connect(view)
    mocked.rematch.mockRejectedValueOnce(new HttpError(409))
    await act(async () => {
      await view.result.current.playAgain()
    })
    expect(view.result.current.error).toMatch(/opponent/i)
  })

  it('finds a game against anyone', async () => {
    const { view } = setup()
    mocked.matchmake.mockResolvedValue(credentials({ seat: Seat.second, token: 'tok2' }))
    mocked.getRoom.mockResolvedValue(state({}))
    await act(async () => {
      await view.result.current.findGame(BO, { moveLimitSeconds: 60 })
    })
    // The options only shape a room it opens; joining somebody plays by theirs.
    expect(mocked.matchmake).toHaveBeenCalledWith('ttt', BO, 64, { moveLimitSeconds: 60 })
    expect(view.result.current.mySeat).toBe(Seat.second)
    expect(view.result.current.connection).toBe('connected')
  })

  it('tells the server when you leave, and forgets the room', async () => {
    const { view } = setup()
    await connect(view)
    mocked.leaveRoom.mockResolvedValue(state({}))
    act(() => view.result.current.leave())

    expect(mocked.leaveRoom).toHaveBeenCalledWith('AB2K9M', 'tok')
    expect(view.result.current.connection).toBe('idle')
    expect(view.result.current.code).toBeNull()
    expect(view.result.current.mySeat).toBeNull()
  })

  it('gives up the seat when the page goes away', async () => {
    const { view } = setup()
    await connect(view)
    act(() => void window.dispatchEvent(new Event('pagehide')))
    expect(mocked.beaconLeave).toHaveBeenCalledWith('AB2K9M', 'tok')
  })

  it('replays the existing moves when joining a game in progress', async () => {
    mocked.joinRoom.mockResolvedValue(credentials({ seat: Seat.second, token: 'tok2' }))
    mocked.getRoom.mockResolvedValue(state({ moves: [3, 7], version: 2 }))

    const { view, onRemoteMove } = setup()
    await act(async () => {
      await view.result.current.join('AB2K9M', BO)
    })
    expect(onRemoteMove).toHaveBeenNthCalledWith(1, 3, 0)
    expect(onRemoteMove).toHaveBeenNthCalledWith(2, 7, 1)
    expect(view.result.current.mySeat).toBe(Seat.second)
    expect(view.result.current.isMyTurn).toBe(false) // two moves in, so seat 0 is on turn
  })
})
