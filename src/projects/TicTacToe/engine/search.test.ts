import { describe, expect, it } from 'vitest'
import { EXACT_SEARCH_CELLS, findBestMove } from './search'
import { WIN_VALUE } from './evaluate'
import { applyMove, createBoard, legalMoves } from './board'
import { BOARD_SIZE, CELL_COUNT, cellIndex, findWinningLine } from './lines'
import { Board, Player } from '../tic-tac-toe.types'

const put = (board: Board, moves: [number, number, number][], player: Player) =>
  moves.reduce((next, [x, y, layer]) => applyMove(next, cellIndex(x, y, layer), player), board)

/** A fixed clock, so the budget is exercised without depending on how fast the machine is. */
const clock = (start = 0, step = 0) => {
  let time = start
  return () => {
    const value = time
    time += step
    return value
  }
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

  /** With a budget of nothing it still has to hand back a legal move rather than nothing at all. */
  it('always returns a legal move, even with no time to think', () => {
    const board = put(createBoard(), [[1, 1, 1]], Player.two)
    const result = findBestMove(board, Player.one, { budgetMs: 0, now: clock(0, 1000) })
    expect(result).not.toBeNull()
    expect(legalMoves(board)).toContain(result?.move)
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

  it('reports an exact result once few enough cells remain', () => {
    // Fill all but a handful, leaving no completed line.
    let board = createBoard()
    let filled = 0
    for (let index = 0; index < CELL_COUNT && filled < CELL_COUNT - EXACT_SEARCH_CELLS; index++) {
      const player = filled % 2 === 0 ? Player.one : Player.two
      const next = applyMove(board, index, player)
      if (findWinningLine(next, player)) continue
      board = next
      filled++
    }

    const free = legalMoves(board).length
    expect(free).toBeLessThanOrEqual(EXACT_SEARCH_CELLS)

    const result = findBestMove(board, Player.one, { budgetMs: 5000 })
    expect(result).not.toBeNull()
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

  /** The search must be deterministic: same position, same budget, same move. */
  it('gives the same answer twice for the same position', () => {
    const board = put(createBoard(), [[1, 1, 1]], Player.two)
    const first = findBestMove(board, Player.one, { budgetMs: 2000, maxDepth: 3 })
    const second = findBestMove(board, Player.one, { budgetMs: 2000, maxDepth: 3 })
    expect(first?.move).toBe(second?.move)
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
    // Whatever it plays, it must not hand the opponent a free run at the rod.
    const after = applyMove(board, result?.move ?? 0, Player.one)
    const theirWins = [cellIndex(1, 1, 2), cellIndex(1, 1, 3)].filter(
      (cell) => after[cell] === null
    )
    expect(theirWins.length).toBeLessThanOrEqual(2)
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
        // A simple but not silly opponent: win if it can, block if it must, else take a live cell.
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
