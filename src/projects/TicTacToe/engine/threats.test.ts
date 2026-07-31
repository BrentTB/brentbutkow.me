import { describe, expect, it } from 'vitest'
import {
  LINES_THROUGH_CELL,
  Sight,
  VISIBLE_LINES,
  forkCells,
  isFork,
  readLines,
  threatCells,
  threatsAfter,
  winningMoves,
} from './threats'
import { applyMove, createBoard } from './board'
import { BOARD_SIZE, CELL_COUNT, WINNING_LINES, cellIndex } from './lines'
import { Board, Player } from '../tic-tac-toe.types'

const place = (moves: [number, number, number][], player: Player, from: Board = createBoard()) =>
  moves.reduce((board, [x, y, layer]) => applyMove(board, cellIndex(x, y, layer), player), from)

describe('LINES_THROUGH_CELL', () => {
  it('covers every cell and matches the lines themselves', () => {
    expect(LINES_THROUGH_CELL).toHaveLength(CELL_COUNT)
    LINES_THROUGH_CELL.forEach((lineIndices, cell) => {
      for (const lineIndex of lineIndices) {
        expect(WINNING_LINES[lineIndex]).toContain(cell)
      }
    })
  })

  /**
   * The board has exactly two kinds of cell: 16 that sit on seven lines (the eight corners and the
   * eight of the inner core) and 48 that sit on four. This is what the positional scoring rests on.
   */
  it('gives every cell either seven lines or four', () => {
    const counts = LINES_THROUGH_CELL.map((lines) => lines.length)
    expect(new Set(counts)).toEqual(new Set([4, 7]))
    expect(counts.filter((count) => count === 7)).toHaveLength(16)
    expect(counts.filter((count) => count === 4)).toHaveLength(48)
  })

  it('puts a corner on seven lines and the middle of a plate on four', () => {
    expect(LINES_THROUGH_CELL[cellIndex(0, 0, 0)]).toHaveLength(7)
    expect(LINES_THROUGH_CELL[cellIndex(1, 1, 0)]).toHaveLength(4)
    expect(LINES_THROUGH_CELL[cellIndex(1, 1, 1)]).toHaveLength(7)
  })
})

describe('sight', () => {
  it('sees all 76 lines at full sight', () => {
    expect(VISIBLE_LINES[Sight.everything]).toHaveLength(WINNING_LINES.length)
  })

  /** Four rows, four columns and two diagonals per plate: the flat game a beginner actually plays. */
  it('sees only the 40 lines inside a layer at one-layer sight', () => {
    expect(VISIBLE_LINES[Sight.oneLayer]).toHaveLength(40)
  })

  it('is blind to every line that climbs layers at one-layer sight', () => {
    const rod = WINNING_LINES.findIndex(
      (line) => line[0] === cellIndex(1, 1, 0) && line[3] === cellIndex(1, 1, 3)
    )
    expect(rod).toBeGreaterThanOrEqual(0)
    expect(VISIBLE_LINES[Sight.oneLayer]).not.toContain(rod)
  })

  it('drops exactly the four body diagonals at the middle sight', () => {
    expect(VISIBLE_LINES[Sight.noBodyDiagonals]).toHaveLength(WINNING_LINES.length - 4)
    const bodyDiagonal = WINNING_LINES.findIndex(
      (line) => line[0] === cellIndex(0, 0, 0) && line[3] === cellIndex(3, 3, 3)
    )
    expect(VISIBLE_LINES[Sight.noBodyDiagonals]).not.toContain(bodyDiagonal)
  })
})

describe('readLines', () => {
  it('counts both sides and lists what is left', () => {
    let board = place([[0, 0, 0]], Player.one)
    board = applyMove(board, cellIndex(1, 0, 0), Player.two)

    const row = readLines(board, Player.one).find(
      (read) =>
        WINNING_LINES[read.lineIndex].join() === [0, 1, 2, 3].map((x) => cellIndex(x, 0, 0)).join()
    )
    expect(row).toMatchObject({ mine: 1, theirs: 1 })
    expect(row?.empties).toHaveLength(2)
  })

  it('only reports lines the sight allows', () => {
    const board = createBoard()
    expect(readLines(board, Player.one, Sight.oneLayer)).toHaveLength(40)
  })
})

describe('winningMoves', () => {
  it('finds the cell that finishes a line', () => {
    const board = place(
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ],
      Player.one
    )
    expect(winningMoves(board, Player.one)).toEqual([cellIndex(3, 0, 0)])
  })

  it('ignores a line the opponent has already touched', () => {
    let board = place(
      [
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
      ],
      Player.one
    )
    board = applyMove(board, cellIndex(3, 0, 0), Player.two)
    expect(winningMoves(board, Player.one)).toEqual([])
  })

  /** A layer-blind player cannot see the rod it is one move from finishing. */
  it('hides a vertical win from one-layer sight', () => {
    const board = place(
      [
        [1, 1, 0],
        [1, 1, 1],
        [1, 1, 2],
      ],
      Player.one
    )
    expect(winningMoves(board, Player.one)).toEqual([cellIndex(1, 1, 3)])
    expect(winningMoves(board, Player.one, Sight.oneLayer)).toEqual([])
  })
})

