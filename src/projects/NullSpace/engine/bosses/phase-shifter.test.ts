import { describe, it, expect, beforeEach } from 'vitest'
import { createEnemy } from '../entities/entity-creator'
import { updateBossAI } from './boss-ai'
import { getBossDefinition } from './index'
import { PHASE_SHIFTER, PHASE_SHIFTER_BOSS, ShifterStage } from './phase-shifter'
import { getBossRuntime } from './boss-definition'
import { EnemyKind } from '../types'
import type { Enemy } from '../types'
import { WORLD_SIZE } from '../../data'
import { toroidalDistance } from '../math/toroid'
import { rng } from '../math/random'

beforeEach(() => {
  rng.reseed(42)
})

const CENTER = { x: 1500, y: 1500 }
const CTX = { shipPos: { x: 1800, y: 1500 }, worldSize: WORLD_SIZE }

// Narrowed shifter runtime — these tests only build phase-shifter bosses.
const shifterState = (e: Enemy) => getBossRuntime(e, EnemyKind.phaseShifter)!

function shifterWith(stage: ShifterStage, stageTimer: number, hp?: number): Enemy {
  const boss = createEnemy(EnemyKind.phaseShifter, CENTER)
  return {
    ...boss,
    hp: hp ?? boss.hp,
    boss: {
      ...shifterState(boss),
      hasSpawned: true,
      stage,
      stageTimer,
      targetPos: stage === ShifterStage.telegraph ? { x: 1750, y: 1450 } : null,
    },
  }
}

function tick(enemies: Enemy[], dt = 0.016, ctx = CTX) {
  const result = updateBossAI(enemies, dt, ctx)
  return {
    boss: result.enemies.find((e) => e.kind === EnemyKind.phaseShifter)!,
    spawned: result.newEnemies,
  }
}

describe('Phase Shifter — damage gate', () => {
  it('is damageable while idle', () => {
    const boss = shifterWith(ShifterStage.idle, 2)
    const def = getBossDefinition(EnemyKind.phaseShifter)!
    expect(def.canTakeDamage!(boss, [boss])).toBe(true)
  })

  it('is immune for the whole shift', () => {
    const boss = shifterWith(ShifterStage.telegraph, 1)
    const def = getBossDefinition(EnemyKind.phaseShifter)!
    expect(def.canTakeDamage!(boss, [boss])).toBe(false)
  })
})

