import { Board, Player } from '../tic-tac-toe.types'
import { opponentOf } from './board'
import { BOARD_SIZE, CELL_COUNT, WINNING_LINES, cellCoord } from './lines'

/**
 * Reading a position in terms of its 76 lines. Every difficulty is built from this vocabulary; they
 * differ in which lines they are allowed to look at and how decisively they act on what they see.
 */

/** For each cell, the indices of the lines running through it. */
export const LINES_THROUGH_CELL: readonly (readonly number[])[] = (() => {
  const through: number[][] = Array.from({ length: CELL_COUNT }, () => [])
  WINNING_LINES.forEach((line, lineIndex) => {
    for (const cell of line) through[cell].push(lineIndex)
  })
  return through
})()

/**
 * How much of a line each side holds. `empties` lists the cells still free, so a caller can turn a
 * near-miss straight into the move that completes or blocks it.
 */
export type LineRead = {
  lineIndex: number
  mine: number
  theirs: number
  empties: number[]
}

/**
 * Which lines a difficulty is allowed to notice. Weakness is modelled as not seeing part of the board
 * rather than as playing badly on purpose: a beginner builds tidy rows inside one layer and never looks
 * up, so their losses come from directions they were never watching.
 */
export const Sight = {
  /** All 76. */
  everything: 'everything',
  /** Only lines lying inside a single layer: rows, columns, and the two diagonals of each plate. */
  oneLayer: 'oneLayer',
  /** Everything except the four corner-to-corner body diagonals. */
  noBodyDiagonals: 'noBodyDiagonals',
} as const
export type Sight = (typeof Sight)[keyof typeof Sight]

const lineSpan = (lineIndex: number) => {
  const line = WINNING_LINES[lineIndex]
  const from = cellCoord(line[0])
  const to = cellCoord(line[BOARD_SIZE - 1])
  return {
    x: Math.abs(to.x - from.x) > 0,
    y: Math.abs(to.y - from.y) > 0,
    layer: Math.abs(to.layer - from.layer) > 0,
  }
}

/** The line indices a given sight takes in. */
export const VISIBLE_LINES: Record<Sight, readonly number[]> = (() => {
  const all = WINNING_LINES.map((_, index) => index)
  return {
    [Sight.everything]: all,
    [Sight.oneLayer]: all.filter((index) => !lineSpan(index).layer),
    [Sight.noBodyDiagonals]: all.filter((index) => {
      const span = lineSpan(index)
      return !(span.x && span.y && span.layer)
    }),
  }
})()

/** How each side stands on every line the given sight can see. */
export function readLines(
  board: Board,
  player: Player,
  sight: Sight = Sight.everything
): LineRead[] {
  const them = opponentOf(player)
  return VISIBLE_LINES[sight].map((lineIndex) => {
    const line = WINNING_LINES[lineIndex]
    let mine = 0
    let theirs = 0
    const empties: number[] = []
    for (const cell of line) {
      const owner = board[cell]
      if (owner === player) mine++
      else if (owner === them) theirs++
      else empties.push(cell)
    }
    return { lineIndex, mine, theirs, empties }
  })
}

/** Cells that finish a line for `player` right now. */
export function winningMoves(
  board: Board,
  player: Player,
  sight: Sight = Sight.everything
): number[] {
  const cells = new Set<number>()
  for (const read of readLines(board, player, sight)) {
    if (read.mine === BOARD_SIZE - 1 && read.theirs === 0) cells.add(read.empties[0])
  }
  return [...cells]
}

/**
 * Cells that would give `player` three of a line with the fourth still free: the move that forces a
 * reply. A cell may appear once per line it threatens, so the count is the number of threats made.
 */
export function threatCells(
  board: Board,
  player: Player,
  sight: Sight = Sight.everything
): number[] {
  const cells: number[] = []
  for (const read of readLines(board, player, sight)) {
    if (read.mine === BOARD_SIZE - 2 && read.theirs === 0) cells.push(...read.empties)
  }
  return cells
}

/** How many separate lines `player` would be one move from completing after playing `cell`. */
export function threatsAfter(
  board: Board,
  cell: number,
  player: Player,
  sight: Sight = Sight.everything
): number {
  const them = opponentOf(player)
  let threats = 0

  for (const lineIndex of LINES_THROUGH_CELL[cell]) {
    if (!VISIBLE_LINES[sight].includes(lineIndex)) continue
    const line = WINNING_LINES[lineIndex]
    let mine = 1 // the piece just played
    let theirs = 0
    for (const other of line) {
      if (other === cell) continue
      const owner = board[other]
      if (owner === player) mine++
      else if (owner === them) theirs++
    }
    if (mine === BOARD_SIZE - 1 && theirs === 0) threats++
  }
  return threats
}

/**
 * A move that leaves two lines each needing only one more cell. The opponent can block one, so the
 * other wins: this is the shape the stronger difficulties actually play towards.
 */
export function isFork(
  board: Board,
  cell: number,
  player: Player,
  sight: Sight = Sight.everything
): boolean {
  return threatsAfter(board, cell, player, sight) >= 2
}

/**
 * Empty cells that would become forks for `player` if they got there. Counting these is how a position
 * is judged to be "building something" rather than merely occupying good squares: two twos sharing a
 * cell means whoever takes the overlap makes two threes at once.
 */
export function forkCells(board: Board, player: Player, sight: Sight = Sight.everything): number[] {
  const nearlyTwo = new Map<number, number>()

  for (const read of readLines(board, player, sight)) {
    if (read.mine !== BOARD_SIZE - 2 || read.theirs !== 0) continue
    for (const empty of read.empties) {
      nearlyTwo.set(empty, (nearlyTwo.get(empty) ?? 0) + 1)
    }
  }

  return [...nearlyTwo.entries()].filter(([, lines]) => lines >= 2).map(([cell]) => cell)
}
