import { apiRoutes, postJson } from '../../../api/api'
import { GAME_VERSION } from '../data'
import type { GameState } from '../engine/types'
import type { ScoreSubmission } from './score-submission.types'

// Initials/handle cap — keeps the leaderboard tidy and bounds the payload.
export const MAX_NAME_LENGTH = 20

// Collapse internal whitespace (newlines/tabs included) to single spaces, drop
// control + zero-width chars, then trim and bound the length — so a pasted name
// can't render blank/mangled rows or smuggle invisible characters to the server.
export function sanitizeName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
}

// Total upgrade tiers bought this run — part of the economy footprint the
// server checks the score against (kills, wave and currency are the rest).
function countUpgradeTiers(upgrades: GameState['upgrades']): number {
  return Object.values(upgrades).reduce((sum, u) => sum + u.currentTier, 0)
}

// Builds the leaderboard payload from the final run state. Integers are floored
// and the name trimmed so the server receives clean, bounded values; the actual
// anti-cheat check lives server-side (client values can't be trusted).
export function buildScoreSubmission(
  state: GameState,
  name: string,
  durationMs: number
): ScoreSubmission {
  return {
    name: sanitizeName(name),
    score: Math.floor(state.score),
    kills: Math.floor(state.kills),
    wave: state.wave,
    level: state.level,
    durationMs: Math.max(0, Math.floor(durationMs)),
    shipKind: state.shipKind,
    version: GAME_VERSION,
    currency: Math.floor(state.currency),
    spaceMetal: Math.floor(state.spaceMetal),
    upgradesPurchased: countUpgradeTiers(state.upgrades),
    ultimatesOwned: state.ultimatesOwned.length,
  }
}

export function submitScore(submission: ScoreSubmission): Promise<void> {
  return postJson(apiRoutes.nullspace.score, submission)
}
