import { MoveCommit, isMoveCommit } from './othello.types'
import { usePersistedChoice } from '../../utils/usePersistedChoice'

/** Where the preference lives. Namespaced by game, since the site keeps several unrelated keys. */
export const MOVE_COMMIT_KEY = 'othello-move-commit'

/** Instant, as the board has always played. Confirming is something a player opts into. */
export const DEFAULT_MOVE_COMMIT = MoveCommit.instant

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
  const [commit, choose] = usePersistedChoice(MOVE_COMMIT_KEY, isMoveCommit, DEFAULT_MOVE_COMMIT)
  return { commit, choose }
}
