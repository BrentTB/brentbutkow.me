import { useCallback, useState } from 'react'
import { MoveCommit, isMoveCommit } from './tic-tac-toe.types'

/** Where the preference lives. Namespaced by game, since the site keeps several unrelated keys. */
export const MOVE_COMMIT_KEY = 'ttt-move-commit'

/** Instant, as the board has always played. Confirming is something a player opts into. */
export const DEFAULT_MOVE_COMMIT = MoveCommit.instant

function read(): MoveCommit {
  try {
    const raw = localStorage.getItem(MOVE_COMMIT_KEY)
    return isMoveCommit(raw) ? raw : DEFAULT_MOVE_COMMIT
  } catch {
    // Blocked storage (private mode, a quota error) is the same as never having chosen.
    return DEFAULT_MOVE_COMMIT
  }
}

function write(mode: MoveCommit): void {
  try {
    localStorage.setItem(MOVE_COMMIT_KEY, mode)
  } catch {
    // A game that plays is worth more than a saved preference.
  }
}

export type MoveCommitControl = {
  commit: MoveCommit
  choose: (mode: MoveCommit) => void
}

/**
 * Whether a tap plays a move outright or only aims one, kept in `localStorage`.
 *
 * A preference of this player's, not a term of the room: the opponent only ever sees committed moves,
 * so the two sides can play it differently in the same game.
 */
export function useMoveCommit(): MoveCommitControl {
  const [commit, setCommit] = useState<MoveCommit>(read)

  const choose = useCallback((mode: MoveCommit) => {
    setCommit(mode)
    write(mode)
  }, [])

  return { commit, choose }
}
