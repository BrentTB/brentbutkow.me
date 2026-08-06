import { useCallback, useMemo, useState } from 'react'
import { Board, GameOutcome, Player } from './othello.types'
import {
  applyMove,
  countPieces,
  createBoard,
  getCapturesAt,
  hasLegalMove,
  isGameOver,
  legalMoves,
  opponentOf,
} from './engine/board'

type GameSnapshot = {
  board: Board
  currentPlayer: Player
  /** The cell just played, or null for the opening position and for a pass. */
  lastMove: number | null
  /** The discs the move flipped, in outward order, so the board can animate — and undo can replay it. */
  flipped: number[]
  /** Who just passed to reach this position, for the status line. Null unless the last step was a pass. */
  skipped: Player | null
  /** The final tally once neither side can move, else null. */
  outcome: GameOutcome | null
}

/**
 * How far back you can step. A game runs to at most a board's worth of moves, so this only bites if
 * someone leans on New game, and dropping the oldest entries is a kinder failure than growing unbounded.
 */
const MAX_HISTORY = 300

type GameHistory = {
  snapshots: GameSnapshot[]
  cursor: number
}

function outcomeOf(board: Board): GameOutcome | null {
  if (!isGameOver(board)) return null
  const counts = countPieces(board)
  const winner =
    counts.dark > counts.light ? Player.dark : counts.light > counts.dark ? Player.light : null
  return { dark: counts.dark, light: counts.light, winner }
}

const freshGame = (size: number, startsWith: Player): GameSnapshot => ({
  board: createBoard(size),
  currentPlayer: startsWith,
  lastMove: null,
  flipped: [],
  skipped: null,
  outcome: null,
})

const initialHistory = (size: number, startsWith: Player) => (): GameHistory => ({
  snapshots: [freshGame(size, startsWith)],
  cursor: 0,
})

/** Appends a position, dropping any branch that had been undone. */
function commit(history: GameHistory, next: GameSnapshot): GameHistory {
  const kept = [...history.snapshots.slice(0, history.cursor + 1), next]
  const snapshots = kept.slice(Math.max(0, kept.length - MAX_HISTORY))
  return { snapshots, cursor: snapshots.length - 1 }
}

/**
 * The game itself: whose turn it is, what is on the board, the running score, and whether it is over.
 * All the rules live in `engine/`, so this only sequences them.
 *
 * State is a list of positions with a cursor rather than a single board, which is what makes undo and
 * redo possible. Starting a new game appends a position like any other, so it can be undone too.
 *
 * A pass is a position in its own right, not a silent skip: online it maps to a move on the wire, so
 * both clients agree on whose turn it is, and locally it gives the status line a moment to say who had
 * no move. `mustPass` says the side to move has none; the caller decides when to commit the pass — a
 * local game passes at once, an online one sends it and waits for the echo.
 *
 * `computer` is the seat the computer holds, so history can skip the positions it would answer.
 * `startsWith` is who opens; an online room may hand the first move to either colour.
 */
export function useGame(
  size: number,
  computer: Player | null = null,
  startsWith: Player = Player.dark
) {
  const [history, setHistory] = useState<GameHistory>(initialHistory(size, startsWith))

  const current = history.snapshots[history.cursor]

  const canRestOn = useCallback(
    (game: GameSnapshot) =>
      computer === null || game.outcome !== null || game.currentPlayer !== computer,
    [computer]
  )

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
      if (game.outcome || getCapturesAt(game.board, index, game.currentPlayer).length === 0) {
        return past
      }
      const { board, flipped } = applyMove(game.board, index, game.currentPlayer)
      return commit(past, {
        board,
        currentPlayer: opponentOf(game.currentPlayer),
        lastMove: index,
        flipped,
        skipped: null,
        outcome: outcomeOf(board),
      })
    })
  }, [])

  /** Forfeits the turn. Legal only when the side to move genuinely has none — a guard for online input. */
  const pass = useCallback(() => {
    setHistory((past) => {
      const game = past.snapshots[past.cursor]
      if (game.outcome || hasLegalMove(game.board, game.currentPlayer)) return past
      return commit(past, {
        board: game.board,
        currentPlayer: opponentOf(game.currentPlayer),
        lastMove: null,
        flipped: [],
        skipped: game.currentPlayer,
        outcome: outcomeOf(game.board),
      })
    })
  }, [])

  const newGame = useCallback(
    (opensWith: Player = startsWith, nextSize: number = size) =>
      setHistory((past) => commit(past, freshGame(nextSize, opensWith))),
    [size, startsWith]
  )

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

  const legalCells = useMemo(
    () => (current.outcome ? [] : legalMoves(current.board, current.currentPlayer)),
    [current]
  )

  const counts = useMemo(() => countPieces(current.board), [current])

  return {
    board: current.board,
    currentPlayer: current.currentPlayer,
    lastMove: current.lastMove,
    flipped: current.flipped,
    skipped: current.skipped,
    outcome: current.outcome,
    counts,
    legalCells,
    /** The side to move has no legal move but the game is not over: a pass is owed. */
    mustPass: current.outcome === null && legalCells.length === 0,
    playAt,
    pass,
    newGame,
    undo,
    redo,
    canUndo: seek(history.snapshots, history.cursor, -1) !== null,
    canRedo: seek(history.snapshots, history.cursor, 1) !== null,
  }
}
