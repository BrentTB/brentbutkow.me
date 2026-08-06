import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FunModeProvider } from '../../contexts/FunModeProvider'
import { RoomStatus, Seat, SeatInfo } from '../../multiplayer/multiplayer.types'
import { Connection, OnlineRoom, UseOnlineRoomOptions } from '../../multiplayer/useOnlineRoom'
import { saveRoomSession } from '../../multiplayer/room-session'
import { Othello } from './Othello'
import { BOARD_SIZE_LABELS, gameCopy } from './data'
import { OTHELLO_GAME_ID } from './online'
import { BoardSize } from './othello.types'

let baseRoom: OnlineRoom<number>
let roomOverrides: Partial<OnlineRoom<number>> = {}
let roomProps: UseOnlineRoomOptions<number> | null = null

vi.mock('../../multiplayer/useOnlineRoom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../multiplayer/useOnlineRoom')>()
  return {
    ...actual,
    useOnlineRoom: (options: UseOnlineRoomOptions<number>) => {
      roomProps = options
      return { ...baseRoom, ...roomOverrides }
    },
  }
})

const PINNED_SEED = 20260806

const seat = (which: Seat, name: string, joined = true): SeatInfo => ({
  seat: which,
  name,
  colour: '0',
  joined,
})

function idleRoom(): OnlineRoom<number> {
  return {
    connection: Connection.idle,
    status: null,
    code: null,
    mySeat: null,
    seats: [],
    version: 0,
    isMyTurn: false,
    opponentPresent: false,
    opponentLeft: false,
    firstSeat: Seat.first,
    outcome: null,
    winnerSeat: null,
    turnEndsAt: null,
    moveLimitSeconds: null,
    error: null,
    create: vi.fn(async () => undefined),
    join: vi.fn(async () => undefined),
    findGame: vi.fn(async () => undefined),
    submit: vi.fn(async () => true),
    publishProfile: vi.fn(async () => undefined),
    start: vi.fn(async () => undefined),
    canStart: false,
    changeSettings: vi.fn(async () => undefined),
    canChangeSettings: false,
    isOpen: false,
    leave: vi.fn(),
  }
}

const activeRoom = (overrides: Partial<OnlineRoom<number>> = {}): Partial<OnlineRoom<number>> => ({
  connection: Connection.connected,
  status: RoomStatus.active,
  code: 'AB2K9M',
  mySeat: Seat.first,
  seats: [seat(Seat.first, 'Ada'), seat(Seat.second, 'Linus')],
  opponentPresent: true,
  isMyTurn: true,
  ...overrides,
})

const holdASeat = () =>
  saveRoomSession(OTHELLO_GAME_ID, { code: 'AB2K9M', token: 'token', seat: Seat.first })

beforeEach(() => {
  baseRoom = idleRoom()
  roomOverrides = {}
  roomProps = null
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  window.sessionStorage.clear()
  window.localStorage.clear()
})

const renderGame = () => {
  const view = render(
    <MemoryRouter>
      <FunModeProvider>
        <Othello computerSeed={PINNED_SEED} />
      </FunModeProvider>
    </MemoryRouter>
  )
  const roomChanged = (next: Partial<OnlineRoom<number>>) => {
    roomOverrides = { ...roomOverrides, ...next }
    act(() => {
      view.rerender(
        <MemoryRouter>
          <FunModeProvider>
            <Othello computerSeed={PINNED_SEED} />
          </FunModeProvider>
        </MemoryRouter>
      )
    })
  }
  return { ...view, roomChanged }
}

const isDisabled = (element: HTMLElement) => element.hasAttribute('disabled')
// A taken cell ends "…, Dark"; a legal one ends "…legal move for Dark", so the comma keeps them apart.
const takenDiscs = () => screen.getAllByRole('button', { name: /, (Dark|Light)$/ })

describe('Othello — local play', () => {
  it('opens with the four centre discs and dark to move', () => {
    renderGame()
    expect(screen.getByText(gameCopy.turn('Dark'))).toBeTruthy()
    expect(takenDiscs()).toHaveLength(4)
  })

  it('plays a legal move, flips a disc, and passes the turn to light', () => {
    renderGame()
    fireEvent.click(screen.getByRole('button', { name: gameCopy.cellLegalLabel(3, 4, 'Dark') }))
    // Dark placed one and flipped one: four discs become five, and it is now light's move.
    expect(takenDiscs()).toHaveLength(5)
    expect(screen.getByText(gameCopy.turn('Light'))).toBeTruthy()
  })

  it('resizes the board to a new game when the size changes', () => {
    renderGame()
    fireEvent.click(screen.getByRole('radio', { name: BOARD_SIZE_LABELS[BoardSize.small] }))
    // 6×6 = 36 cells, back to the four opening discs.
    expect(screen.getAllByRole('button', { name: /^Row \d/ }).length).toBe(BoardSize.small ** 2)
    expect(takenDiscs()).toHaveLength(4)
  })
})

describe('Othello — online play', () => {
  it('locks the board when it is not your turn', () => {
    holdASeat()
    const { roomChanged } = renderGame()
    roomChanged(activeRoom({ isMyTurn: false }))
    for (const cell of screen.getAllByRole('button', { name: /^Row \d/ })) {
      expect(isDisabled(cell)).toBe(true)
    }
  })

  it('sends a tapped cell to the room on your turn', () => {
    holdASeat()
    const { roomChanged } = renderGame()
    roomChanged(activeRoom({ isMyTurn: true }))
    fireEvent.click(screen.getByRole('button', { name: gameCopy.cellLegalLabel(3, 4, 'Ada') }))
    expect(baseRoom.submit).toHaveBeenCalledWith(2 * 8 + 3) // idx(2,3) on the 8×8 board = 19
  })

  it('wires the room to Othello’s id and board size', () => {
    holdASeat()
    renderGame()
    expect(roomProps?.gameId).toBe(OTHELLO_GAME_ID)
    expect(roomProps?.cellCount).toBe(64)
  })
})
