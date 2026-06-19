// One row of the leaderboard. Mirrors the fields the server's ScoreOut exposes
// that the UI actually renders.
export type LeaderboardEntry = {
  id: number
  name: string
  score: number
  wave: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

// Validate the untrusted backend payload rather than casting (mirrors `isJokeType`).
export const isLeaderboardEntry = (value: unknown): value is LeaderboardEntry =>
  isRecord(value) &&
  typeof value.id === 'number' &&
  typeof value.name === 'string' &&
  typeof value.score === 'number' &&
  typeof value.wave === 'number'

export const isLeaderboardArray = (value: unknown): value is LeaderboardEntry[] =>
  Array.isArray(value) && value.every(isLeaderboardEntry)
