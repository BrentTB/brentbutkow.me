import { useCallback, useState } from 'react'
import { Board, Player, WinLine } from './tic-tac-toe.types'
import { applyMove, createBoard, isBoardFull, isPlayable, opponentOf } from './engine/board'
import { findWinningLine } from './engine/lines'

type GameSnapshot = {
  board: Board
  currentPlayer: Player
  win: WinLine | null
  /** The cell just played, so the board can mark it. Part of the snapshot, so undo restores it. */
  lastMove: number | null
}

/**
 * How far back you can step. A game runs to 64 moves, so this only bites if someone leans on New
 * game, and dropping the oldest entries is a kinder failure than growing without bound.
 */
const MAX_HISTORY = 200

/** Every position reached, and where in that list we are currently looking. */
type GameHistory = {
  snapshots: GameSnapshot[]
  cursor: number
}

const freshGame = (): GameSnapshot => ({
  board: createBoard(),
  currentPlayer: Player.one,
  win: null,
  lastMove: null,
})

const initialHistory = (): GameHistory => ({ snapshots: [freshGame()], cursor: 0 })

/** Appends a position, dropping any branch that had been undone. */
function commit(history: GameHistory, next: GameSnapshot): GameHistory {
  const kept = [...history.snapshots.slice(0, history.cursor + 1), next]
  const snapshots = kept.slice(Math.max(0, kept.length - MAX_HISTORY))
  return { snapshots, cursor: snapshots.length - 1 }
}

/**
 * The game itself: whose turn it is, what is on the board, and whether anyone has four in a row.
 * All of the rules live in `engine/`, so this only sequences them.
 *
 * State is a list of positions with a cursor rather than a single board, which is what makes undo and
 * redo possible. Starting a new game appends a position like any other, so it can be undone too and a
 * game abandoned by accident is recoverable.
 *
 * Every update is a function of the previous state, so several calls landing in one React batch each
 * see the board the one before it left behind.
 */
export function useGame() {
  const [history, setHistory] = useState<GameHistory>(initialHistory)

  const current = history.snapshots[history.cursor]

  const playAt = useCallback((index: number) => {
    setHistory((past) => {
      const game = past.snapshots[past.cursor]
      if (game.win || !isPlayable(game.board, index)) return past

      const board = applyMove(game.board, index, game.currentPlayer)
      const line = findWinningLine(board, game.currentPlayer)
      return commit(
        past,
        line
          ? {
              board,
              currentPlayer: game.currentPlayer,
              win: { player: game.currentPlayer, cells: line },
              lastMove: index,
            }
          : {
              board,
              currentPlayer: opponentOf(game.currentPlayer),
              win: null,
              lastMove: index,
            }
      )
    })
  }, [])

  const newGame = useCallback(() => setHistory((past) => commit(past, freshGame())), [])

  /**
   * `steps` exists for the one-player game, where a single undo has to take back the computer's reply
   * as well as your own move: stepping back one would just hand the turn straight back to it.
   */
  const undo = useCallback(
    (steps = 1) =>
      setHistory((past) => ({ ...past, cursor: Math.max(0, past.cursor - Math.max(1, steps)) })),
    []
  )

  const redo = useCallback(
    (steps = 1) =>
      setHistory((past) => ({
        ...past,
        cursor: Math.min(past.snapshots.length - 1, past.cursor + Math.max(1, steps)),
      })),
    []
  )

  return {
    board: current.board,
    currentPlayer: current.currentPlayer,
    win: current.win,
    lastMove: current.lastMove,
    /** A full board with no line: the game is over and nobody got four. */
    isDraw: current.win === null && isBoardFull(current.board),
    playAt,
    newGame,
    undo,
    redo,
    canUndo: history.cursor > 0,
    canRedo: history.cursor < history.snapshots.length - 1,
  }
}
