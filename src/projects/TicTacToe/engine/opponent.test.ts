import { describe, expect, it } from 'vitest'
import { PERSONALITIES, chooseMove } from './opponent'
import { applyMove, createBoard, legalMoves } from './board'
import { BOARD_SIZE, CELL_COUNT, cellIndex, findWinningLine } from './lines'
import { LINES_THROUGH_CELL, Sight } from './threats'
import { seededRng } from '../../../utils/rng'
import { Board, Difficulty, Player } from '../tic-tac-toe.types'

const ALL = Object.values(Difficulty)

const put = (board: Board, moves: [number, number, number][], player: Player) =>
  moves.reduce((next, [x, y, layer]) => applyMove(next, cellIndex(x, y, layer), player), board)

/**
 * A clock that advances a fixed amount per reading, so a search budget is spent after a fixed number of
 * checks rather than after however much work the machine got through.
 */
const steppingClock = (step = 1) => {
  let time = 0
  return () => (time += step)
}

/** Always takes the gated branch, so probability gates open. */
const always = () => 0
/** Never takes a gated branch, so probability gates stay shut. */
const never = () => 0.999999

const flatWin = (player: Player) =>
  put(
    createBoard(),
    [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ],
    player
  )

/** Three of a rod: invisible to a layer-blind opponent, obvious to anything else. */
const rodWin = (player: Player) =>
  put(
    createBoard(),
    [
      [1, 1, 0],
      [1, 1, 1],
      [1, 1, 2],
    ],
    player
  )

