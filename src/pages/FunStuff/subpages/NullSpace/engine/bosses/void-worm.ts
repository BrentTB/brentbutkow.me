import { EnemyKind, WormStage } from '../types'
import type { Enemy, Vec2, WormRuntime } from '../types'
import { ENEMY_STATS } from '../../data'
import { rng } from '../math/random'
import { clamp } from '../math/utils'
import { homeTowardTarget } from '../math/homing'
import { hasAliveLinked } from './boss-definition'
import type { BossDefinition, BossUpdateResult, DropSpec, SpawnSpec } from './boss-definition'

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

// Unit vector from `from` to `to`; falls back to +x when the points coincide.
function aimAt(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d < 0.0001) return { x: 1, y: 0 }
  return { x: dx / d, y: dy / d }
}

// Each alive segment sits segmentSpacing behind the piece ahead of it, in
// linkedIds order, facing its leader (vel orients the capsule sprite along the
// chain). Dead segments are simply skipped, so the chain closes up — the worm
// shortens and rejoins on its own.
function positionChain(boss: Enemy, linked: Enemy[]): Map<string, { pos: Vec2; vel: Vec2 }> {
  const positions = new Map<string, { pos: Vec2; vel: Vec2 }>()
  let leader = boss.pos
  for (const seg of linked) {
    const away = aimAt(leader, seg.pos)
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

  initialState: () => ({
    phase: 1,
    droneSpawnTimer: 0,
    linkedIds: [],
    hasSpawned: false,
    worm: {
      stage: WormStage.cruise,
      stageTimer: VOID_WORM.cruiseDuration,
      heading: { x: 1, y: 0 },
    },
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
  hideShieldBubble: true,

  positionLinked: positionChain,

  onUpdate: (boss, dt, ctx): BossUpdateResult => {
    // boss-ai only invokes onUpdate on confirmed boss enemies, so boss.boss is set.
    const runtime = boss.boss!
    const worm = runtime.worm!
    const stageTimer = worm.stageTimer - dt

    let next: WormRuntime
    let self: BossUpdateResult['self']

    if (worm.stage === WormStage.cruise) {
      // Weave toward the ship at cruise speed, re-aiming every tick.
      const homed = homeTowardTarget(boss.pos, ctx.shipPos, VOID_WORM.cruiseSpeed, dt)
      self = { pos: homed.pos, vel: homed.vel }
      const heading = aimAt(boss.pos, ctx.shipPos)
      next =
        stageTimer <= 0
          ? { stage: WormStage.windup, stageTimer: VOID_WORM.windupDuration, heading }
          : { ...worm, stageTimer, heading }
    } else if (worm.stage === WormStage.windup) {
      // Stall in place while keeping aim — the tell before the lunge.
      self = { vel: { x: 0, y: 0 } }
      const heading = aimAt(boss.pos, ctx.shipPos)
      next =
        stageTimer <= 0
          ? { stage: WormStage.charge, stageTimer: VOID_WORM.chargeDuration, heading }
          : { ...worm, stageTimer, heading }
    } else {
      // Lunge along the locked heading — the ship has to dodge, not outrun.
      const pos = {
        x: clamp(boss.pos.x + worm.heading.x * VOID_WORM.chargeSpeed * dt, 0, ctx.worldSize.x),
        y: clamp(boss.pos.y + worm.heading.y * VOID_WORM.chargeSpeed * dt, 0, ctx.worldSize.y),
      }
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

    return { updatedRuntime: { ...runtime, worm: next }, spawns: [], self }
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

  onDeath: (boss): DropSpec[] => {
    // 2–4 space metal burst outward from the head.
    const count = 2 + rng.intRange(0, 2)
    const drops: DropSpec[] = []
    for (let i = 0; i < count; i++) {
      const angle = rng.range(0, Math.PI * 2)
      const dist = rng.range(20, 60)
      drops.push({
        pos: { x: boss.pos.x + Math.cos(angle) * dist, y: boss.pos.y + Math.sin(angle) * dist },
        vel: { x: Math.cos(angle) * 40, y: Math.sin(angle) * 40 },
      })
    }
    return drops
  },
}
