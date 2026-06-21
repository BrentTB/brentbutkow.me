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

  it('enters the charge after windup and lunges at full speed', () => {
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

  it('curves its charge toward a target off the heading, capped (no straight-line dodge)', () => {
    // Heading due +x, but the target sits straight up: the lunge bends toward it
    // instead of flying past, so a flat sidestep no longer shakes it.
    const target = targetAt({ x: 1000, y: 1400 })
    const charging = dasherAt(
      { x: 1000, y: 1000 },
      { stage: DashStage.charge, stageTimer: 0.3, heading: { x: 1, y: 0 } }
    )
    const h = tickDasher(charging, target, 0.1).dasher!.heading
    expect(h.y).toBeGreaterThan(0) // bent toward the target
    expect(h.x).toBeGreaterThan(h.y) // but capped — it didn't snap onto it
    expect(Math.hypot(h.x, h.y)).toBeCloseTo(1)
  })

  it('charges slower than a slingshot fling — a dodge check, not a wall', () => {
    expect(DASHER.chargeSpeed).toBeLessThan(SLINGSHOT.baseSpeed)
  })
})
