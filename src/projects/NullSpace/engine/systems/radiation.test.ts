import { describe, it, expect } from 'vitest'
import { updateRadiatedEnemies, type RadiationZone } from './radiation'
import { createEnemy } from '../entities/entity-creator'
import { EnemyKind } from '../types'
import type { Enemy } from '../types'

const POS = { x: 1000, y: 1000 }

function zone(overrides: Partial<RadiationZone> = {}): RadiationZone {
  return {
    pos: POS,
    radius: 120,
    dpsPerStack: 0.1,
    maxStacks: 8,
    spreadRange: 0,
    ...overrides,
  }
}

function radiate(enemies: Enemy[], zones: RadiationZone[], dt: number, steps = 1) {
  let result = updateRadiatedEnemies(enemies, zones, dt)
  for (let i = 1; i < steps; i++) {
    result = updateRadiatedEnemies(result.enemies, zones, dt)
  }
  return result
}

describe('updateRadiatedEnemies', () => {
  it('seeds a stack on entering a pool and gains another after stackInterval', () => {
    const enemy = createEnemy(EnemyKind.drone, POS)
    // One 0.4s frame in a pool: starts at 1 stack, gains a second.
    const result = updateRadiatedEnemies([enemy], [zone()], 0.4)
    expect(result.enemies[0].radiation?.stacks).toBe(2)
  })

  it('caps stacks at the pool maxStacks', () => {
    const enemy = createEnemy(EnemyKind.drone, POS)
    const result = radiate([enemy], [zone({ maxStacks: 3 })], 0.4, 20)
    expect(result.enemies[0].radiation?.stacks).toBe(3)
  })

  it('damage scales with stacks', () => {
    const enemy = createEnemy(EnemyKind.drone, POS)
    const result = updateRadiatedEnemies([enemy], [zone({ dpsPerStack: 5 })], 1)
    // Two stacks after the gain → 2 × 5 × 1s = 10 damage off a 20hp drone.
    expect(result.enemies[0].hp).toBeCloseTo(enemy.hp - 10)
  })

  it('decays stacks once the enemy leaves every pool, then clears the status', () => {
    const enemy = createEnemy(EnemyKind.drone, POS)
    // Build up a few stacks inside the pool.
    const charged = radiate([enemy], [zone({ maxStacks: 3 })], 0.4, 10)
    expect(charged.enemies[0].radiation?.stacks).toBe(3)
    // Now outside any pool: one stack lost per decayInterval (1.5s).
    const decayed = radiate(charged.enemies, [], 1.5, 3)
    expect(decayed.enemies[0].radiation).toBeUndefined()
  })

  it('reports killed enemies with their score', () => {
    const enemy = createEnemy(EnemyKind.drone, POS)
    const result = updateRadiatedEnemies([enemy], [zone({ dpsPerStack: 100 })], 1)
    expect(result.enemies).toHaveLength(0)
    expect(result.killedEnemies.map((e) => e.id)).toEqual([enemy.id])
    expect(result.scoreGained).toBe(enemy.scoreValue)
  })

  it('Meltdown contagion: a max-stacked enemy seeds radiation on a bare neighbour', () => {
    const source: Enemy = {
      ...createEnemy(EnemyKind.drone, POS),
      radiation: {
        stacks: 5,
        maxStacks: 5,
        dpsPerStack: 1,
        spreadRange: 60,
        gainCooldown: 0.4,
        decayCooldown: 1.5,
      },
    }
    const neighbour = createEnemy(EnemyKind.drone, { x: POS.x + 20, y: POS.y })
    const result = updateRadiatedEnemies([source, neighbour], [], 0.016)
    const after = result.enemies.find((e) => e.id === neighbour.id)
    expect(after?.radiation?.stacks).toBeGreaterThanOrEqual(1)
  })

  it('a base pool (spreadRange 0) is not contagious', () => {
    const source: Enemy = {
      ...createEnemy(EnemyKind.drone, POS),
      radiation: {
        stacks: 5,
        maxStacks: 5,
        dpsPerStack: 1,
        spreadRange: 0,
        gainCooldown: 0.4,
        decayCooldown: 1.5,
      },
    }
    const neighbour = createEnemy(EnemyKind.drone, { x: POS.x + 20, y: POS.y })
    const result = updateRadiatedEnemies([source, neighbour], [], 0.016)
    expect(result.enemies.find((e) => e.id === neighbour.id)?.radiation).toBeUndefined()
  })
})
