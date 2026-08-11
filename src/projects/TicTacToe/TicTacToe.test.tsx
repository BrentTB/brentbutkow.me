import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FunModeProvider } from '../../contexts/FunModeProvider'
import { Outcome, RoomStatus, Seat, SeatInfo } from '../../multiplayer/multiplayer.types'
import { Connection, OnlineRoom, UseOnlineRoomOptions } from '../../multiplayer/useOnlineRoom'
import { saveRoomSession } from '../../multiplayer/room-session'
import { TicTacToe } from './TicTacToe'
import {
  DEFAULT_PLAYERS,
  MODE_LABELS,
  MOVE_COMMIT_LABELS,
  PLAYER_COLOURS,
  STARTER_LABELS,
  VIEW_LABELS,
  gameCopy,
} from './data'
import { MOVE_COMMIT_KEY } from './useMoveCommit'
import { TIC_TAC_TOE_GAME_ID } from './online'
import { THINKING_TIME_MS } from './useComputerTurn'
import { GameMode, MoveCommit, Player, Starter, ViewMode } from './tic-tac-toe.types'

/**
 * The room is faked wholesale rather than stubbing the network under it: these tests are about what the
 * page does with a room's answers, and the room's own behaviour has its own tests.
 *
 * `roomProps` catches the callbacks the page passes in, so a test can hand it a confirmed move.
 */
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

/** A seed the computer's whole game hangs off, so every run plays the same one. */
const PINNED_SEED = 20260804

const seat = (which: Seat, name: string, joined = true): SeatInfo => ({
  seat: which,
  name,
  colour: PLAYER_COLOURS[0].rgb,
  joined,
})

/** Built once per test, so the calls it records survive the re-renders a room's answers cause. */
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

/** A live room with both seats filled and a game running, which is where most online behaviour lives. */
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

/**
 * Puts the page in online mode the way a reload into a held seat does. Clicking the Online pill would do
 * too, but a room that reports itself connected before the page has entered one reads as having left.
 */
const holdASeat = () =>
  saveRoomSession(TIC_TAC_TOE_GAME_ID, { code: 'AB2K9M', token: 'token', seat: Seat.first })

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
        <TicTacToe computerSeed={PINNED_SEED} />
      </FunModeProvider>
    </MemoryRouter>
  )
  /** Re-renders with whatever `roomOverrides` now says, the way a poll answer would. */
  const roomChanged = (next: Partial<OnlineRoom<number>>) => {
    roomOverrides = { ...roomOverrides, ...next }
    act(() => {
      view.rerender(
        <MemoryRouter>
          <FunModeProvider>
            <TicTacToe computerSeed={PINNED_SEED} />
          </FunModeProvider>
        </MemoryRouter>
      )
    })
  }
  return { ...view, roomChanged }
}

const button = (name: string) => screen.getByRole('button', { name })

/** The setup controls are radio groups: one tab stop, arrow keys between the options. */
const option = (name: string) => screen.getByRole('radio', { name })

const cell = (x: number, y: number, layer: number) =>
  button(gameCopy.cellLabel(layer + 1, x + 1, y + 1))

/** Every cell holding a bead, whichever player owns it. */
const played = () => screen.getAllByRole('button', { name: /taken by/ })

/** Any cell still open, for assertions that are about the board rather than about one square of it. */
const anOpenCell = () =>
  screen.getAllByRole('button', { name: /^Layer \d+, column \d+, row \d+$/ })[0]

/** Runs the computer's whole turn: the paint beat, the search, and the pause that follows it. */
const letTheComputerMove = () => act(() => vi.advanceTimersByTime(THINKING_TIME_MS + 50))

