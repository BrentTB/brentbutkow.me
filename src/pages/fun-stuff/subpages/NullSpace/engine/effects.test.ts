import { describe, it, expect, beforeEach } from 'vitest'
import { updateActiveEffects, createMeteoriteEffect, createBlackHoleEffect } from './effects'
import { createShip, createEnemy, resetUid } from './entities'
import { EnemyKind } from './types'
import { WORLD_SIZE, METEORITE_STRIKE, BLACK_HOLE } from '../data'

beforeEach(() => {
  resetUid()
})

describe('updateActiveEffects', () => {
  const ship = createShip(WORLD_SIZE)

  describe('meteor strikes', () => {
    it('keeps strike alive during delay phase', () => {
      const strike = createMeteoriteEffect(
        { x: 100, y: 100 },
        METEORITE_STRIKE.damage,
        METEORITE_STRIKE.aoeRadius,
        METEORITE_STRIKE.delay
      )
      const result = updateActiveEffects([strike], [], ship, 0.1)
      expect(result.activeEffects.length).toBe(1)
      expect(result.activeEffects[0].elapsed).toBeGreaterThan(0)
    })

    it('detonates and removes strike after delay', () => {
      const strike = createMeteoriteEffect(
        { x: 100, y: 100 },
        METEORITE_STRIKE.damage,
        METEORITE_STRIKE.aoeRadius,
        METEORITE_STRIKE.delay
      )
      const result = updateActiveEffects([strike], [], ship, METEORITE_STRIKE.delay + 0.1)
      expect(result.activeEffects.length).toBe(0)
      expect(result.particles.length).toBeGreaterThan(0)
    })

    it('damages enemies in AoE on detonation', () => {
      const strike = createMeteoriteEffect(
        { x: 100, y: 100 },
        METEORITE_STRIKE.damage,
        METEORITE_STRIKE.aoeRadius,
        METEORITE_STRIKE.delay
      )
      const enemy = createEnemy(EnemyKind.drone, { x: 110, y: 100 })
      const result = updateActiveEffects([strike], [enemy], ship, METEORITE_STRIKE.delay + 0.1)
      const surviving = result.enemies.find((e) => e.id === enemy.id)
      if (surviving) {
        expect(surviving.hp).toBeLessThan(enemy.hp)
      } else {
        expect(result.killedEnemies.length).toBeGreaterThan(0)
      }
    })

    it('awards score and power for kills', () => {
      const strike = createMeteoriteEffect({ x: 100, y: 100 }, 9999, 200, 0.01)
      const enemy = createEnemy(EnemyKind.drone, { x: 100, y: 100 })
      const result = updateActiveEffects([strike], [enemy], ship, 0.02)
      expect(result.scoreGained).toBeGreaterThan(0)
      expect(result.powerGained).toBeGreaterThan(0)
      expect(result.killedEnemies.length).toBe(1)
    })
  })

  describe('black holes', () => {
    it('pulls enemies toward center', () => {
      const hole = createBlackHoleEffect(
        { x: 500, y: 500 },
        BLACK_HOLE.radius,
        BLACK_HOLE.pullStrength,
        BLACK_HOLE.damage,
        BLACK_HOLE.duration
      )
      const enemy = createEnemy(EnemyKind.drone, { x: 550, y: 500 })
      const result = updateActiveEffects([hole], [enemy], ship, 0.1)
      expect(result.activeEffects.length).toBe(1)

      const movedEnemy = result.enemies.find((e) => e.id === enemy.id)
      if (movedEnemy) {
        const distBefore = Math.abs(enemy.pos.x - 500)
        const distAfter = Math.abs(movedEnemy.pos.x - 500)
        expect(distAfter).toBeLessThan(distBefore)
      }
    })

    it('expires after duration', () => {
      const hole = createBlackHoleEffect(
        { x: 500, y: 500 },
        BLACK_HOLE.radius,
        BLACK_HOLE.pullStrength,
        BLACK_HOLE.damage,
        BLACK_HOLE.duration
      )
      const result = updateActiveEffects([hole], [], ship, BLACK_HOLE.duration + 0.1)
      expect(result.activeEffects.length).toBe(0)
    })

    it('deals tick damage to enemies inside radius', () => {
      const hole = createBlackHoleEffect(
        { x: 500, y: 500 },
        BLACK_HOLE.radius,
        BLACK_HOLE.pullStrength,
        BLACK_HOLE.damage,
        BLACK_HOLE.duration
      )
      const enemy = createEnemy(EnemyKind.tank, { x: 520, y: 500 })
      const result = updateActiveEffects([hole], [enemy], ship, 0.5)
      const after = result.enemies.find((e) => e.id === enemy.id)
      if (after) {
        expect(after.hp).toBeLessThan(enemy.hp)
      }
    })

    it('ignores enemies outside radius', () => {
      const hole = createBlackHoleEffect(
        { x: 500, y: 500 },
        BLACK_HOLE.radius,
        BLACK_HOLE.pullStrength,
        BLACK_HOLE.damage,
        BLACK_HOLE.duration
      )
      const enemy = createEnemy(EnemyKind.drone, { x: 900, y: 500 })
      const result = updateActiveEffects([hole], [enemy], ship, 0.1)
      const after = result.enemies.find((e) => e.id === enemy.id)
      expect(after).toBeDefined()
      expect(after!.hp).toBe(enemy.hp)
    })
  })

  it('composes multiple effects — enemies flow between them', () => {
    const hole = createBlackHoleEffect({ x: 100, y: 100 }, 200, BLACK_HOLE.pullStrength, 0, 10)
    const strike = createMeteoriteEffect({ x: 100, y: 100 }, 9999, 200, 0.01)
    const enemy = createEnemy(EnemyKind.drone, { x: 110, y: 100 })

    const result = updateActiveEffects([hole, strike], [enemy], ship, 0.02)
    expect(result.killedEnemies.length).toBe(1)
  })
})
