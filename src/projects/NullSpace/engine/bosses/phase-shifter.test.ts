import { describe, it, expect, beforeEach } from 'vitest'
import { createEnemy } from '../entities/entity-creator'
import { updateBossAI } from './boss-ai'
import { getBossDefinition } from './index'
import { PHASE_SHIFTER, PHASE_SHIFTER_BOSS, ShifterStage } from './phase-shifter'
import { getBossRuntime } from './boss-definition'
import { EnemyKind } from '../types'
import type { Enemy } from '../types'
import { WORLD_SIZE } from '../../data'
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
  it('idle expiry starts a telegraph with a target near the ship, inside margins', () => {
    const { boss } = tick([shifterWith(ShifterStage.idle, 0.001)])
    const shifter = shifterState(boss)
    expect(shifter.stage).toBe(ShifterStage.telegraph)
    expect(shifter.stageTimer).toBeCloseTo(PHASE_SHIFTER.telegraphDuration, 1)
    expect(shifter.targetPos).not.toBeNull()
    const d = Math.hypot(shifter.targetPos!.x - CTX.shipPos.x, shifter.targetPos!.y - CTX.shipPos.y)
    expect(d).toBeGreaterThanOrEqual(PHASE_SHIFTER.arrivalMin)
    expect(d).toBeLessThanOrEqual(PHASE_SHIFTER.arrivalMax)
    expect(shifter.targetPos!.x).toBeGreaterThanOrEqual(PHASE_SHIFTER.worldMargin)
    expect(shifter.targetPos!.x).toBeLessThanOrEqual(WORLD_SIZE.x - PHASE_SHIFTER.worldMargin)
    expect(shifter.targetPos!.y).toBeGreaterThanOrEqual(PHASE_SHIFTER.worldMargin)
    expect(shifter.targetPos!.y).toBeLessThanOrEqual(WORLD_SIZE.y - PHASE_SHIFTER.worldMargin)
  })

  it('telegraph target clamps to the world margins when the ship hugs the edge', () => {
    const edgeCtx = { ...CTX, shipPos: { x: 5, y: 5 } }
    const { boss } = tick([shifterWith(ShifterStage.idle, 0.001)], 0.016, edgeCtx)
    const target = shifterState(boss).targetPos!
    expect(target.x).toBeGreaterThanOrEqual(PHASE_SHIFTER.worldMargin)
    expect(target.y).toBeGreaterThanOrEqual(PHASE_SHIFTER.worldMargin)
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

describe('PHASE_SHIFTER_BOSS onDeath', () => {
  it('drops 1–4 space metal collectibles', () => {
    const boss = createEnemy(EnemyKind.phaseShifter, CENTER)
    const drops = PHASE_SHIFTER_BOSS.onDeath!(boss)
    expect(drops.length).toBeGreaterThanOrEqual(1)
    expect(drops.length).toBeLessThanOrEqual(4)
  })
})