describe('TicTacToe — one player', () => {
  /**
   * Regression: the board must take nothing while the computer holds the turn. Left open, a tap inside
   * the think pause ran the move through as the computer — a bead in the computer's colour on the cell
   * you picked — and the change of board cancelled the reply it had already chosen, handing the turn
   * back to you. You played both sides and the opponent never moved.
   */
  it('ignores a click while the computer is thinking', () => {
    vi.useFakeTimers()
    renderGame()

    fireEvent.click(option(MODE_LABELS[GameMode.onePlayer]))
    fireEvent.click(cell(0, 0, 0), { detail: 1 })

    expect(screen.getByText(gameCopy.thinking(gameCopy.computerName))).toBeTruthy()

    /* Any open cell, not a named one: which cell the computer takes is its business, and a test that
       reaches for a fixed square lands on a bead as soon as the search picks differently. */
    const elsewhere = anOpenCell()
    expect(elsewhere.getAttribute('aria-disabled')).toBe('true')

    fireEvent.click(elsewhere, { detail: 1 })
    expect(played()).toHaveLength(1)

    letTheComputerMove()
    expect(played()).toHaveLength(2)
  })

  it('hands the board back once the computer has moved', () => {
    vi.useFakeTimers()
    renderGame()

    fireEvent.click(option(MODE_LABELS[GameMode.onePlayer]))
    fireEvent.click(cell(0, 0, 0), { detail: 1 })
    letTheComputerMove()

    expect(anOpenCell().hasAttribute('aria-disabled')).toBe(false)
  })

  /**
   * Regression: with the computer opening, the only position behind the player is the empty board —
   * which is the computer's to move. Resting there started its turn again, and the reply it landed
   * dropped the rest of the history, so Undo destroyed the game instead of stepping back through it.
   */
  it('offers no undo when the only move so far is the computer opening', () => {
    vi.useFakeTimers()
    renderGame()

    fireEvent.click(option(MODE_LABELS[GameMode.onePlayer]))
    fireEvent.click(option(STARTER_LABELS[Starter.computer]))
    letTheComputerMove()

    expect(played()).toHaveLength(1)
    expect(button(gameCopy.undo).hasAttribute('disabled')).toBe(true)
  })

  it('steps back over the pair once both sides have moved', () => {
    vi.useFakeTimers()
    renderGame()

    fireEvent.click(option(MODE_LABELS[GameMode.onePlayer]))
    fireEvent.click(cell(0, 0, 0), { detail: 1 })
    letTheComputerMove()
    expect(played()).toHaveLength(2)

    fireEvent.click(button(gameCopy.undo))
    expect(screen.queryAllByRole('button', { name: /taken by/ })).toHaveLength(0)
  })
})

describe('TicTacToe — turning the cube with a finger', () => {
  /**
   * Regression: the same drag rotated the cube some of the time and scrolled the page the rest.
   * `touch-action: none` is not enough on its own — React registers `touchmove` passively, so nothing
   * handed to the JSX can refuse the pan — and CSS is invisible to this test besides. The listener that
   * does the refusing is native and non-passive, which is what `defaultPrevented` here sees.
   */
  it('refuses the page its scroll while the cube is the view', () => {
    renderGame()

    // `false` back from fireEvent means a handler called preventDefault.
    expect(fireEvent.touchMove(cell(0, 0, 0), { touches: [] })).toBe(false)
  })

  it('leaves the page its scroll on the fanned deck, which takes no drags', () => {
    renderGame()
    const stage = cell(0, 0, 0).closest('[data-orbitable]') as HTMLElement

    fireEvent.click(option(VIEW_LABELS[ViewMode.fanned]))

    expect(stage.isConnected).toBe(true)
    expect(stage.hasAttribute('data-orbitable')).toBe(false)
    expect(fireEvent.touchMove(stage, { touches: [] })).toBe(true)
  })

  /** The rail is exempt from the orbit gesture, so it has to stay exempt from the pan refusal too. */
  it('leaves the page its scroll on the layer rail, which starts no turn', () => {
    renderGame()
    const rail = document.querySelector('[data-rail] button') as HTMLElement

    expect(fireEvent.touchMove(rail, { touches: [] })).toBe(true)
  })
})

