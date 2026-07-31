import { describe, expect, it } from 'vitest'
import { DEFAULT_WEIGHTS, orderedMoves, scoreCell, scorePosition } from './evaluate'
import { applyMove, createBoard } from './board'
import { cellIndex } from './lines'
import { Sight } from './threats'
import { Board, Player } from '../tic-tac-toe.types'

const mine = (
  moves: [number, number, number][],
  from: Board = createBoard(),
  player: Player = Player.one
) => moves.reduce((board, [x, y, layer]) => applyMove(board, cellIndex(x, y, layer), player), from)

const theirs = (moves: [number, number, number][], from: Board) => mine(moves, from, Player.two)

describe('scoreCell', () => {
  /**
   * A corner sits on seven lines and the middle of a plate on four, so on an empty board the corner is
   * worth more. This is the whole basis of the positional play.
   */
  it('prefers a cell that more lines run through', () => {
    const board = createBoard()
    const corner = scoreCell(board, cellIndex(0, 0, 0), Player.one)
    const plateMiddle = scoreCell(board, cellIndex(1, 1, 0), Player.one)
    expect(corner).toBeGreaterThan(plateMiddle)
  })

  it('rewards a cell that builds on a line it already holds', () => {
    const board = mine([[0, 0, 0]])
    const building = scoreCell(board, cellIndex(1, 0, 0), Player.one)
    const elsewhere = scoreCell(board, cellIndex(2, 3, 2), Player.one)
    expect(building).toBeGreaterThan(elsewhere)
  })

  it('values a fork above any ordinary placement', () => {
    const board = mine([
      [1, 0, 0],
      [2, 0, 0],
      [0, 1, 0],
      [0, 2, 0],
    ])
    const fork = scoreCell(board, cellIndex(0, 0, 0), Player.one)
    expect(fork).toBeGreaterThanOrEqual(DEFAULT_WEIGHTS.fork)
  })

  it('ignores forks when the chooser cannot see that far', () => {
    const board = mine([
      [1, 0, 0],
      [2, 0, 0],
      [0, 1, 0],
      [0, 2, 0],
    ])
    const blind = scoreCell(board, cellIndex(0, 0, 0), Player.one, { seesForks: false })
    expect(blind).toBeLessThan(DEFAULT_WEIGHTS.fork)
  })

  /** A layer-blind chooser cannot value the rod it is building. */
  it('scores a vertical build lower under one-layer sight', () => {
    const board = mine([
      [1, 1, 0],
      [1, 1, 1],
    ])
    const cell = cellIndex(1, 1, 2)
    expect(scoreCell(board, cell, Player.one, { sight: Sight.everything })).toBeGreaterThan(
      scoreCell(board, cell, Player.one, { sight: Sight.oneLayer })
    )
  })
})

describe('scoreCell — a line the opponent has touched', () => {
  /**
   * The rule that makes the scoring more than a lookup table, and the one the file header leads with: a
   * line with pieces from both sides cannot be won by either, so it is worth nothing to me however many
   * of mine sit on it. Without the skip a dead line still earns its `deny` value.
   *
   * Both boards are scored for the same cell, and the opponent's piece goes at the far end of the line
   * being spoiled — two cells lie on at most one line together, so no other line through the scored cell
   * changes. Forks are switched off to leave the line arithmetic on its own.
   */
  it('is worth nothing, even holding two of it', () => {
    const cell = cellIndex(0, 0, 0)
    const clean = mine([
      [1, 0, 0],
      [2, 0, 0],
    ])
    const spoiled = theirs([[3, 0, 0]], clean)

    const withLine = scoreCell(clean, cell, Player.one, { seesForks: false })
    const withoutLine = scoreCell(spoiled, cell, Player.one, { seesForks: false })

    // Playing the cell would have made three of that line, and now it is worth exactly nothing.
    expect(withLine - withoutLine).toBe(DEFAULT_WEIGHTS.own[3])
  })

  it('counts a line only my own pieces sit on as still worth having', () => {
    const board = mine([[1, 0, 0]])
    const corner = scoreCell(board, cellIndex(0, 0, 0), Player.one, { seesForks: false })
    const empty = scoreCell(createBoard(), cellIndex(0, 0, 0), Player.one, { seesForks: false })
    expect(corner).toBeGreaterThan(empty)
  })

  it('counts fewer lines under a narrower sight', () => {
    const corner = cellIndex(0, 0, 0)
    expect(
      scoreCell(createBoard(), corner, Player.one, { sight: Sight.oneLayer, seesForks: false })
    ).toBeLessThan(
      scoreCell(createBoard(), corner, Player.one, { sight: Sight.everything, seesForks: false })
    )
  })
})

