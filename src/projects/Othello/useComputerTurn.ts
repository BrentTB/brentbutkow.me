import { useEffect, useRef, useState } from 'react'
import { Board, Difficulty, Player } from './othello.types'
import { Rng } from '../../utils/rng'
import { chooseMove } from './engine/opponent'

/**
 * How long the computer appears to think, whatever the difficulty.
 *
 * Only the hard tier needs the time; the rest answer in under a millisecond. They wait anyway, so
 * every opponent feels like it is considering the board rather than slapping down a reply the instant
 * you lift your finger.
 */
export const THINKING_TIME_MS = 850

/** Roughly the two paint frames the search waits out before it runs (see the rAF gate below). */
const PAINT_DELAY_MS = 32

/** What the hard tier may spend searching: the thinking window, less the paint headroom. */
const SEARCH_BUDGET_MS = THINKING_TIME_MS - PAINT_DELAY_MS

type ComputerTurnOptions = {
  board: Board
  /** Which colour the computer holds, or null in a two-player game. */
  computer: Player | null
  currentPlayer: Player
  difficulty: Difficulty
  /** True once the game is over. */
  finished: boolean
  rng: Rng
  play: (cell: number) => void
  /** Called when the computer has no legal move and must forfeit its turn. */
  pass: () => void
}

/**
 * Takes the computer's turn when it is its move: plays a cell, or passes when it has none.
 *
 * Keyed on the board itself rather than on a turn counter, so undo and redo cannot leave it convinced
 * it has already replied to a position it is now looking at again.
 *
 * The move is chosen first and the wait padded afterwards, so the total comes out the same for every
 * difficulty. Padding first and then searching would make the hard tier visibly slower than the rest.
 */
export function useComputerTurn({
  board,
  computer,
  currentPlayer,
  difficulty,
  finished,
  rng,
  play,
  pass,
}: ComputerTurnOptions): { isThinking: boolean } {
  const [isThinking, setIsThinking] = useState(false)

  // Kept in refs so a change of identity mid-think does not restart the timer.
  const playRef = useRef(play)
  playRef.current = play
  const passRef = useRef(pass)
  passRef.current = pass
  const rngRef = useRef(rng)
  rngRef.current = rng

  const itsTurn = computer !== null && !finished && currentPlayer === computer

  useEffect(() => {
    if (!itsTurn || computer === null) {
      setIsThinking(false)
      return
    }

    setIsThinking(true)
    const startedAt = Date.now()
    let settle: ReturnType<typeof setTimeout> | undefined
    let firstFrame = 0
    let secondFrame = 0

    const search = () => {
      const move = chooseMove(board, computer, difficulty, {
        rng: rngRef.current,
        budgetMs: SEARCH_BUDGET_MS,
      })
      const spent = Date.now() - startedAt

      settle = setTimeout(
        () => {
          setIsThinking(false)
          if (move === null) passRef.current()
          else playRef.current(move)
        },
        Math.max(0, THINKING_TIME_MS - spent)
      )
    }

    // Two painted frames of headroom before the search. The hard tier searches synchronously and can
    // hold the main thread for most of a second; kicked off any sooner, it seizes the thread before
    // the player's capturing move has painted, and the flip cascade freezes so the discs look like
    // they never turned. Waiting for two frames lets that paint land first — the flip then rides the
    // compositor (see `will-change` on the disc) while the search runs.
    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(search)
    })

    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
      if (settle !== undefined) clearTimeout(settle)
      setIsThinking(false)
    }
  }, [board, computer, difficulty, itsTurn])

  return { isThinking }
}
