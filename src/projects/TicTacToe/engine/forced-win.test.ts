import { describe, expect, it } from 'vitest'
import { findForcedWin, hasForcedWin } from './forced-win'
import { applyMove, createBoard, legalMoves } from './board'
import { CELL_COUNT, cellIndex, findWinningLine } from './lines'
import { winningMoves } from './threats'
import { FORCED_CHAIN_DEPTH } from './search'
import { Board, Player } from '../tic-tac-toe.types'

const put = (board: Board, moves: [number, number, number][], player: Player) =>
  moves.reduce((next, [x, y, layer]) => applyMove(next, cellIndex(x, y, layer), player), board)

/** A budget that never runs out and never runs away: the searches here are all bounded by depth. */
const generous = { now: () => 0, deadline: 1, maxDepth: FORCED_CHAIN_DEPTH }

/** A fixed clock, so the budget is exercised without depending on how fast the machine is. */
const clock = (start = 0, step = 0) => {
  let time = start
  return () => {
    const value = time
    time += step
    return value
  }
}

/**
 * A position whose win takes two of the attacker's moves: the row at y=0 makes (2,0,0) a forcing three,
 * the block at (3,0,0) is compelled, and (2,0,0) meanwhile turns the x=2 column into one arm of a fork
 * with the y=1 rod, which the second move takes at (2,1,0).
 */
const chainBoard = () =>
  put(
    createBoard(),
    [
      [0, 0, 0],
      [1, 0, 0],
      [2, 3, 0],
      [2, 1, 2],
      [2, 1, 3],
    ],
    Player.one
  )

/**
 * Plays out the chain the search claims, with the defender always taking the only reply that does not
 * lose on the spot: block the single threat, or grab a win of their own if the attacker ever hands them
 * one. If the attacker still reaches four in a row, the win was genuinely forced.
 */
function defenderCannotEscape(board: Board, attacker: Player, other: Player): boolean {
  let state = board
  for (let move = 0; move < 40; move++) {
    const win = winningMoves(state, attacker)
    if (win.length > 0) return true
    const start = findForcedWin(state, attacker, generous)
    if (start === null) return false
    state = applyMove(state, start, attacker)
    if (findWinningLine(state, attacker)) return true

    // The defender's best try: win now if the attacker slipped, otherwise block the sole threat.
    const defenderWin = winningMoves(state, other)
    if (defenderWin.length > 0) return false
    const threats = winningMoves(state, attacker)
    if (threats.length >= 2) return true // a fork: the block cannot stop both
    if (threats.length === 0) return false
    state = applyMove(state, threats[0], other)
  }
  return false
}

