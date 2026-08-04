import { isRecord } from '../../../utils/is-record'

// One row of the leaderboard. Mirrors the fields the server's ScoreOut exposes
// that the UI actually renders.
export type LeaderboardEntry = {
  id: number
  name: string
  score: number
  wave: number
}

// Validate the untrusted backend payload rather than casting (mirrors `isJokeType`).
const isLeaderboardEntry = (value: unknown): value is LeaderboardEntry =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.name === 'string' &&
  typeof value.score === 'number' &&
  typeof value.wave === 'number'

export const isLeaderboardArray = (value: unknown): value is LeaderboardEntry[] =>
  Array.isArray(value) && value.every(isLeaderboardEntry)