describe('chooseMove — every difficulty', () => {
  it('returns nothing on a full board', () => {
    let board = createBoard()
    for (let index = 0; index < CELL_COUNT; index++) {
      board = applyMove(board, index, index % 2 === 0 ? Player.one : Player.two)
    }
    for (const difficulty of ALL) {
      expect(chooseMove(board, Player.one, difficulty, { rng: seededRng(1) })).toBeNull()
    }
  })

  it('only ever picks an empty cell', () => {
    let board = put(
      createBoard(),
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

    for (const difficulty of ALL) {
      const rng = seededRng(7)
      for (let attempt = 0; attempt < 25; attempt++) {
        const move = chooseMove(board, Player.two, difficulty, { rng, budgetMs: 20 })
        expect(move).not.toBeNull()
        expect(board[move ?? -1]).toBeNull()
      }
    }
  })

  /**
   * The clock is injected as well as the seed. Left on the wall clock, the searching tier finishes a
   * different number of deepening passes depending on how loaded the machine is, so the same seed would
   * give a different move and this would fail on a busy CI run rather than on a real regression.
   */
  it('is reproducible for a given seed', () => {
    const board = put(createBoard(), [[1, 1, 1]], Player.one)
    for (const difficulty of ALL) {
      const limits = { budgetMs: 50, now: steppingClock() }
      const first = chooseMove(board, Player.two, difficulty, { rng: seededRng(42), ...limits })
      const second = chooseMove(board, Player.two, difficulty, { rng: seededRng(42), ...limits })
      expect(first).toBe(second)
    }
  })
})

describe('easy', () => {
  it('takes a flat win when its dice allow', () => {
    expect(chooseMove(flatWin(Player.two), Player.two, Difficulty.easy, { rng: always })).toBe(
      cellIndex(3, 0, 0)
    )
  })

  /** Your spec: sometimes it just does not take the win. */
  it('passes up a win it can see when its dice say so', () => {
    expect(chooseMove(flatWin(Player.two), Player.two, Difficulty.easy, { rng: never })).not.toBe(
      cellIndex(3, 0, 0)
    )
  })

  /**
   * The heart of the easy tier: it is blind to every line that climbs between layers, so it walks past
   * a rod it could finish. The mistake has a reason behind it, which is what makes it read as a weak
   * player rather than a broken one.
   */
  it('cannot see a vertical win at all, however its dice fall', () => {
    const board = rodWin(Player.two)
    for (const rng of [always, never, seededRng(3)]) {
      expect(chooseMove(board, Player.two, Difficulty.easy, { rng })).not.toBe(cellIndex(1, 1, 3))
    }
  })

  it('cannot see a vertical loss coming either', () => {
    const board = rodWin(Player.one)
    for (let seed = 0; seed < 8; seed++) {
      expect(chooseMove(board, Player.two, Difficulty.easy, { rng: seededRng(seed) })).not.toBe(
        cellIndex(1, 1, 3)
      )
    }
  })

  it('does block a flat loss when its dice allow', () => {
    expect(chooseMove(flatWin(Player.one), Player.two, Difficulty.easy, { rng: always })).toBe(
      cellIndex(3, 0, 0)
    )
  })

  it('spreads its choices around rather than always taking one cell', () => {
    const board = put(createBoard(), [[1, 1, 1]], Player.one)
    const rng = seededRng(5)
    const seen = new Set<number | null>()
    for (let attempt = 0; attempt < 40; attempt++) {
      seen.add(chooseMove(board, Player.two, Difficulty.easy, { rng }))
    }
    expect(seen.size).toBeGreaterThan(3)
  })
})

describe('medium', () => {
  it('always takes a win it can see', () => {
    for (let seed = 0; seed < 10; seed++) {
      expect(
        chooseMove(flatWin(Player.two), Player.two, Difficulty.medium, { rng: seededRng(seed) })
      ).toBe(cellIndex(3, 0, 0))
    }
  })

  /**
   * Its block roll is short of certain, but the scoring backs it up: denying a line the opponent holds
   * three of is worth more than almost anything else, so a failed roll usually lands on the same cell.
   * It gives up a block only when another cell genuinely outscores it, not at random.
   */
  it('blocks a visible three at least as often as its personality promises', () => {
    const runs = 400
    let blocked = 0
    for (let seed = 0; seed < runs; seed++) {
      const move = chooseMove(flatWin(Player.one), Player.two, Difficulty.medium, {
        rng: seededRng(seed),
      })
      if (move === cellIndex(3, 0, 0)) blocked++
    }
    expect(blocked / runs).toBeGreaterThanOrEqual(PERSONALITIES.medium.blocks)
  })

  /** Unlike easy, it does watch the rods. */
  it('sees a vertical win that easy misses', () => {
    expect(
      chooseMove(rodWin(Player.two), Player.two, Difficulty.medium, { rng: seededRng(1) })
    ).toBe(cellIndex(1, 1, 3))
  })

  /** Its blind spot is narrower: only the four corner-to-corner diagonals. */
  it('misses a win on the body diagonal', () => {
    const board = put(
      createBoard(),
      [
        [0, 0, 0],
        [1, 1, 1],
        [2, 2, 2],
      ],
      Player.two
    )
    expect(chooseMove(board, Player.two, Difficulty.medium, { rng: seededRng(2) })).not.toBe(
      cellIndex(3, 3, 3)
    )
  })

  it('extends a line it already has two of', () => {
    const board = put(
      createBoard(),
      [
        [0, 0, 0],
        [1, 0, 0],
      ],
      Player.two
    )
    expect([cellIndex(2, 0, 0), cellIndex(3, 0, 0)]).toContain(
      chooseMove(board, Player.two, Difficulty.medium, { rng: always })
    )
  })
})

describe('hard', () => {
  it('takes the win and the block without fail', () => {
    for (let seed = 0; seed < 6; seed++) {
      expect(
        chooseMove(flatWin(Player.two), Player.two, Difficulty.hard, { rng: seededRng(seed) })
      ).toBe(cellIndex(3, 0, 0))
      expect(
        chooseMove(flatWin(Player.one), Player.two, Difficulty.hard, { rng: seededRng(seed) })
      ).toBe(cellIndex(3, 0, 0))
    }
  })

  it('sees the whole board, body diagonals included', () => {
    const board = put(
      createBoard(),
      [
        [0, 0, 0],
        [1, 1, 1],
        [2, 2, 2],
      ],
      Player.two
    )
    expect(chooseMove(board, Player.two, Difficulty.hard, { rng: seededRng(1) })).toBe(
      cellIndex(3, 3, 3)
    )
  })

  /** Blocking a three beats setting up a fork, which is the priority you asked for. */
  it('blocks a loss rather than building its own fork', () => {
    let board = put(
      createBoard(),
      [
        [1, 0, 0],
        [2, 0, 0],
        [0, 1, 0],
        [0, 2, 0],
      ],
      Player.two
    )
    board = put(
      board,
      [
        [3, 3, 0],
        [3, 3, 1],
        [3, 3, 2],
      ],
      Player.one
    )
    expect(chooseMove(board, Player.two, Difficulty.hard, { rng: seededRng(1) })).toBe(
      cellIndex(3, 3, 3)
    )
  })

  /**
   * On an empty board the best cells are the sixteen that seven lines run through: the eight corners
   * and the eight of the inner core. The other forty-eight only offer four, and it should not take one.
   */
  it('opens on a cell that seven lines run through', () => {
    const rng = seededRng(9)
    for (let attempt = 0; attempt < 25; attempt++) {
      const move = chooseMove(createBoard(), Player.one, Difficulty.hard, { rng })
      expect(LINES_THROUGH_CELL[move ?? -1]).toHaveLength(7)
    }
  })
})

describe('godly', () => {
  it('takes the win and the block', () => {
    expect(
      chooseMove(flatWin(Player.two), Player.two, Difficulty.godly, { rng: seededRng(1) })
    ).toBe(cellIndex(3, 0, 0))
    expect(
      chooseMove(flatWin(Player.one), Player.two, Difficulty.godly, { rng: seededRng(1) })
    ).toBe(cellIndex(3, 0, 0))
  })

  it('still answers when its budget is already spent', () => {
    let time = 0
    const now = () => (time += 10)
    const move = chooseMove(createBoard(), Player.one, Difficulty.godly, {
      rng: seededRng(1),
      now,
      budgetMs: 30,
    })
    expect(move).not.toBeNull()
  })
})

describe('the difficulty ladder', () => {
  /**
   * The tiers have to actually differ in strength, or the setting is decoration. Played head to head
   * from fixed seeds, the stronger side should come out ahead.
   */
  const playGame = (first: Difficulty, second: Difficulty, seed: number): Player | null => {
    const rng = seededRng(seed)
    let board = createBoard()
    let turn: Player = Player.one

    for (let ply = 0; ply < CELL_COUNT; ply++) {
      if (legalMoves(board).length === 0) break
      const difficulty = turn === Player.one ? first : second
      const move = chooseMove(board, turn, difficulty, { rng, budgetMs: 60 })
      if (move === null) break
      board = applyMove(board, move, turn)
      if (findWinningLine(board, turn)) return turn
      turn = turn === Player.one ? Player.two : Player.one
    }
    return null
  }

  it('has medium beat easy more often than not', () => {
    let mediumWins = 0
    for (let seed = 0; seed < 6; seed++) {
      if (playGame(Difficulty.medium, Difficulty.easy, seed) === Player.one) mediumWins++
    }
    expect(mediumWins).toBeGreaterThanOrEqual(4)
  }, 20_000)

  it('has hard beat easy nearly always', () => {
    let hardWins = 0
    for (let seed = 0; seed < 6; seed++) {
      if (playGame(Difficulty.hard, Difficulty.easy, seed) === Player.one) hardWins++
    }
    expect(hardWins).toBeGreaterThanOrEqual(5)
  }, 20_000)

  it('never lets easy beat hard from the stronger seat', () => {
    for (let seed = 0; seed < 4; seed++) {
      expect(playGame(Difficulty.hard, Difficulty.easy, seed)).not.toBe(Player.two)
    }
  }, 20_000)

  /** The rung that was missing: hard has to be a step up from medium, not merely from easy. */
  it('has hard beat medium more often than not', () => {
    let hardWins = 0
    for (let seed = 0; seed < 6; seed++) {
      if (playGame(Difficulty.hard, Difficulty.medium, seed) === Player.one) hardWins++
    }
    expect(hardWins).toBeGreaterThanOrEqual(4)
  }, 30_000)

  /** And the top rung: the search is the whole reason the strongest tier exists. */
  it('does not lose to hard', () => {
    for (let seed = 0; seed < 4; seed++) {
      expect(playGame(Difficulty.godly, Difficulty.hard, seed)).not.toBe(Player.two)
    }
  }, 60_000)
})

describe('PERSONALITIES', () => {
  it('gets stricter and sharper as the tier rises', () => {
    expect(PERSONALITIES.easy.takesWin).toBeLessThan(PERSONALITIES.medium.takesWin)
    expect(PERSONALITIES.easy.blocks).toBeLessThan(PERSONALITIES.medium.blocks)
    expect(PERSONALITIES.easy.sharpness).toBeLessThan(PERSONALITIES.medium.sharpness)
    expect(PERSONALITIES.medium.sharpness).toBeLessThan(PERSONALITIES.hard.sharpness)
  })

  it('widens what each tier can see as it rises', () => {
    expect(PERSONALITIES.easy.sight).toBe(Sight.oneLayer)
    expect(PERSONALITIES.medium.sight).toBe(Sight.noBodyDiagonals)
    expect(PERSONALITIES.hard.sight).toBe(Sight.everything)
  })

  /** Hard scores instead of taking the shortcut, which picks blindly among the cells it finds. */
  it('leaves the build shortcut to the weaker tiers', () => {
    expect(PERSONALITIES.easy.builds).toBeGreaterThan(0)
    expect(PERSONALITIES.medium.builds).toBeGreaterThan(0)
    expect(PERSONALITIES.hard.builds).toBe(0)
  })

  it('only lets the top tier play for forks', () => {
    expect(PERSONALITIES.easy.seesForks).toBe(false)
    expect(PERSONALITIES.medium.seesForks).toBe(false)
    expect(PERSONALITIES.hard.seesForks).toBe(true)
  })

  it('needs four in a row, which is what every line read assumes', () => {
    expect(BOARD_SIZE).toBe(4)
  })
})
