import { describe, it, expect } from 'vitest'
import { tickDasher } from './dasher'
import { createEnemy, createShip } from './entity-creator'
import { DashStage, EnemyKind, ShipKind } from '../types'
import type { DasherState, Enemy } from '../types'
import { DASHER, SLINGSHOT, WORLD_SIZE } from '../../data'

// tickDasher only reads ship.pos — a fighter parked at the target works as one.
function targetAt(pos: { x: number; y: number }) {
  return { ...createShip(ShipKind.fighter, WORLD_SIZE), pos }
}

function dasherAt(pos: { x: number; y: number }, override?: Partial<DasherState>): Enemy {
  const e = createEnemy(EnemyKind.dasher, pos)
  if (!override) return e
  return {
    ...e,
    dasher: { stage: DashStage.approach, stageTimer: 0, heading: { x: 1, y: 0 }, ...override },
  }
}

describe('tickDasher', () => {
  it('approaches when far, then enters windup within trigger range', () => {
    const target = targetAt({ x: 1000, y: 1000 })

    const far = tickDasher(dasherAt({ x: 400, y: 1000 }), target, 0.1)
    expect(far.dasher?.stage).toBe(DashStage.approach)
    expect(far.pos.x).toBeGreaterThan(400) // moved toward the target

    const near = tickDasher(
      dasherAt({ x: 1000 - (DASHER.triggerRange - 20), y: 1000 }),
      target,
      0.1
    )
    expect(near.dasher?.stage).toBe(DashStage.windup)
  })

  it('locks a heading and charges fast once the windup elapses', () => {
    const target = targetAt({ x: 1000, y: 1000 })

    const e = dasherAt({ x: 900, y: 1000 }, { stage: DashStage.windup, stageTimer: 0.05 })
    expect(tickDasher(e, target, 0.1).dasher?.stage).toBe(DashStage.charge)

    const mid = dasherAt(
      { x: 900, y: 1000 },
      {
        stage: DashStage.charge,
        stageTimer: 0.3,
        heading: { x: 1, y: 0 },
      }
    )
    const lunged = tickDasher(mid, target, 0.1)
    expect(lunged.pos.x).toBeCloseTo(900 + DASHER.chargeSpeed * 0.1, 0)
    expect(lunged.dasher?.stage).toBe(DashStage.charge)
  })

  it('recovers after the charge, then loops back to approach', () => {
    const target = targetAt({ x: 1000, y: 1000 })
    const ending = dasherAt({ x: 950, y: 1000 }, { stage: DashStage.charge, stageTimer: 0.05 })
    expect(tickDasher(ending, target, 0.1).dasher?.stage).toBe(DashStage.recover)

    const recoverEnd = dasherAt(
      { x: 950, y: 1000 },
      {
        stage: DashStage.recover,
        stageTimer: 0.05,
      }
    )
    expect(tickDasher(recoverEnd, target, 0.1).dasher?.stage).toBe(DashStage.approach)
  })

  it('charges slower than a slingshot fling — a dodge check, not a wall', () => {
    expect(DASHER.chargeSpeed).toBeLessThan(SLINGSHOT.baseSpeed)
  })
})
