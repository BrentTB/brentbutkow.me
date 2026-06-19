import { apiRoutes } from '../../../api/api'
import { useApiResource, type ApiState } from '../../../api/useApiResource'
import { isLeaderboardArray, type LeaderboardEntry } from './leaderboard.types'

// Top scores, highest first. The server caps the list at 50.
export function useLeaderboard(): ApiState<LeaderboardEntry[]> {
  return useApiResource<LeaderboardEntry[]>(
    `${apiRoutes.nullspace.leaderboard}?limit=50`,
    isLeaderboardArray
  )
}
