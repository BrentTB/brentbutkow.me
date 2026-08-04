import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError } from '../api/api'
import * as api from './rooms-api'
import { MoveCodec, RoomState, RoomStatus, Seat, SeatInfo } from './multiplayer.types'
import { useOnlineRoom } from './useOnlineRoom'

vi.mock('./rooms-api')
const mocked = vi.mocked(api)

// A move is just its cell index on the wire, so the codec is the identity.
const idCodec: MoveCodec<number> = { toWire: (m) => m, fromWire: (w) => w }

const seat = (n: Seat, colour: string): SeatInfo => ({ seat: n, colour, joined: true })

const state = (over: Partial<RoomState>): RoomState => ({
  code: 'AB2K9M',
  gameId: 'ttt',
  cellCount: 64,
  moves: [],
  seats: [seat(Seat.first, '1,2,3'), seat(Seat.second, '4,5,6')],
  status: RoomStatus.active,
  version: 0,
  expiresAt: '',
  ...over,
})

const setup = (onRemoteMove = vi.fn()) => {
  const view = renderHook(() =>
    useOnlineRoom({ gameId: 'ttt', cellCount: 64, codec: idCodec, onRemoteMove, pollMs: 1000 })
  )
  return { view, onRemoteMove }
}

beforeEach(() => {
  vi.useFakeTimers()
  mocked.createRoom.mockResolvedValue({
    code: 'AB2K9M',
    gameId: 'ttt',
    cellCount: 64,
    seat: Seat.first,
    token: 'tok',
    status: RoomStatus.waiting,
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('useOnlineRoom', () => {
  it('creates a room and connects as seat 0', async () => {
    const { view } = setup()
    await act(async () => {
      await view.result.current.create('1,2,3')
    })
    expect(mocked.createRoom).toHaveBeenCalledWith('ttt', '1,2,3', 64)
    expect(view.result.current.connection).toBe('connected')
    expect(view.result.current.mySeat).toBe(Seat.first)
    expect(view.result.current.status).toBe(RoomStatus.waiting)
    expect(view.result.current.opponentPresent).toBe(false)
  })

  it('applies the opponent move it sees on the next poll', async () => {
    const { view, onRemoteMove } = setup()
    await act(async () => {
      await view.result.current.create('1,2,3')
    })
    // Opponent has joined and played cell 9; it becomes seat 0's turn again at version 1.
    mocked.getRoom.mockResolvedValue(state({ moves: [9], version: 1 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(onRemoteMove).toHaveBeenCalledWith(9, 0)
    expect(view.result.current.opponentPresent).toBe(true)
    expect(view.result.current.isMyTurn).toBe(false) // version 1 → seat 1's turn
  })

  it('submits a move and applies the confirmed result', async () => {
    const { view, onRemoteMove } = setup()
    await act(async () => {
      await view.result.current.create('1,2,3')
    })
    // Both seats present, no moves yet: it is seat 0's turn.
    mocked.getRoom.mockResolvedValue(state({ moves: [], version: 0 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(view.result.current.isMyTurn).toBe(true)

    mocked.submitMove.mockResolvedValue({ version: 1, moves: [5], status: RoomStatus.active })
    let accepted: boolean | undefined
    await act(async () => {
      accepted = await view.result.current.submit(5)
    })
    expect(accepted).toBe(true)
    // expectedVersion is the applied-move count (0) — the current version.
    expect(mocked.submitMove).toHaveBeenCalledWith('AB2K9M', 'tok', 5, 0, false)
    expect(onRemoteMove).toHaveBeenCalledWith(5, 0)
  })

  it('reports a rejected move without applying it', async () => {
    const { view, onRemoteMove } = setup()
    await act(async () => {
      await view.result.current.create('1,2,3')
    })
    mocked.getRoom.mockResolvedValue(state({ moves: [], version: 0 }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
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

  it('replays the existing moves when joining a game in progress', async () => {
    mocked.joinRoom.mockResolvedValue({
      code: 'AB2K9M',
      gameId: 'ttt',
      cellCount: 64,
      seat: Seat.second,
      token: 'tok2',
      status: RoomStatus.active,
    })
    mocked.getRoom.mockResolvedValue(state({ moves: [3, 7], version: 2 }))

    const { view, onRemoteMove } = setup()
    await act(async () => {
      await view.result.current.join('AB2K9M', '4,5,6')
    })
    expect(onRemoteMove).toHaveBeenNthCalledWith(1, 3, 0)
    expect(onRemoteMove).toHaveBeenNthCalledWith(2, 7, 1)
    expect(view.result.current.mySeat).toBe(Seat.second)
    expect(view.result.current.isMyTurn).toBe(false) // version 2 → 2 % 2 = 0, so seat 0 is to move
  })
})