describe('scorePosition', () => {
  it('is even on an empty board', () => {
    expect(scorePosition(createBoard(), Player.one)).toBe(0)
  })

  it('favours whoever holds more of a live line', () => {
    const board = mine([
      [0, 0, 0],
      [1, 0, 0],
    ])
    expect(scorePosition(board, Player.one)).toBeGreaterThan(0)
    expect(scorePosition(board, Player.two)).toBeLessThan(0)
  })

  it('is symmetric between the two sides', () => {
    const board = theirs(
      [
        [0, 0, 0],
        [1, 0, 0],
      ],
      mine([
        [3, 3, 3],
        [2, 3, 3],
      ])
    )
    expect(scorePosition(board, Player.one)).toBeCloseTo(-scorePosition(board, Player.two))
  })

  it('counts a contested line for neither side', () => {
    const contested = theirs([[3, 0, 0]], mine([[0, 0, 0]]))
    // The one shared row cancels; both sides keep only what their other lines offer.
    expect(scorePosition(contested, Player.one)).toBeCloseTo(-scorePosition(contested, Player.two))
  })
})

describe('orderedMoves', () => {
  it('offers the winning move first and nothing else', () => {
    const board = mine([
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ])
    expect(orderedMoves(board, Player.one)).toEqual([cellIndex(3, 0, 0)])
  })

  it('offers only the block when the opponent is one move from winning', () => {
    const board = theirs(
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ],
      createBoard()
    )
    expect(orderedMoves(board, Player.one)).toEqual([cellIndex(3, 0, 0)])
  })

  it('prefers winning over blocking when both are available', () => {
    let board = mine([
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
    ])
    board = theirs(
      [
        [0, 3, 3],
        [1, 3, 3],
        [2, 3, 3],
      ],
      board
    )
    expect(orderedMoves(board, Player.one)).toEqual([cellIndex(3, 0, 0)])
  })

  it('lists every empty cell, best first, when nothing is forced', () => {
    const board = mine([[0, 0, 0]])
    const moves = orderedMoves(board, Player.one)
    expect(moves).toHaveLength(63)
    expect(new Set(moves).size).toBe(63)
    expect(moves).not.toContain(cellIndex(0, 0, 0))

    const scores = moves.map((cell) => scoreCell(board, cell, Player.one))
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })
})

describe('blocking is graded, not all-or-nothing', () => {
  /** A cell on a line the opponent holds two of, with nothing of mine anywhere near. */
  const blockingCell = (theirPieces: [number, number, number][]) => {
    const board = theirs(theirPieces, createBoard())
    return scoreCell(board, cellIndex(3, 0, 0), Player.one)
  }

  /**
   * Measured as the gain over the same cell on an empty board. The raw totals are dominated by the six
   * other lines a corner sits on, so comparing them would say little about what blocking is worth.
   */
  it('values spoiling a two far above spoiling a one', () => {
    const bare = scoreCell(createBoard(), cellIndex(3, 0, 0), Player.one)
    const gainFromOne = blockingCell([[0, 0, 0]]) - bare
    const gainFromTwo =
      blockingCell([
        [0, 0, 0],
        [1, 0, 0],
      ]) - bare

    expect(gainFromOne).toBeGreaterThan(0)
    expect(gainFromTwo).toBeGreaterThan(gainFromOne * 5)
  })

  it('still counts a line the opponent has merely started, rather than ignoring it', () => {
    const bare = scoreCell(createBoard(), cellIndex(3, 0, 0), Player.one)
    expect(blockingCell([[0, 0, 0]])).toBeGreaterThan(bare)
  })

  /**
   * Blocking a three is close to compulsory, so it has to outrank every ordinary consideration. The
   * exact ratio is a tuned quantity and moves with the weights, so this asserts a wide margin rather
   * than a specific multiple.
   */
  it('scores spoiling a three above spoiling a two by a wide margin', () => {
    const bare = scoreCell(createBoard(), cellIndex(3, 0, 0), Player.one)
    const gainFromTwo =
      blockingCell([
        [0, 0, 0],
        [1, 0, 0],
      ]) - bare
    const gainFromThree =
      blockingCell([
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ]) - bare

    expect(gainFromThree).toBeGreaterThan(gainFromTwo * 5)
  })

  it('rates building my own two a little above spoiling theirs', () => {
    const build = scoreCell(mine([[0, 0, 0]]), cellIndex(1, 0, 0), Player.one)
    const block = scoreCell(theirs([[0, 0, 0]], createBoard()), cellIndex(1, 0, 0), Player.one)
    expect(build).toBeGreaterThan(block)
  })

  /**
   * A cell that gets in their way *and* builds something of mine beats one that only blocks. Scores sum
   * across every line through the cell, so the two jobs add up rather than one overriding the other.
   */
  it('prefers a block that also builds something of its own', () => {
    // The opponent holds two of the row through (3,0,0); I hold two of the rod through it.
    let board = theirs(
      [
        [0, 0, 0],
        [1, 0, 0],
      ],
      createBoard()
    )
    const blockOnly = scoreCell(board, cellIndex(3, 0, 0), Player.one)

    board = mine(
      [
        [3, 0, 1],
        [3, 0, 2],
      ],
      board
    )
    const blockAndBuild = scoreCell(board, cellIndex(3, 0, 0), Player.one)
    expect(blockAndBuild).toBeGreaterThan(blockOnly)
  })
})