describe('Phase Shifter — teleport cycle', () => {
  it('idle expiry starts a telegraph with a target near the ship', () => {
    const { boss } = tick([shifterWith(ShifterStage.idle, 0.001)])
    const shifter = shifterState(boss)
    expect(shifter.stage).toBe(ShifterStage.telegraph)
    expect(shifter.stageTimer).toBeCloseTo(PHASE_SHIFTER.telegraphDuration, 1)
    expect(shifter.targetPos).not.toBeNull()
    const d = Math.hypot(shifter.targetPos!.x - CTX.shipPos.x, shifter.targetPos!.y - CTX.shipPos.y)
    expect(d).toBeGreaterThanOrEqual(PHASE_SHIFTER.arrivalMin)
    expect(d).toBeLessThanOrEqual(PHASE_SHIFTER.arrivalMax)
  })

  it('wraps the telegraph target across the seam when the ship hugs an edge', () => {
    const edgeCtx = { ...CTX, shipPos: { x: 5, y: 5 } }
    const { boss } = tick([shifterWith(ShifterStage.idle, 0.001)], 0.016, edgeCtx)
    const target = shifterState(boss).targetPos!
    // No clamping on the torus — the offset wraps, so the point stays in-bounds...
    expect(target.x).toBeGreaterThanOrEqual(0)
    expect(target.x).toBeLessThan(WORLD_SIZE.x)
    expect(target.y).toBeGreaterThanOrEqual(0)
    expect(target.y).toBeLessThan(WORLD_SIZE.y)
    // ...and still lands the configured distance away, measured across the seam.
    const d = toroidalDistance(target, edgeCtx.shipPos)
    expect(d).toBeGreaterThanOrEqual(PHASE_SHIFTER.arrivalMin - 1e-6)
    expect(d).toBeLessThanOrEqual(PHASE_SHIFTER.arrivalMax + 1e-6)
  })

  it('arrival teleports the boss, spawns the swarm ring, and returns to idle', () => {
    const boss = shifterWith(ShifterStage.telegraph, 0.001)
    const target = shifterState(boss).targetPos!
    const { boss: arrived, spawned } = tick([boss])

    expect(arrived.pos).toEqual(target)
    expect(shifterState(arrived).stage).toBe(ShifterStage.idle)
    expect(shifterState(arrived).stageTimer).toBeCloseTo(PHASE_SHIFTER.idleDurationP1, 1)
    expect(shifterState(arrived).targetPos).toBeNull()

    expect(spawned).toHaveLength(PHASE_SHIFTER.ringCountP1)
    expect(spawned.every((e) => e.kind === EnemyKind.swarm)).toBe(true)
    for (const s of spawned) {
      const d = Math.hypot(s.pos.x - target.x, s.pos.y - target.y)
      expect(d).toBeCloseTo(PHASE_SHIFTER.ringRadius, 5)
    }
  })

  it('phase 2 (≤50% HP) brings a bigger ring and a shorter idle', () => {
    const base = createEnemy(EnemyKind.phaseShifter, CENTER)
    const boss = shifterWith(ShifterStage.telegraph, 0.001, Math.floor(base.maxHp * 0.5))
    const { boss: arrived, spawned } = tick([boss])

    expect(arrived.boss!.phase).toBe(2)
    expect(spawned).toHaveLength(PHASE_SHIFTER.ringCountP2)
    expect(shifterState(arrived).stageTimer).toBeCloseTo(PHASE_SHIFTER.idleDurationP2, 1)
  })

  it('damageability flips off at telegraph start and back on at arrival', () => {
    const def = getBossDefinition(EnemyKind.phaseShifter)!

    const { boss: telegraphing } = tick([shifterWith(ShifterStage.idle, 0.001)])
    expect(def.canTakeDamage!(telegraphing, [telegraphing])).toBe(false)

    const { boss: arrived } = tick([shifterWith(ShifterStage.telegraph, 0.001)])
    expect(def.canTakeDamage!(arrived, [arrived])).toBe(true)
  })
})

describe('Phase Shifter — depth scaling', () => {
  // The swarm ring spawned by a shifter that arrived on the given wave.
  function ringAtWave(spawnWave: number): Enemy[] {
    const boss = shifterWith(ShifterStage.telegraph, 0.001)
    const deep = { ...boss, boss: { ...shifterState(boss), spawnWave } }
    return tick([deep]).spawned
  }

  it('drops a bigger ring and mixes in drones the later it appears', () => {
    const shallow = ringAtWave(0) // tier 1
    const deep = ringAtWave(27) // tier 3
    expect(deep.length).toBeGreaterThan(shallow.length)
    expect(shallow.every((e) => e.kind === EnemyKind.swarm)).toBe(true)
    expect(deep.some((e) => e.kind === EnemyKind.drone)).toBe(true)
  })

  it('only ever spawns fast units (a slow kind would pop unfairly on teleport)', () => {
    const fast = new Set<EnemyKind>([EnemyKind.swarm, EnemyKind.drone])
    expect(ringAtWave(45).every((e) => fast.has(e.kind))).toBe(true)
  })

  it('caps the ring size', () => {
    expect(ringAtWave(99999).length).toBeLessThanOrEqual(PHASE_SHIFTER.maxRingCountP1)
  })
})

describe('PHASE_SHIFTER_BOSS onDeath', () => {
  it('drops 1–4 space metal collectibles', () => {
    const boss = createEnemy(EnemyKind.phaseShifter, CENTER)
    const drops = PHASE_SHIFTER_BOSS.onDeath!(boss)
    expect(drops.length).toBeGreaterThanOrEqual(1)
    expect(drops.length).toBeLessThanOrEqual(4)
  })
})