describe('TicTacToe — two players', () => {
  it('lets both seats play in turn with no lock between them', () => {
    renderGame()

    fireEvent.click(cell(0, 0, 0), { detail: 1 })
    expect(played()).toHaveLength(1)

    fireEvent.click(cell(1, 0, 0), { detail: 1 })
    expect(played()).toHaveLength(2)
  })
})

describe('TicTacToe — online', () => {
  it('closes the board while the turn belongs to the other player', () => {
    roomOverrides = activeRoom({ isMyTurn: false })
    holdASeat()
    renderGame()

    expect(cell(0, 0, 0).getAttribute('aria-disabled')).toBe('true')

    fireEvent.click(cell(0, 0, 0), { detail: 1 })

    expect(baseRoom.submit).not.toHaveBeenCalled()
    expect(screen.queryAllByRole('button', { name: /taken by/ })).toHaveLength(0)
  })

  it('sends a move on the one press, and only plays it when the room confirms it back', () => {
    roomOverrides = activeRoom()
    holdASeat()
    renderGame()

    fireEvent.click(cell(0, 0, 0), { detail: 1 })

    expect(baseRoom.submit).toHaveBeenCalledWith(0, false, false)
    // Nothing lands until the room says so: the board follows confirmed moves, not local optimism.
    expect(screen.queryAllByRole('button', { name: /taken by/ })).toHaveLength(0)

    act(() => roomProps?.onRemoteMove(0, 0))
    expect(played()).toHaveLength(1)
  })

  /** A committed move belongs to both players, so the take-backs and a unilateral new game step out. */
  it('offers no undo, redo, or new game in a room', () => {
    roomOverrides = activeRoom()
    holdASeat()
    renderGame()

    for (const label of [gameCopy.undo, gameCopy.redo, gameCopy.newGame]) {
      expect(screen.queryByRole('button', { name: label })).toBeNull()
    }
  })

  it('reads a game decided by the clock, and one decided by a walkout', () => {
    roomOverrides = activeRoom({
      status: RoomStatus.finished,
      outcome: Outcome.timeout,
      winnerSeat: Seat.first,
      isMyTurn: false,
    })
    holdASeat()
    const { roomChanged } = renderGame()

    expect(screen.getByText(gameCopy.online.wonOnTime('Ada'))).toBeTruthy()

    roomChanged({ outcome: Outcome.forfeit, winnerSeat: Seat.second })
    expect(screen.getByText(gameCopy.online.wonByDefault('Linus'))).toBeTruthy()
  })

  /**
   * Regression: the name fell back to whoever was on turn when no winning seat came back — which after a
   * timeout is the player who just lost, announced as the winner.
   */
  it('names nobody rather than the loser when the room reports no winner', () => {
    roomOverrides = activeRoom({
      status: RoomStatus.finished,
      outcome: Outcome.timeout,
      winnerSeat: null,
      isMyTurn: false,
    })
    holdASeat()
    renderGame()

    expect(screen.queryByText(gameCopy.online.wonOnTime('Ada'))).toBeNull()
    expect(screen.queryByText(gameCopy.online.wonOnTime('Linus'))).toBeNull()
  })

  /**
   * Regression: an opponent who walked out mid-game left an empty seat, and the status line read that as a
   * room still waiting for its first player.
   */
  it('says the opponent left rather than that it is waiting for one', () => {
    roomOverrides = activeRoom({
      status: RoomStatus.waiting,
      opponentPresent: false,
      opponentLeft: true,
      isMyTurn: false,
      seats: [seat(Seat.first, 'Ada'), seat(Seat.second, 'Linus', false)],
    })
    holdASeat()
    renderGame()

    // Twice over: the status line above the board, and the room panel's own note.
    expect(screen.getAllByText(gameCopy.online.opponentLeft('Linus'))).toHaveLength(2)
    expect(screen.queryByText(gameCopy.online.waiting)).toBeNull()
  })

  /**
   * The seat the room gives you decides who you are while your details are still at their defaults: joining
   * as the second seat makes you Player 2 in Player 2's colour, not a second Player 1 in the same amber.
   */
  it('takes on the seat the room hands you', () => {
    const asDefault = DEFAULT_PLAYERS[Player.one].name
    roomOverrides = activeRoom({
      mySeat: Seat.second,
      isMyTurn: false,
      seats: [seat(Seat.first, asDefault), seat(Seat.second, asDefault)],
    })
    holdASeat()
    renderGame()

    const field = screen.getByLabelText(gameCopy.online.yourNameLabel) as HTMLInputElement
    expect(field.value).toBe(DEFAULT_PLAYERS[Player.two].name)
  })

  /** A name somebody actually typed comes back with the seat, rather than being reset to its number. */
  it('keeps a name of your own over the seat default', () => {
    roomOverrides = activeRoom({
      mySeat: Seat.second,
      isMyTurn: false,
      seats: [seat(Seat.first, 'Ada'), seat(Seat.second, 'Grace')],
    })
    holdASeat()
    renderGame()

    expect((screen.getByLabelText(gameCopy.online.yourNameLabel) as HTMLInputElement).value).toBe(
      'Grace'
    )
  })

  /**
   * Regression: the opening move reaches the local game through the room's reset, which only fires when a
   * game begins. Changed before the first one, this screen kept opening as player one — so the opponent's
   * beads arrived in your colour under your name, and a win was credited to the wrong player.
   */
  it('re-opens the empty board when the room hands the opening move over', () => {
    roomOverrides = activeRoom({ status: RoomStatus.waiting, isMyTurn: false })
    holdASeat()
    const { roomChanged } = renderGame()

    expect(screen.getByText(gameCopy.turn('Ada'))).toBeTruthy()

    roomChanged({ firstSeat: Seat.second })

    expect(screen.getByText(gameCopy.turn('Linus'))).toBeTruthy()
  })

  /**
   * Regression: the arrow keys ignored the lock on the opponent choice, so a keystroke on the Online pill
   * switched modes — which leaves the room, and mid-game the server reads that as a forfeit.
   */
  it('will not let the keyboard walk out of a live room', () => {
    roomOverrides = activeRoom()
    holdASeat()
    renderGame()
    const online = option(MODE_LABELS[GameMode.online])
    ;(baseRoom.leave as ReturnType<typeof vi.fn>).mockClear()

    fireEvent.keyDown(online, { key: 'ArrowLeft' })
    fireEvent.keyDown(online, { key: 'Home' })

    expect(baseRoom.leave).not.toHaveBeenCalled()
    expect(option(MODE_LABELS[GameMode.online]).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText(gameCopy.online.modeLocked)).toBeTruthy()
  })
})

