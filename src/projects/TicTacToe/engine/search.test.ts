import { describe, expect, it } from 'vitest'
import { EXACT_SEARCH_CELLS, FORCED_CHAIN_DEPTH, candidates, findBestMove } from './search'
import { LOSS_VALUE, WIN_VALUE, orderedMoves, scorePosition } from './evaluate'
import { applyMove, createBoard, legalMoves, opponentOf } from './board'
import { BOARD_SIZE, CELL_COUNT, cellIndex, findWinningLine } from './lines'
import { findForcedWin, hasForcedWin } from './forced-win'
import { winningMoves } from './threats'
import { Board, Player } from '../tic-tac-toe.types'

const put = (board: Board, moves: [number, number, number][], player: Player) =>
  moves.reduce((next, [x, y, layer]) => applyMove(next, cellIndex(x, y, layer), player), board)

/** The threat-space budget findBestMove uses, made never-ending so a mirror sees the same verdict. */
const forcedOpts = { now: () => 0, deadline: 1, maxDepth: FORCED_CHAIN_DEPTH }

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
 * Fills the board down to about `freeCells` remaining, leaving no completed line and no forced reply for
 * either side, so what the search does is down to the search rather than to an outright win on the board.
 * A cell that would break that is skipped, so the count is a target rather than a promise.
 */
function boardWithFreeCells(freeCells: number): Board {
  let board = createBoard()
  let filled = 0
  for (let index = 0; index < CELL_COUNT && filled < CELL_COUNT - freeCells; index++) {
    const player = filled % 2 === 0 ? Player.one : Player.two
    const next = applyMove(board, index, player)
    if (findWinningLine(next, player)) continue
    if (winningMoves(next, Player.one).length > 0) continue
    if (winningMoves(next, Player.two).length > 0) continue
    board = next
    filled++
  }
  return board
}

