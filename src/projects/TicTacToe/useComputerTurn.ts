import { useEffect, useRef, useState } from 'react'
import { Board, Difficulty, Player } from './tic-tac-toe.types'
import { chooseMove } from './engine/opponent'
import { Rng } from '../../utils/rng'

/**
 * How long the computer appears to think, whatever the difficulty.
 *
 * Only the strongest tier needs the time; the rest answer in under a millisecond. They wait anyway, so
 * every opponent feels like it is considering the board rather than slapping down a reply the instant
 * you lift your finger.
 */
export const THINKING_TIME_MS = 900

/** A beat to let your own move paint before the search takes the thread. */
export const PAINT_DELAY_MS = 32

/**
 * What the strongest tier is allowed to spend searching: everything left of the thinking time once the
 * paint beat is taken out.
 *
 * Derived rather than picked. The wait happens either way, so a search budget shorter than the window
 * would just be time thrown away, and one longer would make that tier visibly slower than the rest.
 */
export const SEARCH_BUDGET_MS = THINKING_TIME_MS - PAINT_DELAY_MS

type ComputerTurnOptions = {
  board: Board
  /** Which seat the computer holds, or null in a two-player game. */
  computer: Player | null
  currentPlayer: Player
  difficulty: Difficulty
  /** True once the game is over, whether won or drawn. */
  finished: boolean
  rng: Rng
  play: (cell: number) => void
}

/**
 * Takes the computer's turn when it is its move.
 *
 * Keyed on the board itself rather than on a turn counter, so undo and redo cannot leave it convinced
 * it has already replied to a position it is now looking at again.
 *
 * The move is chosen first and the wait padded afterwards, so the total comes out the same for every
 * difficulty. Padding first and then searching would make the strong tier visibly slower than the rest.
 */
export function useComputerTurn({
  board,
  computer,
  currentPlayer,
  difficulty,
  finished,
  rng,
  play,
}: ComputerTurnOptions): { isThinking: boolean } {
  const [isThinking, setIsThinking] = useState(false)

  // Kept in refs so a change of identity mid-think does not restart the timer.
  const playRef = useRef(play)
  playRef.current = play
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

    const think = setTimeout(() => {
      const move = chooseMove(board, computer, difficulty, {
        rng: rngRef.current,
        budgetMs: SEARCH_BUDGET_MS,
      })
      const spent = Date.now() - startedAt

      settle = setTimeout(
        () => {
          setIsThinking(false)
          if (move !== null) playRef.current(move)
        },
        Math.max(0, THINKING_TIME_MS - spent)
      )
    }, PAINT_DELAY_MS)

    return () => {
      clearTimeout(think)
      if (settle !== undefined) clearTimeout(settle)
      setIsThinking(false)
    }
  }, [board, computer, difficulty, itsTurn])

  return { isThinking }
}
