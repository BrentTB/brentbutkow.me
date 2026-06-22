import { createCharmedAlly } from '../../entities/entity-creator'
import type { Ally, Enemy } from '../../types'

// What a charmFactory hands back: the freshly charmed allies + the enemy ids the
// game loop should remove (they've switched sides this frame).
export type CharmResult = { allies: Ally[]; consumedEnemyIds: string[] }

export const EMPTY_CHARM: CharmResult = { allies: [], consumedEnemyIds: [] }

// Charmed units carry `charmedFrom`; helpers don't. Counting them gates the cap.
export function countCharmed(allies: Ally[]): number {
  return allies.filter((a) => a.charmedFrom !== undefined).length
}

// Convert up to `slots` of `targets` into charmed allies for `duration`s. Shared by
// Hypnosis (one target) and Pied Piper (a radius of them). Empty when out of slots
// or targets — the caller treats that as a no-op (no cooldown/power spent).
export function charmTargets(targets: Enemy[], duration: number, slots: number): CharmResult {
  if (slots <= 0 || targets.length === 0) return EMPTY_CHARM
  const chosen = targets.slice(0, slots)
  return {
    allies: chosen.map((e) => createCharmedAlly(e, duration)),
    consumedEnemyIds: chosen.map((e) => e.id),
  }
}
