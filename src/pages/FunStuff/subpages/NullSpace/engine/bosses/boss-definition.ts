import type { BossRuntimeState, Enemy, EnemyKind, Vec2 } from '../types'

export type SpawnSpec = { kind: EnemyKind; pos: Vec2 }
// Loot drop spec — position + initial velocity. Caller creates the Collectible.
export type DropSpec = { pos: Vec2; vel: Vec2 }

export type BossDefinition = {
  kind: EnemyKind
  hpBarLabel: string
  initialState: () => BossRuntimeState
  // Distance from the boss center its linked entities (shield generators) orbit.
  // Used by the boss tick to pin them so they never drift into the boss.
  shieldRingDistance?: number
  // Called once the tick after the boss spawns (when hasSpawned is false).
  // Returns spawn specs for shield generators / linked entities.
  onSpawn?: (boss: Enemy) => SpawnSpec[]
  // Gates projectile damage. Return false to absorb the hit without dealing damage.
  canTakeDamage?: (boss: Enemy, enemies: Enemy[]) => boolean
  // Called every frame while the boss is alive. Returns updated runtime state,
  // free entities to spawn (e.g. drones), and optionally a fresh set of linked
  // entities (`linkedSpawns`) — when present, the boss tick creates them and
  // replaces `linkedIds`, re-arming the shield (used at the phase-2 transition).
  onUpdate?: (
    boss: Enemy,
    dt: number
  ) => { updatedRuntime: BossRuntimeState; spawns: SpawnSpec[]; linkedSpawns?: SpawnSpec[] }
  // Called when the boss dies. Returns loot drop specs (positions + velocities).
  onDeath?: (boss: Enemy) => DropSpec[]
}
