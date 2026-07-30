import { useEffect, useRef, useState } from 'react'
import { Board, Difficulty, Player } from './tic-tac-toe.types'
import { chooseMove } from './engine/opponent'
import { Rng } from './engine/rng'

/** Long enough that the computer's reply reads as a move rather than an instant echo of yours. */
export const THINKING_DELAY_MS = 320

export type ComputerTurnOptions = {
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
 * it has already replied to a position it is now looking at again. The pause before it plays is there
 * to make the move legible: an instant reply reads as part of your own click.
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

  // Kept in refs so a change of difficulty mid-think does not restart the timer.
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
    const timer = setTimeout(() => {
      const move = chooseMove(board, computer, difficulty, { rng: rngRef.current })
      setIsThinking(false)
      if (move !== null) playRef.current(move)
    }, THINKING_DELAY_MS)

    return () => {
      clearTimeout(timer)
      setIsThinking(false)
    }
  }, [board, computer, difficulty, itsTurn])

  return { isThinking }
}
