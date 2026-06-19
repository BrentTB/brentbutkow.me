import type { ShipKind } from '../engine/types'

// Payload POSTed to the backend when a run ends. Beyond the score it carries a
// snapshot of run stats the server cross-checks: a forged score won't line up
// with the wave reached or the economy earned getting there.
export type ScoreSubmission = {
  name: string
  score: number
  kills: number
  wave: number
  level: number
  durationMs: number
  shipKind: ShipKind
  // Game version at time of play — balance differs between versions, so the
  // server scopes plausibility ceilings (and the leaderboard) by it.
  version: string
  currency: number
  spaceMetal: number
  upgradesPurchased: number
  ultimatesOwned: number
}