describe('findForcedWin', () => {
  /**
   * The end of every chain: one move onto the square two lines share, making two threes at once. The
   * opponent blocks one and loses to the other.
   */
  it('plays the square that makes two threats in a single move', () => {
    // A row two-long and a column two-long that cross at the empty (2,0,0), opponent nowhere near.
    const board = put(
      createBoard(),
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 2, 0],
        [2, 3, 0],
      ],
      Player.one
    )
    expect(findForcedWin(board, Player.one, generous)).toBe(cellIndex(2, 0, 0))
    expect(hasForcedWin(board, Player.one, generous)).toBe(true)
    // The idle side has nothing to force.
    expect(hasForcedWin(board, Player.two, generous)).toBe(false)
  })

  /**
   * A chain the one-move check cannot see: no win and no fork on the board, but a forcing three drags the
   * opponent into blocking, and the blocking move clears the way to a fork.
   */
  it('finds a win that needs a forcing move first', () => {
    const board = chainBoard()

    // Nothing is available in one move: no completed line and no square that forks outright.
    expect(winningMoves(board, Player.one)).toEqual([])
    expect(findForcedWin(createBoard(), Player.one, generous)).toBeNull() // sanity: empty board forces nothing

    expect(findForcedWin(board, Player.one, generous)).toBe(cellIndex(2, 0, 0))
    expect(defenderCannotEscape(board, Player.one, Player.two)).toBe(true)
  })

  /** A lone three forces one block and then fizzles: a threat is not a forced win. */
  it('does not call a single unanswered threat a win', () => {
    const board = put(
      createBoard(),
      [
        [0, 0, 0],
        [1, 0, 0],
      ],
      Player.one
    )
    expect(findForcedWin(board, Player.one, generous)).toBeNull()
    expect(hasForcedWin(board, Player.one, generous)).toBe(false)
  })

  /** Two of the opponent's threats at once, and only one move to answer: nothing to force, already lost. */
  it('reports no win when the side to move is the one being forked', () => {
    const board = put(
      createBoard(),
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0], // threatens (3,0,0)
        [0, 1, 0],
        [1, 1, 0],
        [2, 1, 0], // threatens (3,1,0)
      ],
      Player.two
    )
    expect(findForcedWin(board, Player.one, generous)).toBeNull()
    expect(hasForcedWin(board, Player.one, generous)).toBe(false)
    // The forker, to move, simply has the win.
    expect(hasForcedWin(board, Player.two, generous)).toBe(true)
  })

  it('gives the same answer twice for the same position', () => {
    const board = put(
      createBoard(),
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 2, 0],
        [2, 3, 0],
      ],
      Player.one
    )
    expect(findForcedWin(board, Player.one, generous)).toBe(
      findForcedWin(board, Player.one, generous)
    )
  })

  /** The budget is a hard stop: with no time granted it proves nothing rather than overrunning. */
  it('reports nothing when the clock is already past the deadline', () => {
    const board = put(
      createBoard(),
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 2, 0],
        [2, 3, 0],
      ],
      Player.one
    )
    expect(
      findForcedWin(board, Player.one, {
        now: () => 5,
        deadline: 1,
        maxDepth: FORCED_CHAIN_DEPTH,
      })
    ).toBeNull()
  })

  /**
   * The other half of the budget: a deadline that lands part-way through, rather than before the first
   * move. The chain is there and provable, so a null here can only come from the clock — and the search
   * has to give up rather than report the unproven half of what it saw.
   */
  it('gives up when the deadline lands mid-search', () => {
    const board = chainBoard()
    expect(findForcedWin(board, Player.one, generous)).toBe(cellIndex(2, 0, 0))

    // Enough readings to enter the recursion, not enough to finish it.
    const cut = { now: clock(0, 1), deadline: 2, maxDepth: FORCED_CHAIN_DEPTH }
    expect(findForcedWin(board, Player.one, cut)).toBeNull()
    expect(hasForcedWin(board, Player.one, { ...cut, now: clock(0, 1) })).toBe(false)
  })

  /**
   * The depth limit is the other stop, and it has to bite: the same chain needs two of the attacker's own
   * moves, so a limit of one is short and must come back empty rather than reporting the first link.
   */
  it('reports nothing when the chain is longer than the depth allowed', () => {
    const board = chainBoard()
    expect(findForcedWin(board, Player.one, { ...generous, maxDepth: 1 })).toBeNull()
    expect(hasForcedWin(board, Player.one, { ...generous, maxDepth: 1 })).toBe(false)
    expect(findForcedWin(board, Player.one, { ...generous, maxDepth: 2 })).toBe(cellIndex(2, 0, 0))
  })

  /** No square to play means no chain to build, whatever else is on the board. */
  it('reports nothing on a full board', () => {
    let board = createBoard()
    for (let index = 0; index < CELL_COUNT; index++) {
      board = applyMove(board, index, index % 2 === 0 ? Player.one : Player.two)
    }
    expect(legalMoves(board)).toEqual([])

    for (const player of [Player.one, Player.two]) {
      expect(findForcedWin(board, player, generous)).toBeNull()
      expect(hasForcedWin(board, player, generous)).toBe(false)
    }
  })

  /**
   * One cell left: there is no room for a chain, so the answer is that cell when it completes a line and
   * nothing at all otherwise. Which of the two it is depends on the filled board, so the test asks.
   */
  it('answers a single free cell without looking for a chain', () => {
    let board = createBoard()
    for (let index = 0; index < CELL_COUNT - 1; index++) {
      board = applyMove(board, index, index % 2 === 0 ? Player.one : Player.two)
    }
    const [gap] = legalMoves(board)
    expect(legalMoves(board)).toHaveLength(1)

    for (const player of [Player.one, Player.two]) {
      const winsOutright = winningMoves(board, player).length > 0
      expect(findForcedWin(board, player, generous)).toBe(winsOutright ? gap : null)
      expect(hasForcedWin(board, player, generous)).toBe(winsOutright)
    }
  })
})