describe('findBestMove', () => {
  it('returns nothing on a full board', () => {
    let board = createBoard()
    for (let index = 0; index < CELL_COUNT; index++) {
      board = applyMove(board, index, index % 2 === 0 ? Player.one : Player.two)
    }
    expect(findBestMove(board, Player.one)).toBeNull()
  })

  it('takes an available win immediately, without spending the budget', () => {
    const board = put(
      createBoard(),
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ],
      Player.one
    )
    const result = findBestMove(board, Player.one, { budgetMs: 0, now: clock() })
    expect(result?.move).toBe(cellIndex(3, 0, 0))
    expect(result?.score).toBe(WIN_VALUE)
    expect(result?.nodes).toBe(1)
  })

  it('blocks the opponent when they are one move from winning', () => {
    const board = put(
      createBoard(),
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ],
      Player.two
    )
    const result = findBestMove(board, Player.one, { budgetMs: 0, now: clock() })
    expect(result?.move).toBe(cellIndex(3, 0, 0))
  })

  it('prefers its own win over blocking theirs', () => {
    let board = put(
      createBoard(),
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ],
      Player.one
    )
    board = put(
      board,
      [
        [0, 3, 3],
        [1, 3, 3],
        [2, 3, 3],
      ],
      Player.two
    )
    expect(findBestMove(board, Player.one, { budgetMs: 0, now: clock() })?.move).toBe(
      cellIndex(3, 0, 0)
    )
  })

  /**
   * With a budget of nothing it still has to hand back a legal move. Not just any legal move: the move
   * ordering has already ranked the cells, so the answer is the best-looking one rather than the lowest
   * free index, which mid-game is an arbitrary corner of the board.
   */
  it('falls back to the best-ordered move when there is no time to think', () => {
    const board = put(createBoard(), [[1, 1, 1]], Player.two)
    const result = findBestMove(board, Player.one, { budgetMs: 0, now: clock(0, 1000) })

    expect(legalMoves(board)).toContain(result?.move)
    expect(result?.move).toBe(orderedMoves(board, Player.one)[0])
    expect(result?.depth).toBe(0)
  })

  /**
   * Regression: a deadline landing inside the last candidate leaves the loop normally, so the pass used
   * to look finished. Its scores are missing every move it never visited, which reads as better than the
   * position is, and taking that as the answer plays on evidence the search does not have.
   *
   * The clock steps far enough per reading that time runs out during the pass, and `depth` is what tells
   * on it: no pass ever completed, so there is nothing to report but the fallback.
   */
  it('does not report a pass that ran out of time part-way through', () => {
    const board = put(createBoard(), [[1, 1, 1]], Player.two)
    const result = findBestMove(board, Player.one, {
      budgetMs: 10,
      now: clock(0, 4),
      maxDepth: 4,
    })

    expect(result?.depth).toBe(0)
    expect(legalMoves(board)).toContain(result?.move)
  })

  it('answers a forced move without pretending to have scored it', () => {
    let board = createBoard()
    for (let index = 0; index < CELL_COUNT - 1; index++) {
      board = applyMove(board, index, index % 2 === 0 ? Player.one : Player.two)
    }
    const [only] = legalMoves(board)

    const result = findBestMove(board, Player.one, { budgetMs: 0, now: clock() })
    expect(result?.move).toBe(only)
    expect(result?.score).toBe(0)
    expect(result?.exact).toBe(true)
  })

  it('searches deeper when given a longer budget', () => {
    const board = put(createBoard(), [[1, 1, 1]], Player.two)
    const shallow = findBestMove(board, Player.one, { budgetMs: 1, now: clock(0, 1) })
    const deeper = findBestMove(board, Player.one, { budgetMs: 5000, maxDepth: 3 })
    expect(deeper?.depth).toBeGreaterThanOrEqual(shallow?.depth ?? 0)
  })

  /**
   * A fork is the shape that actually wins this game: two lines each one move short, so only one can be
   * blocked. The search has to find it two plies out rather than settling for any old placement.
   */
  it('plays the move that leaves two lines one short at once', () => {
    // Two of a row and two of a column meeting at a free corner, with the opponent out of the way.
    let board = put(
      createBoard(),
      [
        [1, 0, 0],
        [2, 0, 0],
        [0, 1, 0],
        [0, 2, 0],
      ],
      Player.one
    )
    board = put(board, [[3, 3, 3]], Player.two)

    const result = findBestMove(board, Player.one, { budgetMs: 3000, maxDepth: 4 })
    expect(result?.move).toBe(cellIndex(0, 0, 0))
  })

  /**
   * The tail of the game, where a mistake cannot be recovered from: with few enough cells left the whole
   * remaining tree is searched rather than cut off at a depth. `nodes` is what proves the search ran —
   * an immediate win or a forced block is answered before it, and reports `exact` on one node.
   */
  it('searches the whole remaining tree once few enough cells are free', () => {
    // In this exhaustive-tail regime the threat-space passes stand down, so the full search is what answers.
    const board = boardWithFreeCells(EXACT_SEARCH_CELLS)

    const free = legalMoves(board).length
    expect(free).toBeLessThanOrEqual(EXACT_SEARCH_CELLS)
    expect(winningMoves(board, Player.one)).toEqual([])
    expect(winningMoves(board, Player.two)).toEqual([])

    /* The depth cap is what the tail search overrides: asked for two plies on a board this empty it
       would stop there, and the win three plies out would be invisible. */
    const result = findBestMove(board, Player.one, { budgetMs: 5000, maxDepth: 2 })

    expect(result?.nodes).toBeGreaterThan(1)
    expect(result?.depth).toBeGreaterThan(2)
    expect(result?.exact).toBe(true)
  })

  it('never suggests an occupied cell', () => {
    let board = createBoard()
    board = put(
      board,
      [
        [0, 0, 0],
        [2, 2, 2],
      ],
      Player.one
    )
    board = put(
      board,
      [
        [1, 1, 1],
        [3, 3, 3],
      ],
      Player.two
    )

    for (const player of [Player.one, Player.two]) {
      const result = findBestMove(board, player, { budgetMs: 200 })
      expect(board[result?.move ?? -1]).toBeNull()
    }
  })

  /**
   * The search must be deterministic: same position, same budget, same move. The clock is injected, so a
   * loaded machine cannot finish a different number of deepening passes between the two calls.
   */
  it('gives the same answer twice for the same position', () => {
    const board = put(createBoard(), [[1, 1, 1]], Player.two)
    const limits = { budgetMs: 2000, maxDepth: 3 }
    const first = findBestMove(board, Player.one, { ...limits, now: clock() })
    const second = findBestMove(board, Player.one, { ...limits, now: clock() })
    expect(first?.move).toBe(second?.move)
    expect(first?.depth).toBe(second?.depth)
  })

  it('sees a win coming two moves out and does not walk into it', () => {
    // The opponent holds two of a rod and the two cells above it are free.
    const board = put(
      createBoard(),
      [
        [1, 1, 0],
        [1, 1, 1],
      ],
      Player.two
    )
    const result = findBestMove(board, Player.one, { budgetMs: 3000, maxDepth: 4 })

    /* It has to take one of the two cells that keep the rod from being completed. Leaving both free
       lets the opponent make three with the fourth still open, which cannot then be blocked. */
    const after = applyMove(board, result?.move ?? 0, Player.one)
    const rodStillOpen = [cellIndex(1, 1, 2), cellIndex(1, 1, 3)].filter(
      (cell) => after[cell] === null
    )
    expect(rodStillOpen).toHaveLength(1)
  })
})

