import { useCallback, useState } from 'react'
import { Board, Player, WinLine } from './tic-tac-toe.types'
import { applyMove, createBoard, isBoardFull, isPlayable, opponentOf } from './engine/board'
import { findWinningLine } from './engine/lines'

type GameSnapshot = {
  board: Board
  currentPlayer: Player
  win: WinLine | null
}

const freshGame = (): GameSnapshot => ({
  board: createBoard(),
  currentPlayer: Player.one,
  win: null,
})

/**
 * The game itself: whose turn it is, what is on the board, and whether anyone has four in a row.
 * All of the rules live in `engine/`, so this only sequences them.
 */
export function useGame() {
  const [game, setGame] = useState<GameSnapshot>(freshGame)

  const playAt = useCallback((index: number) => {
    setGame((current) => {
      if (current.win || !isPlayable(current.board, index)) return current

      const board = applyMove(current.board, index, current.currentPlayer)
      const line = findWinningLine(board, current.currentPlayer)
      if (line) {
        return {
          board,
          currentPlayer: current.currentPlayer,
          win: { player: current.currentPlayer, cells: line },
        }
      }
      return { board, currentPlayer: opponentOf(current.currentPlayer), win: null }
    })
  }, [])

  const reset = useCallback(() => setGame(freshGame()), [])

  return {
    board: game.board,
    currentPlayer: game.currentPlayer,
    win: game.win,
    /** A full board with no line: the game is over and nobody got four. */
    isDraw: game.win === null && isBoardFull(game.board),
    playAt,
    reset,
  }
}
