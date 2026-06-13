import { EnemyKind, MovementBehavior } from '../types'
import type { Enemy, Vec2 } from '../types'
import { ENEMY_STATS } from '../../data'
import { clampToWorld } from '../math/utils'
import { homeTowardTarget } from '../math/homing'
import { unitToward } from '../math/vec'
import { getBossRuntime, hasAliveLinked } from './boss-definition'
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
  // Below the segment sprite width so the body reads as one continuous worm.
  segmentSpacing: 40,
  cruiseSpeed: 80,
  cruiseDuration: 3.5,
  // The stall before a lunge — the player's dodge window.
  windupDuration: 0.8,
  // Faster than any ship patrol speed (max 180); a slingshot fling (600) escapes.
  chargeSpeed: 380,
  chargeDuration: 1.1,
} as const

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
  // The attack cycle owns position and velocity; the movement system leaves
  // the head untouched.
  movement: MovementBehavior.none,

  initialState: (): VoidWormRuntime => ({
    kind: EnemyKind.voidWorm,
    phase: 1,
    linkedIds: [],
    hasSpawned: false,
    stage: WormStage.cruise,
    stageTimer: VOID_WORM.cruiseDuration,
    heading: { x: 1, y: 0 },
  }),

  // Segments trail off to one side; the chain pin rearranges them next tick.
  onSpawn: (boss) => {
    const specs: SpawnSpec[] = []
    for (let i = 0; i < VOID_WORM.segmentCount; i++) {
      specs.push({
        kind: EnemyKind.wormSegment,
        pos: { x: boss.pos.x + (i + 1) * VOID_WORM.segmentSpacing, y: boss.pos.y },
      })
    }
    return specs
  },

  // The body shields the head — destroy every segment to expose it.
  canTakeDamage: (boss, enemies) => !hasAliveLinked(boss, enemies),
  // The trailing body already says "kill that first" — no bubble needed.
  hideShieldBubble: () => true,

  positionLinked: positionChain,

  onUpdate: (boss, dt, ctx): BossUpdateResult => {
    // boss-ai only invokes onUpdate on this boss's own enemies.
    const worm = getBossRuntime(boss, EnemyKind.voidWorm)!
    const stageTimer = worm.stageTimer - dt

    let next: WormCycle
    let self: BossUpdateResult['self']

    if (worm.stage === WormStage.cruise) {
      // Weave toward the ship at cruise speed, re-aiming every tick. Clamp
      // matches the charge branch — a ship kited to a world edge would
      // otherwise drag the head off the playfield (MovementBehavior.none
      // never bounds it).
      const homed = homeTowardTarget(boss.pos, ctx.shipPos, VOID_WORM.cruiseSpeed, dt)
      self = { pos: clampToWorld(homed.pos, ctx.worldSize), vel: homed.vel }
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
      // Lunge along the locked heading — the ship has to dodge, not outrun.
      const pos = clampToWorld(
        {
          x: boss.pos.x + worm.heading.x * VOID_WORM.chargeSpeed * dt,
          y: boss.pos.y + worm.heading.y * VOID_WORM.chargeSpeed * dt,
        },
        ctx.worldSize
      )
      self = {
        pos,
        vel: {
          x: worm.heading.x * VOID_WORM.chargeSpeed,
          y: worm.heading.y * VOID_WORM.chargeSpeed,
        },
      }
      next =
        stageTimer <= 0
          ? { stage: WormStage.cruise, stageTimer: VOID_WORM.cruiseDuration, heading: worm.heading }
          : { ...worm, stageTimer }
    }
    // Phase is not set here since the worm doesn't change behavior or spawn patterns on phase shifts
    return { updatedRuntime: { ...worm, ...next }, spawns: [], self }
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
    return {
      hp: boss.hp + segmentHp,
      maxHp: boss.maxHp + runtime.linkedIds.length * ENEMY_STATS.wormSegment.hp,
    }
  },

  onDeath: (boss): DropSpec[] => metalBurst(boss.pos, 2, 4),
}
