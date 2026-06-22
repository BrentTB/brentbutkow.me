import { EnemyKind, MovementBehavior } from '../types'
import type { Enemy, Vec2 } from '../types'
import { ENEMY_STATS } from '../../data'
import { wrapPosition } from '../math/toroid'
import { homeTowardTarget } from '../math/homing'
import { steerToward } from '../math/steering'
import { unitToward } from '../math/vec'
import { bossTier, getBossRuntime, growByTier, hasAliveLinked } from './boss-definition'
import type {
  BossDefinition,
  BossRuntimeBase,
  BossUpdateResult,
  DropSpec,
  SpawnSpec,
} from './boss-definition'
import { metalBurst } from './loot'

export const WormStage = { cruise: 'cruise', windup: 'windup', charge: 'charge' } as const
export type WormStage = (typeof WormStage)[keyof typeof WormStage]

// Void Worm runtime: attack cycle + the lunge direction (locked while charging).
export type VoidWormRuntime = BossRuntimeBase & {
  kind: typeof EnemyKind.voidWorm
  stage: WormStage
  stageTimer: number
  heading: Vec2
}

// The per-tick slice of the runtime the attack cycle rewrites.
type WormCycle = Pick<VoidWormRuntime, 'stage' | 'stageTimer' | 'heading'>

export const VOID_WORM = {
  segmentCount: 8,
  // Deeper runs spawn a longer worm: +segmentsPerTier per boss tier past the
  // first, capped at maxSegments so it can't grow without bound.
  segmentsPerTier: 2,
  maxSegments: 16,
  // Below the segment sprite width so the body reads as one continuous worm.
  segmentSpacing: 40,
  cruiseSpeed: 80,
  cruiseDuration: 3.5,
  // The stall before a lunge — the player's dodge window.
  windupDuration: 0.6,
  // Faster than any ship patrol speed (max 180); a slingshot fling (600) escapes.
  chargeSpeed: 380,
  chargeDuration: 1.1,
  // Radians/sec the lunge curves to track the ship — a flat sidestep no longer shakes
  // it; you must juke hard or slingshot. Capped so it stays dodgeable.
  chargeTurnRate: 1.8,
  // Damage the head takes while any segment still shields it — reduced, not zero, so
  // hits register and chip it, but clearing the body is far faster (and stops it
  // hurting you). Full damage once every segment is dead.
  shieldedDamageMult: 0.3,
  // A burst loses bite tearing down the chain: segments are damaged in order of
  // distance from the blast, each taking aoeFalloff^index of the hit (nearest =
  // full), floored at aoeFalloffFloor so deep segments still chip. Stops one
  // rocket from deleting the whole body. Applied to burst AoE only (not DOT).
  aoeFalloff: 0.88,
  aoeFalloffFloor: 0.4,
  // Lateral gap between a pair of mini worms erupting from one segment death, so
  // they don't stack on a single pixel — split half to each side of the segment.
  miniSpawnSpread: 10,
} as const

// How many body segments this worm spawns with — base length plus segmentsPerTier
// for each boss tier past the first, capped at maxSegments.
function segmentCount(tier: number): number {
  return growByTier(VOID_WORM.segmentCount, VOID_WORM.segmentsPerTier, tier, VOID_WORM.maxSegments)
}

// Each alive segment sits segmentSpacing behind the piece ahead of it, in
// linkedIds order, facing its leader (vel orients the capsule sprite along the
// chain). Dead segments are simply skipped, so the chain closes up — the worm
// shortens and rejoins on its own.
function positionChain(boss: Enemy, linked: Enemy[]): Map<string, { pos: Vec2; vel: Vec2 }> {
  const positions = new Map<string, { pos: Vec2; vel: Vec2 }>()
  let leader = boss.pos
  for (const seg of linked) {
    const away = unitToward(leader, seg.pos)
    const next = {
      x: leader.x + away.x * VOID_WORM.segmentSpacing,
      y: leader.y + away.y * VOID_WORM.segmentSpacing,
    }
    positions.set(seg.id, { pos: next, vel: { x: -away.x, y: -away.y } })
    leader = next
  }
  return positions
}