describe('near-complete lines outrank the lines that led to them', () => {
  /**
   * Guards a clamp that scored a line of three at zero, below a line of two. The choosers took wins
   * before ever scoring, so it only showed up at the search horizon, where it made the evaluation
   * prefer a tidy two over a three that forces a reply.
   */
  it('scores a cell that makes three above one that makes two', () => {
    const board = mine([
      [0, 0, 0],
      [1, 0, 0],
    ])
    const makesThree = scoreCell(board, cellIndex(2, 0, 0), Player.one, { seesForks: false })
    const makesTwo = scoreCell(mine([[0, 3, 3]]), cellIndex(1, 3, 3), Player.one, {
      seesForks: false,
    })
    expect(makesThree).toBeGreaterThan(makesTwo)
  })

  it('scores a position holding three of a line above one holding two', () => {
    const two = scorePosition(
      mine([
        [0, 0, 0],
        [1, 0, 0],
      ]),
      Player.one
    )
    const three = scorePosition(
      mine([
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ]),
      Player.one
    )
    expect(three).toBeGreaterThan(two)
  })

  it('scores a completed line highest of all', () => {
    const four = scorePosition(
      mine([
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [3, 0, 0],
      ]),
      Player.one
    )
    const three = scorePosition(
      mine([
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ]),
      Player.one
    )
    expect(four).toBeGreaterThan(three)
  })
})

describe('DEFAULT_WEIGHTS', () => {
  /**
   * These were tuned by self-play, so they are expected to move. What must not change is their shape:
   * a retune that inverts any of these orderings has produced nonsense, however well it scored.
   */
  it('rises with the number of pieces already on a line', () => {
    const { own } = DEFAULT_WEIGHTS
    expect(own).toHaveLength(5)
    for (let held = 1; held < own.length; held++) {
      expect(own[held]).toBeGreaterThan(own[held - 1])
    }
  })

  it('grades denial the same way, and never above completing my own line', () => {
    const { deny, own } = DEFAULT_WEIGHTS
    expect(deny[1]).toBeGreaterThan(0)
    expect(deny[2]).toBeGreaterThan(deny[1])
    expect(deny[3]).toBeGreaterThan(deny[2])
    expect(deny[3]).toBeLessThan(own[4])
  })

  it('keeps spoiling a two below building a three, so offence still leads', () => {
    expect(DEFAULT_WEIGHTS.deny[2]).toBeLessThan(DEFAULT_WEIGHTS.own[3])
  })

  it('puts an outright fork above every ordinary consideration', () => {
    const { fork, own, deny, forkSetup } = DEFAULT_WEIGHTS
    expect(fork).toBeGreaterThan(own[3])
    expect(fork).toBeGreaterThan(deny[3])
    expect(fork).toBeGreaterThan(forkSetup)
  })

  it('keeps the fork-setup nudge small enough not to swamp the line values', () => {
    expect(DEFAULT_WEIGHTS.forkSetup).toBeLessThan(DEFAULT_WEIGHTS.own[3])
  })

  it('rates a fork above completing nothing else on the board', () => {
    expect(DEFAULT_WEIGHTS.fork).toBeGreaterThan(DEFAULT_WEIGHTS.own[3])
    expect(DEFAULT_WEIGHTS.fork).toBeGreaterThan(DEFAULT_WEIGHTS.deny[3])
  })
})
