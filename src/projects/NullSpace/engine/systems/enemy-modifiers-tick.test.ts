import { beforeEach, describe, expect, it } from 'vitest'
import { updateModifiedEnemies } from './enemy-modifiers-tick'
import { createEnemy } from '../entities/entity-creator'
import { applyModifier } from '../world/enemy-modifiers'
import { rng } from '../math/random'
import { EnemyKind, EnemyModifier } from '../types'

beforeEach(() => rng.reseed(999))

const withShield = (shield: number, max: number, cooldownRemaining: number) => ({
  ...createEnemy(EnemyKind.tank, { x: 0, y: 0 }),
  modifier: EnemyModifier.shield,
  enemyShield: { shield, maxShield: max, regen: 6, cooldownRemaining },
})

describe('updateModifiedEnemies', () => {
  it('regenerates the shield once the cooldown is clear, clamped to max', () => {
    const { enemies } = updateModifiedEnemies([withShield(10, 30, 0)], 1)
    expect(enemies[0].enemyShield?.shield).toBeCloseTo(16) // +regen*dt
    const full = updateModifiedEnemies([withShield(29, 30, 0)], 1)
    expect(full.enemies[0].enemyShield?.shield).toBe(30) // clamped
  })

  it('ticks the cooldown down instead of regenerating while it is active', () => {
    const { enemies } = updateModifiedEnemies([withShield(10, 30, 2)], 1)
    expect(enemies[0].enemyShield?.shield).toBe(10) // no regen yet
    expect(enemies[0].enemyShield?.cooldownRemaining).toBe(1)
  })

  it('trails particles behind a speed enemy', () => {
    const speed = {
      ...applyModifier(createEnemy(EnemyKind.drone, { x: 0, y: 0 }), EnemyModifier.speed),
      vel: { x: 100, y: 0 },
    }
    let total = 0
    for (let i = 0; i < 60; i++) total += updateModifiedEnemies([speed], 0.016).particles.length
    expect(total).toBeGreaterThan(0)
  })

  it('leaves a plain enemy untouched and emits no particles', () => {
    const plain = createEnemy(EnemyKind.drone, { x: 0, y: 0 })
    const { enemies, particles } = updateModifiedEnemies([plain], 1)
    expect(enemies[0]).toBe(plain)
    expect(particles).toHaveLength(0)
  })
})