export const VOID_WORM_BOSS: BossDefinition = {
  kind: EnemyKind.voidWorm,
  hpBarLabel: 'VOID WORM',
  warning:
    'Something is moving through the asteroids ahead: slow, and winding, and we still have not found the end of it.',
  // The attack cycle owns position and velocity; the movement system leaves
  // the head untouched.
  movement: MovementBehavior.none,

  initialState: (): VoidWormRuntime => ({
    kind: EnemyKind.voidWorm,
    phase: 1,
    linkedIds: [],
    hasSpawned: false,
    spawnWave: 0,
    stage: WormStage.cruise,
    stageTimer: VOID_WORM.cruiseDuration,
    heading: { x: 1, y: 0 },
  }),

  // Segments trail off to one side; the chain pin rearranges them next tick.
  onSpawn: (boss) => {
    const specs: SpawnSpec[] = []
    const count = segmentCount(bossTier(boss.boss?.spawnWave ?? 0))
    for (let i = 0; i < count; i++) {
      specs.push({
        kind: EnemyKind.wormSegment,
        pos: { x: boss.pos.x + (i + 1) * VOID_WORM.segmentSpacing, y: boss.pos.y },
      })
    }
    return specs
  },

  // The body shields the head: while any segment lives the head takes reduced damage
  // (stamped per-frame in onUpdate as shieldDamageMult), full damage once it's exposed.
  // No invincibility gate or bubble — hits land and chip it; the body just makes
  // clearing it the far faster path.

  positionLinked: positionChain,

  onUpdate: (boss, dt, ctx): BossUpdateResult => {
    // boss-ai only invokes onUpdate on this boss's own enemies.
    const worm = getBossRuntime(boss, EnemyKind.voidWorm)!
    // Body still up ⇒ the head only takes reduced damage; exposed ⇒ full.
    const shieldDamageMult = hasAliveLinked(boss, ctx.enemies) ? VOID_WORM.shieldedDamageMult : 1
    const stageTimer = worm.stageTimer - dt

    let next: WormCycle
    let self: BossUpdateResult['self']

    if (worm.stage === WormStage.cruise) {
      // Weave toward the ship at cruise speed, re-aiming every tick. Wrap the
      // head onto the torus — MovementBehavior.none never bounds it.
      const homed = homeTowardTarget(boss.pos, ctx.shipPos, VOID_WORM.cruiseSpeed, dt)
      self = { pos: wrapPosition(homed.pos), vel: homed.vel }
      const heading = unitToward(boss.pos, ctx.shipPos)
      next =
        stageTimer <= 0
          ? { stage: WormStage.windup, stageTimer: VOID_WORM.windupDuration, heading }
          : { ...worm, stageTimer, heading }
    } else if (worm.stage === WormStage.windup) {
      // Stall in place while keeping aim — the tell before the lunge. Tiny
      // vel along heading keeps the head sprite oriented (the renderer uses
      // vel to rotate it); zero vel would flip it to default-facing mid-tell.
      const heading = unitToward(boss.pos, ctx.shipPos)
      self = { vel: { x: heading.x * 0.001, y: heading.y * 0.001 } }
      next =
        stageTimer <= 0
          ? { stage: WormStage.charge, stageTimer: VOID_WORM.chargeDuration, heading }
          : { ...worm, stageTimer, heading }
    } else {
      // Lunge while curving to track the ship (capped) — a flat sidestep can't shake
      // it; the ship has to juke hard or slingshot clear, not just step aside.
      const heading = steerToward(boss.pos, worm.heading, ctx.shipPos, VOID_WORM.chargeTurnRate, dt)
      const pos = wrapPosition({
        x: boss.pos.x + heading.x * VOID_WORM.chargeSpeed * dt,
        y: boss.pos.y + heading.y * VOID_WORM.chargeSpeed * dt,
      })
      self = {
        pos,
        vel: { x: heading.x * VOID_WORM.chargeSpeed, y: heading.y * VOID_WORM.chargeSpeed },
      }
      next =
        stageTimer <= 0
          ? { stage: WormStage.cruise, stageTimer: VOID_WORM.cruiseDuration, heading }
          : { ...worm, stageTimer, heading }
    }
    // Phase is not set here since the worm doesn't change behavior or spawn patterns on phase shifts
    return { updatedRuntime: { ...worm, ...next }, spawns: [], self: { ...self, shieldDamageMult } }
  },

  // Combined head + body HP so the bar moves while the head is damage-gated.
  // maxHp counts every linked segment ever spawned (the worm never re-arms),
  // so the denominator stays stable as segments die.
  hpBarValue: (boss, enemies) => {
    const runtime = boss.boss
    if (!runtime) return { hp: boss.hp, maxHp: boss.maxHp }
    const segmentHp = runtime.linkedIds.reduce((sum, id) => {
      const seg = enemies.find((e) => e.id === id)
      return sum + (seg && seg.hp > 0 ? seg.hp : 0)
    }, 0)
    // Head and segments scaled by the same wave multiplier, so recover it from the
    // head (maxHp / base) to size each segment's contribution to the denominator.
    const hpMult = boss.maxHp / ENEMY_STATS.voidWorm.hp
    return {
      hp: boss.hp + segmentHp,
      maxHp: boss.maxHp + runtime.linkedIds.length * ENEMY_STATS.wormSegment.hp * hpMult,
    }
  },

  onDeath: (boss): DropSpec[] => metalBurst(boss.pos, 2, 4),
}

