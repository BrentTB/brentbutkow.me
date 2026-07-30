import { Board, Player } from '../tic-tac-toe.types'
import { CELL_COUNT } from './lines'

/**
 * Pure board operations. The game UI and any future opponent both go through these, so a move
 * chooser can be written and tested without touching React.
 */

export function createBoard(): Board {
  return new Array<null>(CELL_COUNT).fill(null)
}

export function isPlayable(board: Board, index: number): boolean {
  return index >= 0 && index < board.length && board[index] === null
}

/** A new board with the move applied. Returns the original if the cell is not playable. */
export function applyMove(board: Board, index: number, player: Player): Board {
  if (!isPlayable(board, index)) return board
  const next = [...board]
  next[index] = player
  return next
}

export function legalMoves(board: Board): number[] {
  const moves: number[] = []
  board.forEach((cell, index) => {
    if (cell === null) moves.push(index)
  })
  return moves
}

/** Careful: player slots are strings, but an index-based check here would treat slot 0 as empty. */
export function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null)
}

export function opponentOf(player: Player): Player {
  return player === Player.one ? Player.two : Player.one
}