describe('TicTacToe — online, confirming each move', () => {
  const aimFirst = () => window.localStorage.setItem(MOVE_COMMIT_KEY, MoveCommit.confirm)

  it('aims on the first press and sends nothing', () => {
    aimFirst()
    roomOverrides = activeRoom()
    holdASeat()
    renderGame()

    fireEvent.click(cell(0, 0, 0), { detail: 1 })

    expect(baseRoom.submit).not.toHaveBeenCalled()
    const aimed = button(gameCopy.cellPendingLabel(1, 1, 1))
    expect(aimed.getAttribute('data-pending')).toBe('true')
  })

  it('sends it on a second press of the same cell', () => {
    aimFirst()
    roomOverrides = activeRoom()
    holdASeat()
    renderGame()

    fireEvent.click(cell(0, 0, 0), { detail: 1 })
    fireEvent.click(button(gameCopy.cellPendingLabel(1, 1, 1)), { detail: 1 })

    expect(baseRoom.submit).toHaveBeenCalledWith(0, false, false)
  })

  /** Aiming elsewhere only moves the ghost, so a mis-tap costs nothing. */
  it('moves the aim to another cell instead of sending', () => {
    aimFirst()
    roomOverrides = activeRoom()
    holdASeat()
    renderGame()

    fireEvent.click(cell(0, 0, 0), { detail: 1 })
    fireEvent.click(cell(1, 0, 0), { detail: 1 })

    expect(baseRoom.submit).not.toHaveBeenCalled()
    expect(screen.getAllByRole('button', { name: /waiting to be confirmed/ })).toHaveLength(1)
    expect(button(gameCopy.cellPendingLabel(1, 2, 1)).getAttribute('data-pending')).toBe('true')
  })

  it('sends the aimed move from the confirm button as well', () => {
    aimFirst()
    roomOverrides = activeRoom()
    holdASeat()
    renderGame()

    expect(button(gameCopy.online.confirmMove).hasAttribute('disabled')).toBe(true)

    fireEvent.click(cell(0, 0, 0), { detail: 1 })
    fireEvent.click(button(gameCopy.online.confirmMove))

    expect(baseRoom.submit).toHaveBeenCalledWith(0, false, false)
  })

  it('drops the aim on Clear', () => {
    aimFirst()
    roomOverrides = activeRoom()
    holdASeat()
    renderGame()

    fireEvent.click(cell(0, 0, 0), { detail: 1 })
    fireEvent.click(button(gameCopy.online.clearMove))

    expect(screen.queryAllByRole('button', { name: /waiting to be confirmed/ })).toHaveLength(0)
  })

  /** A move aimed at one turn on one board has nothing to mean once the turn is gone. */
  it('drops the aim when the turn passes', () => {
    aimFirst()
    roomOverrides = activeRoom()
    holdASeat()
    const { roomChanged } = renderGame()

    fireEvent.click(cell(0, 0, 0), { detail: 1 })
    expect(screen.getAllByRole('button', { name: /waiting to be confirmed/ })).toHaveLength(1)

    roomChanged({ isMyTurn: false })

    expect(screen.queryAllByRole('button', { name: /waiting to be confirmed/ })).toHaveLength(0)
  })

  it('drops the aim when the setting goes back to playing at once', () => {
    aimFirst()
    roomOverrides = activeRoom()
    holdASeat()
    renderGame()

    fireEvent.click(cell(0, 0, 0), { detail: 1 })
    fireEvent.click(option(MOVE_COMMIT_LABELS[MoveCommit.instant]))

    expect(screen.queryAllByRole('button', { name: /waiting to be confirmed/ })).toHaveLength(0)
    expect(screen.queryByRole('button', { name: gameCopy.online.confirmMove })).toBeNull()
  })

  /** With no room to aim a move at, the pair could only ever render greyed out. */
  it('keeps the confirm controls off the page until there is a room', () => {
    aimFirst()
    renderGame()

    fireEvent.click(option(MODE_LABELS[GameMode.online]))

    expect(screen.queryByRole('button', { name: gameCopy.online.confirmMove })).toBeNull()
    expect(screen.queryByRole('button', { name: gameCopy.online.clearMove })).toBeNull()
  })
})

describe('TicTacToe — a move already on its way', () => {
  /**
   * Regression: nothing closed the board between sending a move and hearing back, so a second tap sent the
   * same turn twice and the user was shown the server's "the board moved on" for their own double press.
   */
  it('takes no second move while the first is still in flight', async () => {
    let release = () => undefined as void
    const submit = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          release = () => resolve(true)
        })
    )
    roomOverrides = activeRoom({ submit })
    holdASeat()
    renderGame()

    fireEvent.click(cell(0, 0, 0), { detail: 1 })
    expect(submit).toHaveBeenCalledTimes(1)

    fireEvent.click(cell(1, 0, 0), { detail: 1 })
    expect(submit).toHaveBeenCalledTimes(1)
    expect(cell(1, 0, 0).getAttribute('aria-disabled')).toBe('true')

    await act(async () => {
      release()
    })

    expect(cell(1, 0, 0).hasAttribute('aria-disabled')).toBe(false)
  })
})