// One mini worm to spawn from a body segment that died this frame.
export type MiniWormSpawn = { pos: Vec2; spawnWave: number }

// A dying body segment erupts into mini worms. Pseudo-phase by body count, not HP:
// while more than half the original body still lives, each segment death spawns one
// mini worm; once half or fewer remain, each death spawns two. Stateless — the death
// index is derived from how many of the head's linked segments survive this frame, so
// it stays correct even when one blast kills several segments at once.
export function miniWormsFromSegmentDeaths(
  killedThisFrame: Enemy[],
  enemies: Enemy[]
): MiniWormSpawn[] {
  const spawns: MiniWormSpawn[] = []
  for (const head of enemies) {
    if (head.kind !== EnemyKind.voidWorm || !head.boss) continue
    const linked = new Set(head.boss.linkedIds)
    const deadThisFrame = killedThisFrame.filter(
      (e) => e.kind === EnemyKind.wormSegment && linked.has(e.id)
    )
    if (deadThisFrame.length === 0) continue

    const total = head.boss.linkedIds.length
    const aliveAfter = enemies.filter((e) => linked.has(e.id) && e.hp > 0).length
    // This frame's deaths occupy the indices just past those already dead.
    let deathIndex = total - aliveAfter - deadThisFrame.length
    for (const seg of deadThisFrame) {
      deathIndex++
      const count = deathIndex > total / 2 ? 2 : 1
      for (let i = 0; i < count; i++) {
        // Fixed per-spawn offset so a pair doesn't stack on a single pixel.
        const spread = VOID_WORM.miniSpawnSpread
        spawns.push({
          pos: { x: seg.pos.x + (i * spread - ((count - 1) * spread) / 2), y: seg.pos.y },
          spawnWave: head.boss.spawnWave,
        })
      }
    }
  }
  return spawns
}

// A Void Worm can't outlive its head: when a head dies this frame, its remaining
// body segments are culled with it. Returns those segment ids — they crumble
// rather than erupting into mini worms (only combat kills do that).
export function orphanedSegmentIds(killedThisFrame: Enemy[]): Set<string> {
  return new Set(
    killedThisFrame
      .filter((e) => e.kind === EnemyKind.voidWorm && e.boss)
      .flatMap((e) => e.boss!.linkedIds)
  )
}