describe('candidates', () => {
  /**
   * Guards the cap against the exhaustive tail: down there the search plays the rest of the tree out and
   * reports the answer as exact, which is only true if every move was on the list to begin with. A cap
   * still biting at that point hides a forced win ranked past it behind a claim that nothing was missed.
   */
  it('offers every free cell once the tail is searched exhaustively', () => {
    const board = boardWithFreeCells(EXACT_SEARCH_CELLS)
    const free = legalMoves(board)

    expect(free).toHaveLength(EXACT_SEARCH_CELLS)
    expect(candidates(board, Player.one)).toHaveLength(free.length)
  })

  /** One cell above the tail the cap is back on, which is what it is for. */
  it('keeps the branching capped above the exhaustive tail', () => {
    const board = boardWithFreeCells(EXACT_SEARCH_CELLS + 1)
    const free = legalMoves(board)

    expect(free.length).toBeGreaterThan(EXACT_SEARCH_CELLS)
    expect(candidates(board, Player.one).length).toBeLessThan(free.length)
  })
})

/**
 * Two fork traps for Player.two, one in each end layer: each is a two-long row and a two-long column
 * crossing at a free cell, and no single move breaks both. Player.one has nothing on the board, so it
 * cannot threaten its way out either.
 */
const doubleForkTrap = () =>
  put(
    createBoard(),
    [
      [0, 0, 0],
      [1, 0, 0], // row in layer 0, crossing the column at (2,0,0)
      [2, 2, 0],
      [2, 3, 0],
      [0, 0, 3],
      [1, 0, 3], // the same shape in layer 3, crossing at (2,0,3)
      [2, 2, 3],
      [2, 3, 3],
    ],
    Player.two
  )

describe('findBestMove — threat-space search', () => {
  /** A proved forced win outranks any heuristic, so it is played at once and reported as exact. */
  it('plays a proved forced win ahead of the ordinary search', () => {
    // A row and a column two-long crossing at the empty (2,0,0): one move makes two threats.
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
    const result = findBestMove(board, Player.one, { budgetMs: 500 })
    expect(result?.move).toBe(cellIndex(2, 0, 0))
    expect(result?.score).toBe(WIN_VALUE)
    expect(result?.exact).toBe(true)
  })

  /**
   * The defensive mirror: the opponent can fork at (2,0,1), the overlap of two of their two-longs. A move
   * that leaves that fork standing hands them a forced win, so the search must not choose one — even
   * though nothing within its depth would show the loss.
   */
  it('refuses a move that leaves the opponent a forced win', () => {
    let board = put(
      createBoard(),
      [
        [0, 0, 1],
        [1, 0, 1], // row: two-long, other empties (2,0,1) and (3,0,1)
        [2, 2, 1],
        [2, 3, 1], // column: two-long, other empties (2,0,1) and (2,1,1)
      ],
      Player.two
    )
    board = put(board, [[0, 3, 3]], Player.one) // a single P1 stone, so it has moves but no threat

    // The trap is real: an idle move lets the opponent take the overlap and force the win.
    const idle = applyMove(board, cellIndex(3, 3, 3), Player.one)
    expect(hasForcedWin(idle, Player.two, forcedOpts)).toBe(true)

    const result = findBestMove(board, Player.one, { budgetMs: 800, maxDepth: 2 })
    const after = applyMove(board, result?.move ?? -1, Player.one)
    expect(hasForcedWin(after, Player.two, forcedOpts)).toBe(false)
  })

  /**
   * The product decision when the filter strikes off everything: a lost position is still played on, with
   * the ordering picking the longest resistance, rather than the search being handed an empty list.
   */
  it('still plays a ranked move when every move loses to a chain', () => {
    const board = doubleForkTrap()
    const ranked = candidates(board, Player.one)

    for (const move of ranked) {
      expect(hasForcedWin(applyMove(board, move, Player.one), Player.two, forcedOpts)).toBe(true)
    }

    const result = findBestMove(board, Player.one, { budgetMs: 1500, maxDepth: 2 })
    expect(ranked).toContain(result?.move)
  })

  /**
   * Regression: a loss filter that ran out of time part-way used to hand back the whole ranked list,
   * putting the moves it had just proved lose to a chain back in front of the search — and the first of
   * them is exactly what gets played when no deepening pass finishes. It keeps the proved-safe moves and
   * the tail it never examined, and only the proved losses are dropped.
   *
   * The clock steps fast enough that the filter's slice runs out mid-list while the deepening passes get
   * nowhere, so the answer is the fallback and `depth` says so.
   */
  it('never falls back on a move it has already proved loses', () => {
    const board = doubleForkTrap()
    const ranked = candidates(board, Player.one)

    const result = findBestMove(board, Player.one, { budgetMs: 280, now: clock(0, 8) })

    expect(result?.depth).toBe(0)
    const played = ranked.indexOf(result?.move ?? -1)
    expect(played).toBeGreaterThan(0)
    for (const dropped of ranked.slice(0, played)) {
      expect(hasForcedWin(applyMove(board, dropped, Player.one), Player.two, forcedOpts)).toBe(true)
    }
  })
})