describe('threatsAfter', () => {
  it('counts the lines a move leaves one short', () => {
    const board = place(
      [
        [0, 0, 0],
        [1, 0, 0],
      ],
      Player.one
    )
    expect(threatsAfter(board, cellIndex(2, 0, 0), Player.one)).toBe(1)
  })

  it('is zero for a move that touches nothing of its own', () => {
    expect(threatsAfter(createBoard(), cellIndex(0, 0, 0), Player.one)).toBe(0)
  })

  it('does not count a line the opponent already sits on', () => {
    let board = place(
      [
        [0, 0, 0],
        [1, 0, 0],
      ],
      Player.one
    )
    board = applyMove(board, cellIndex(3, 0, 0), Player.two)
    expect(threatsAfter(board, cellIndex(2, 0, 0), Player.one)).toBe(0)
  })
})

describe('isFork', () => {
  /**
   * Two twos sharing a cell: taking the overlap makes two threes at once, and only one can be blocked.
   * This is the shape the stronger difficulties play towards.
   */
  it('spots the move that leaves two lines one short at once', () => {
    // Two of a row and two of a column, crossing at the corner that is still free.
    const board = place(
      [
        [1, 0, 0],
        [2, 0, 0],
        [0, 1, 0],
        [0, 2, 0],
      ],
      Player.one
    )
    expect(isFork(board, cellIndex(0, 0, 0), Player.one)).toBe(true)
    expect(threatsAfter(board, cellIndex(0, 0, 0), Player.one)).toBeGreaterThanOrEqual(2)
  })

  it('is false for a move that only makes one threat', () => {
    const board = place(
      [
        [0, 0, 0],
        [1, 0, 0],
      ],
      Player.one
    )
    expect(isFork(board, cellIndex(2, 0, 0), Player.one)).toBe(false)
  })
})

describe('forkCells', () => {
  it('names the overlap of two twos', () => {
    const board = place(
      [
        [1, 0, 0],
        [2, 0, 0],
        [0, 1, 0],
        [0, 2, 0],
      ],
      Player.one
    )
    expect(forkCells(board, Player.one)).toContain(cellIndex(0, 0, 0))
  })

  it('finds nothing on an empty board', () => {
    expect(forkCells(createBoard(), Player.one)).toEqual([])
  })

  it('finds nothing when the two lines do not overlap', () => {
    const board = place(
      [
        [0, 0, 0],
        [1, 0, 0],
        [0, 3, 3],
        [1, 3, 3],
      ],
      Player.one
    )
    expect(forkCells(board, Player.one)).toEqual([])
  })

  /**
   * The overlap only reads as a fork if both lines are counted, and both lines have to be twos for it
   * to qualify at all — a third piece on either takes that line out of the running.
   */
  it('only counts lines the sight allows', () => {
    const overlap = cellIndex(1, 1, 0)
    // A row in layer 0 and a rod crossing it at (1,1,0), each holding two. The rod climbs, so a
    // layer-blind player cannot see it.
    const board = place(
      [
        [0, 1, 0],
        [2, 1, 0],
        [1, 1, 1],
        [1, 1, 2],
      ],
      Player.one
    )

    expect(forkCells(board, Player.one, Sight.everything)).toContain(overlap)
    expect(forkCells(board, Player.one, Sight.oneLayer)).not.toContain(overlap)
  })
})

describe('threatCells', () => {
  /** The build move for the weaker tiers: the cells that would make three of a line. */
  it('offers both free cells of a line holding two', () => {
    const board = place(
      [
        [0, 0, 0],
        [1, 0, 0],
      ],
      Player.one
    )
    const cells = threatCells(board, Player.one)
    expect(cells).toContain(cellIndex(2, 0, 0))
    expect(cells).toContain(cellIndex(3, 0, 0))
  })

  it('leaves out a line the opponent has already touched', () => {
    let board = place(
      [
        [0, 0, 0],
        [1, 0, 0],
      ],
      Player.one
    )
    board = place([[3, 0, 0]], Player.two, board)

    expect(threatCells(board, Player.one)).not.toContain(cellIndex(2, 0, 0))
  })

  /** Repeated per line it threatens, so the count is the number of threats a cell would make. */
  it('repeats a cell that sits on two of my near-complete lines', () => {
    const board = place(
      [
        [0, 1, 0],
        [2, 1, 0],
        [1, 1, 1],
        [1, 1, 2],
      ],
      Player.one
    )
    const overlap = cellIndex(1, 1, 0)
    expect(threatCells(board, Player.one).filter((cell) => cell === overlap).length).toBe(2)
  })

  it('finds nothing on an empty board', () => {
    expect(threatCells(createBoard(), Player.one)).toEqual([])
  })
})

describe('the board size assumptions these rest on', () => {
  it('needs four in a row on a four-wide board', () => {
    expect(BOARD_SIZE).toBe(4)
    expect(WINNING_LINES[0]).toHaveLength(BOARD_SIZE)
  })
})
