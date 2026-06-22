import { toroidalDistance } from '../math/toroid'
import { canEnemyTakeDamage } from '../bosses'
import { EnemyKind } from '../types'
import type { Enemy, Vec2 } from '../types'

// Nearest enemy to `from` within `range` satisfying `ok`, or null. Toroidal —
// distance wraps around the world edge. Shared by Chain Lightning's bolt seeding
// and Hypnosis's single-target snap.
export function nearestEnemyWhere(
  from: Vec2,
  enemies: Enemy[],
  range: number,
  ok: (e: Enemy) => boolean
): Enemy | null {
  let best: Enemy | null = null
  let bestDist = range
  for (const e of enemies) {
    if (!ok(e)) continue
    const d = toroidalDistance(from, e.pos)
    if (d <= bestDist) {
      bestDist = d
      best = e
    }
  }
  return best
}

// Every enemy within `range` of `from` satisfying `ok`, nearest first. Pied Piper's
// AoE charm slices the cap off the front.
export function enemiesWithinWhere(
  from: Vec2,
  enemies: Enemy[],
  range: number,
  ok: (e: Enemy) => boolean
): Enemy[] {
  return enemies
    .filter((e) => ok(e) && toroidalDistance(from, e.pos) <= range)
    .sort((a, b) => toroidalDistance(from, a.pos) - toroidalDistance(from, b.pos))
}

// Boss-structural kinds that are linked to a boss body — charming one would break
// the boss (drop its shield ring, snap its worm chain), so they're off-limits.
// Free-roaming spawns (drones, swarm, even a stray miniVoidWorm) stay fair game.
const CHARM_EXCLUDED: ReadonlySet<EnemyKind> = new Set([
  EnemyKind.shieldGenerator,
  EnemyKind.wormSegment,
])

// Predicate for an enemy Hypnosis may charm: not a boss, fully materialised, not
// invulnerable (shielded-boss gate), and not a boss-structural part.
export function isCharmable(enemies: Enemy[]): (e: Enemy) => boolean {
  return (e) =>
    !e.boss && e.spawnIn <= 0 && canEnemyTakeDamage(e, enemies) && !CHARM_EXCLUDED.has(e.kind)
}
