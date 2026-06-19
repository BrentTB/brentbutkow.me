import { apiRoutes } from '../../../api/api'
import { useApiResource, type ApiState } from '../../../api/useApiResource'
import { isLeaderboardArray, type LeaderboardEntry } from './leaderboard.types'

// How many top scores to request — matches the server's own cap.
const LEADERBOARD_LIMIT = 50

// Top scores, highest first.
export function useLeaderboard(): ApiState<LeaderboardEntry[]> {
  return useApiResource<LeaderboardEntry[]>(
    `${apiRoutes.nullspace.leaderboard}?limit=${LEADERBOARD_LIMIT}`,
    isLeaderboardArray
  )
}
