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
    cellCount: 64,
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
    aim: vi.fn(async () => undefined),
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

  it('offers New game in a local game', () => {
    renderGame()
    expect(screen.getByRole('button', { name: gameCopy.newGame })).toBeTruthy()
  })

  it('ends with a result banner once the board is played out', () => {
    vi.useFakeTimers()
    try {
      renderGame()
      // A quick 6×6 hotseat game, playing the first legal move each turn until it is over.
      act(() => {
        fireEvent.click(screen.getByRole('radio', { name: BOARD_SIZE_LABELS[BoardSize.small] }))
      })

      const result = () => screen.queryByText(/wins$|level pegging/i)
      for (let step = 0; step < 120 && result() === null; step++) {
        const legal = screen.queryAllByRole('button', { name: /legal move for/ })
        act(() => {
          if (legal.length > 0) fireEvent.click(legal[0])
          // A side with no move auto-passes after a short notice; let that timer fire.
          else vi.advanceTimersByTime(1000)
        })
      }

      const banner = result()
      expect(banner).not.toBeNull()
      // The whole status bar is flagged as a finished game, which is what the accent styling keys off.
      expect(banner?.closest('[data-win]')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
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

  it('aims the first tap in confirm mode, so a timeout plays it rather than forfeiting', () => {
    localStorage.setItem('othello-move-commit', 'confirm')
    holdASeat()
    const { roomChanged } = renderGame()
    roomChanged(activeRoom({ isMyTurn: true }))
    fireEvent.click(screen.getByRole('button', { name: gameCopy.cellLegalLabel(3, 4, 'Ada') }))
    // First tap aims (tells the server) rather than committing the move.
    expect(baseRoom.aim).toHaveBeenCalledWith(2 * 8 + 3)
    expect(baseRoom.submit).not.toHaveBeenCalled()
  })

  it('wires the room to Othello’s id and board size', () => {
    holdASeat()
    renderGame()
    expect(roomProps?.gameId).toBe(OTHELLO_GAME_ID)
    expect(roomProps?.cellCount).toBe(64)
  })

  it('shows two unnamed players as their disc colours, not both the same', () => {
    holdASeat()
    const { roomChanged } = renderGame()
    // Both seats joined but neither has typed a name — the reported "both called Dark" case.
    roomChanged(
      activeRoom({ seats: [seat(Seat.first, ''), seat(Seat.second, '')], isMyTurn: true })
    )
    // The opener is dark, the other light: the opening discs read as one of each.
    expect(screen.getAllByRole('button', { name: /, Dark$/ }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /, Light$/ }).length).toBeGreaterThan(0)
  })

  it('does not claim a turn before the game has started', () => {
    holdASeat()
    const { roomChanged } = renderGame()
    // Both players are in the room, but nobody has pressed start yet.
    roomChanged(activeRoom({ status: RoomStatus.waiting, isMyTurn: false }))
    expect(screen.queryByText(gameCopy.online.theirTurn)).toBeNull()
    expect(screen.queryByText(gameCopy.online.yourTurn)).toBeNull()
  })

  it('hides the local undo/redo/New game controls in a room', () => {
    holdASeat()
    const { roomChanged } = renderGame()
    // A joiner (not the owner) especially should not see a local New game button — resetting the
    // board is the owner's call, through the room panel's Start / Play again.
    roomChanged(activeRoom({ mySeat: Seat.second }))
    expect(screen.queryByRole('button', { name: gameCopy.newGame })).toBeNull()
    expect(screen.queryByRole('button', { name: gameCopy.undo })).toBeNull()
    expect(screen.queryByRole('button', { name: gameCopy.redo })).toBeNull()
  })

  it('adopts the room’s board size when matched into a different one', () => {
    holdASeat()
    const { roomChanged } = renderGame()
    // Matched into a 10×10 room though this client defaulted to 8×8.
    roomChanged(activeRoom({ cellCount: 100 }))
    const largePill = screen.getByRole('radio', { name: BOARD_SIZE_LABELS[BoardSize.large] })
    expect(largePill.getAttribute('aria-checked')).toBe('true')
  })

  it('defaults your name to your disc colour, and lets you change it', () => {
    holdASeat()
    const { roomChanged } = renderGame()
    // A fresh room where neither seat has a name yet: your field starts as your colour, not empty.
    roomChanged(activeRoom({ seats: [seat(Seat.first, ''), seat(Seat.second, '')] }))
    const field = screen.getByLabelText(gameCopy.online.yourNameLabel) as HTMLInputElement
    expect(field.value).toBe('Dark') // seat 0 opens, so it plays dark

    fireEvent.change(field, { target: { value: 'Zed' } })
    expect(field.value).toBe('Zed')
  })

  it('restores a name you had typed when you reload into the seat', () => {
    holdASeat()
    const { roomChanged } = renderGame()
    // The server still has the name this seat published before the reload.
    roomChanged(activeRoom({ seats: [seat(Seat.first, 'Ada'), seat(Seat.second, '')] }))
    const field = screen.getByLabelText(gameCopy.online.yourNameLabel) as HTMLInputElement
    expect(field.value).toBe('Ada')
  })
})
