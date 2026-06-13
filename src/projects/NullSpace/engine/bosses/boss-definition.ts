import type { Enemy, EnemyKind, MovementBehavior, Vec2 } from '../types'
import type { Camera } from '../../renderer/camera'
import type { DreadnoughtRuntime } from './dreadnought'
import type { VoidWormRuntime } from './void-worm'
import type { PhaseShifterRuntime } from './phase-shifter'

// Fields every boss runtime shares. Each boss extends them with its own
// kind-tagged fields, declared in its own file.
export type BossRuntimeBase = {
  phase: number
  linkedIds: string[]
  hasSpawned: boolean
}

// Discriminated union of per-boss runtime state — narrowing on `kind` gives a
// boss's own fields with no casts. Each variant lives in its boss's file; a
// new boss adds its variant here (the one central line it needs).
export type BossRuntimeState = DreadnoughtRuntime | VoidWormRuntime | PhaseShifterRuntime

// Enemy kinds that are bosses, derived from the runtime union.
export type BossEnemyKind = BossRuntimeState['kind']

// Narrows an enemy's boss runtime to one boss's variant; undefined when the
// enemy isn't that boss. Hooks invoked by boss-ai always receive their own
// boss, so they may assert the result with `!`.
export function getBossRuntime<K extends BossEnemyKind>(
  boss: Enemy,
  kind: K
): Extract<BossRuntimeState, { kind: K }> | undefined {
  return boss.boss?.kind === kind
    ? (boss.boss as Extract<BossRuntimeState, { kind: K }>)
    : undefined
}

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
  // How the movement system steers this boss (entity-creator reads it at
  // spawn, so boss movement isn't hard-coded in a central table).
  movement: MovementBehavior
  initialState: () => BossRuntimeState
  // Called once the tick after the boss spawns (when hasSpawned is false).
  // Returns spawn specs for shield generators / linked entities.
  onSpawn?: (boss: Enemy) => SpawnSpec[]
  // Gates projectile damage. Return false to absorb the hit without dealing damage.
  canTakeDamage?: (boss: Enemy, enemies: Enemy[]) => boolean
  // Suppresses the cyan damage-gate bubble the renderer draws while
  // canTakeDamage is false. The worm always hides it (its body IS the shield);
  // the Phase Shifter hides it mid-shift (the ghost sprite carries
  // "untouchable" there).
  hideShieldBubble?: (boss: Enemy) => boolean
  // Alpha the boss sprite is drawn with — e.g. the Phase Shifter's 0.35 ghost
  // mid-shift. Absent → fully opaque.
  spriteAlpha?: (boss: Enemy) => number
  // Boss-specific world-layer drawing beneath entities (telegraphs, auras).
  renderBack?: (ctx: CanvasRenderingContext2D, boss: Enemy, camera: Camera) => void
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

// The shared two-phase pattern: phase 1 above half HP, phase 2 at or below.
export function bossPhase(boss: Enemy): number {
  return boss.hp <= boss.maxHp * 0.5 ? 2 : 1
}
