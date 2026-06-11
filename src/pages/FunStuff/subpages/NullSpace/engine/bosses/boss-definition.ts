import type { BossRuntimeState, Enemy, EnemyKind, Vec2 } from '../types'

export type SpawnSpec = { kind: EnemyKind; pos: Vec2 }
// Loot drop spec — position + initial velocity. Caller creates the Collectible.
export type DropSpec = { pos: Vec2; vel: Vec2 }

// Per-tick world context handed to boss hooks: ship position (aiming, teleport
// targeting), world bounds (clamping charges/landings), and the live enemy
// list so hooks can inspect linked entities or neighbours.
export type BossTickContext = { shipPos: Vec2; worldSize: Vec2; enemies: Enemy[] }

export type BossUpdateResult = {
  updatedRuntime: BossRuntimeState
  spawns: SpawnSpec[]
  // Fresh set of linked entities — when present, the boss tick creates them and
  // replaces `linkedIds`, re-arming the shield (used at the phase-2 transition).
  linkedSpawns?: SpawnSpec[]
  // Patch applied to the boss entity itself — movement bursts, teleports.
  self?: Partial<Pick<Enemy, 'pos' | 'vel' | 'speed'>>
}

export type BossDefinition = {
  kind: EnemyKind
  hpBarLabel: string
  initialState: () => BossRuntimeState
  // Called once the tick after the boss spawns (when hasSpawned is false).
  // Returns spawn specs for shield generators / linked entities.
  onSpawn?: (boss: Enemy) => SpawnSpec[]
  // Gates projectile damage. Return false to absorb the hit without dealing damage.
  canTakeDamage?: (boss: Enemy, enemies: Enemy[]) => boolean
  // Suppresses the cyan damage-gate bubble the renderer draws while
  // canTakeDamage is false. The worm hides it — its body IS the shield.
  hideShieldBubble?: boolean
  // Computes position + facing (vel sets sprite rotation) for the boss's alive
  // linked entities each tick. `linked` arrives in linkedIds order (the worm
  // chain depends on it). The Dreadnought pins its generator ring here; the
  // worm chains segments head-to-tail, each facing its leader.
  positionLinked?: (boss: Enemy, linked: Enemy[]) => Map<string, { pos: Vec2; vel: Vec2 }>
  // Called every frame while the boss is alive.
  onUpdate?: (boss: Enemy, dt: number, ctx: BossTickContext) => BossUpdateResult
  // Called when the boss dies. Returns loot drop specs (positions + velocities).
  onDeath?: (boss: Enemy) => DropSpec[]
  // Aggregate HP for the HUD bar. Default: boss.hp / boss.maxHp. The worm sums
  // head + alive segments so the bar moves while the head is still damage-gated.
  hpBarValue?: (boss: Enemy, enemies: Enemy[]) => { hp: number; maxHp: number }
}

// True while any of the boss's linked entities is still alive. Dreadnought and
// worm invert this for canTakeDamage.
export function hasAliveLinked(boss: Enemy, enemies: Enemy[]): boolean {
  if (!boss.boss) return false
  return boss.boss.linkedIds.some((id) => enemies.some((e) => e.id === id && e.hp > 0))
}