describe('search strength', () => {
  /**
   * The point of the strongest tier: it should not lose to a player that only ever takes wins and
   * blocks. Playing it out is the only honest check that the pieces fit together.
   */
  it('holds off a win-or-block opponent over a full game', () => {
    let board = createBoard()
    let turn: Player = Player.one // the search moves first
    let winner: Player | null = null

    for (let ply = 0; ply < CELL_COUNT; ply++) {
      const free = legalMoves(board)
      if (free.length === 0) break

      let move: number
      if (turn === Player.one) {
        move = findBestMove(board, turn, { budgetMs: 400, maxDepth: 4 })?.move ?? free[0]
      } else {
        /* A simple but not silly opponent: with no time to search, `findBestMove` still answers wins and
           forced blocks outright, and otherwise hands back the best-ordered cell. */
        const ownWin = findBestMove(board, turn, { budgetMs: 0, now: clock() })
        move = ownWin?.move ?? free[0]
      }

      board = applyMove(board, move, turn)
      if (findWinningLine(board, turn)) {
        winner = turn
        break
      }
      turn = turn === Player.one ? Player.two : Player.one
    }

    expect(winner).not.toBe(Player.two)
  }, 30_000)

  it('completes a line of four when handed three', () => {
    for (let layer = 0; layer < BOARD_SIZE; layer++) {
      const board = put(
        createBoard(),
        [
          [0, 0, layer],
          [1, 0, layer],
          [2, 0, layer],
        ],
        Player.one
      )
      const result = findBestMove(board, Player.one, { budgetMs: 0, now: clock() })
      const after = applyMove(board, result?.move ?? 0, Player.one)
      expect(findWinningLine(after, Player.one)).not.toBeNull()
    }
  })
})

/** Plain negamax over the same candidate sets, with no table and no clock: the value to beat. */
function tableFreeValue(state: Board, side: Player, depth: number): number {
  if (findWinningLine(state, opponentOf(side))) return LOSS_VALUE + depth
  if (legalMoves(state).length === 0) return 0
  if (depth === 0) return scorePosition(state, side)

  let best = -Infinity
  for (const move of candidates(state, side)) {
    const score = -tableFreeValue(applyMove(state, move, side), opponentOf(side), depth - 1)
    if (score > best) best = score
  }
  return best
}

/**
 * The score findBestMove should report, mirroring its two root layers without any table: a proved forced
 * win short-circuits everything, and otherwise the root ranges over moves that do not hand the opponent a
 * forced win. The deep values still come through the table-free negamax, so the table's soundness is what
 * the comparison actually tests.
 */
function expectedRootScore(board: Board, side: Player, depth: number): number {
  if (findForcedWin(board, side, forcedOpts) !== null) return WIN_VALUE

  const them = opponentOf(side)
  const ranked = candidates(board, side)
  const safe = ranked.filter(
    (move) => !hasForcedWin(applyMove(board, move, side), them, forcedOpts)
  )
  const roots = safe.length > 0 ? safe : ranked

  let best = -Infinity
  for (const move of roots) {
    const score = -tableFreeValue(applyMove(board, move, side), them, depth - 1)
    if (score > best) best = score
  }
  return best
}

const seat = (board: Board, cells: readonly number[], player: Player) =>
  cells.reduce((next, cell) => applyMove(next, cell, player), board)

/**
 * Alpha-beta returns a bound, not a value: a node that cut off has only proved its score is at least
 * that much, and one where nothing beat the incoming alpha has only proved it is at most that much.
 * Storing either as exact lets a later visit under a different window read back a score the search
 * never established — and the root narrows its window on every candidate, so those visits happen.
 *
 * These three positions are ones where it showed. Expected values come from a table-free negamax over
 * the same candidate sets rather than from literals, so retuning the evaluation cannot make this stale.
 */
describe('findBestMove — the table only answers what the search proved', () => {
  const DEPTH = 4

  const positions: { one: number[]; two: number[] }[] = [
    { one: [9, 16, 45, 53, 59, 60], two: [11, 12, 29, 33, 57, 61] },
    { one: [4, 17, 20, 24, 39, 58], two: [5, 6, 7, 8, 28, 48] },
    { one: [9, 11, 38, 45, 48, 63], two: [14, 28, 32, 37, 59, 62] },
  ]

  it.each(positions)(
    'scores position %# as a table-free search does',
    ({ one, two }) => {
      const board = seat(seat(createBoard(), one, Player.one), two, Player.two)

      const result = findBestMove(board, Player.one, { maxDepth: DEPTH, now: clock() })

      expect(result?.score).toBe(expectedRootScore(board, Player.one, DEPTH))
    },
    30_000
  )
})
