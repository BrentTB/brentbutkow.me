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
export const MAX_HISTORY = 200

/** Every position reached, and where in that list we are currently looking. */
type GameHistory = {
  snapshots: GameSnapshot[]
  cursor: number
}

const freshGame = (startsWith: Player): GameSnapshot => ({
  board: createBoard(),
  currentPlayer: startsWith,
  win: null,
  lastMove: null,
})

const initialHistory = (startsWith: Player) => (): GameHistory => ({
  snapshots: [freshGame(startsWith)],
  cursor: 0,
})

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
 *
 * `computer` is the seat the computer holds, so history can skip the positions it would answer.
 *
 * `startsWith` is who opens. Local games always open with player one; an online room may hand the first
 * move to either side, and saying so here keeps the two players' colours and names fixed to their seats
 * rather than shuffling them to keep player one on the move.
 */
export function useGame(computer: Player | null = null, startsWith: Player = Player.one) {
  const [history, setHistory] = useState<GameHistory>(initialHistory(startsWith))

  const current = history.snapshots[history.cursor]

  /**
   * Whether the history can come to rest on a position. Stopping where the computer is to move only
   * starts its turn again, and the reply it lands drops every position ahead of the cursor — so the
   * game the player was stepping through disappears instead of coming back.
   */
  const canRestOn = useCallback(
    (game: GameSnapshot) =>
      computer === null ||
      game.win !== null ||
      isBoardFull(game.board) ||
      game.currentPlayer !== computer,
    [computer]
  )

  /** Nearest position in `direction` the history can rest on, or null if there is none that way. */
  const seek = useCallback(
    (snapshots: GameSnapshot[], from: number, direction: 1 | -1): number | null => {
      for (let at = from + direction; at >= 0 && at < snapshots.length; at += direction) {
        if (canRestOn(snapshots[at])) return at
      }
      return null
    },
    [canRestOn]
  )

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

  /** Starts over. An online room says who opens each game, so a caller may name it outright. */
  const newGame = useCallback(
    (opensWith: Player = startsWith) => setHistory((past) => commit(past, freshGame(opensWith))),
    [startsWith]
  )

  /**
   * Steps to the previous position the game can rest on. In a one-player game that is the pair — your
   * move and the reply to it — since the position between them is the computer's to answer.
   */
  const undo = useCallback(
    () =>
      setHistory((past) => {
        const target = seek(past.snapshots, past.cursor, -1)
        return target === null ? past : { ...past, cursor: target }
      }),
    [seek]
  )

  const redo = useCallback(
    () =>
      setHistory((past) => {
        const target = seek(past.snapshots, past.cursor, 1)
        return target === null ? past : { ...past, cursor: target }
      }),
    [seek]
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
    canUndo: seek(history.snapshots, history.cursor, -1) !== null,
    canRedo: seek(history.snapshots, history.cursor, 1) !== null,
  }
}
