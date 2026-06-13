import { describe, it, expect } from 'vitest'
import { updateBurningEnemies } from './burning'
import { createEnemy } from '../entities/entity-creator'
import { EnemyKind } from '../types'
import type { BurningState, Enemy } from '../types'

function burning(over: Partial<BurningState> = {}): BurningState {
  return { remaining: 3, duration: 3, dps: 10, spreadRange: 6, ...over }
}

function lit(pos: { x: number; y: number }, over: Partial<BurningState> = {}): Enemy {
  return { ...createEnemy(EnemyKind.tank, pos), burning: burning(over) }
}

describe('updateBurningEnemies', () => {
  it('applies damage over time and ticks the timer down', () => {
    const enemy = lit({ x: 0, y: 0 })
    const result = updateBurningEnemies([enemy], 0.5)
    const after = result.enemies[0]
    expect(after.hp).toBeCloseTo(enemy.hp - 10 * 0.5, 5)
    expect(after.burning!.remaining).toBeCloseTo(2.5, 5)
  })

  it('clears the fire once the timer expires', () => {
    const enemy = lit({ x: 0, y: 0 }, { remaining: 0.05 })
    const after = updateBurningEnemies([enemy], 0.1).enemies[0]
    expect(after.burning).toBeUndefined()
  })

  it('spreads fire to a touching non-burning enemy with a fresh full burn', () => {
    // Source is nearly burnt out (remaining 1 of 3); the caught fire should reset
    // to a full duration, not inherit the source's depleted timer.
    const src = lit({ x: 0, y: 0 }, { remaining: 1 })
    const neighbour = createEnemy(EnemyKind.drone, { x: 1, y: 0 }) // overlapping → within spread gap
    const result = updateBurningEnemies([src, neighbour], 0.1)
    const caught = result.enemies.find((e) => e.id === neighbour.id)!
    expect(caught.burning).toBeDefined()
    // Reset to duration, then ticked one frame this same pass (3 − 0.1).
    expect(caught.burning!.remaining).toBeGreaterThan(caught.burning!.duration - 0.2)
  })

  it('does not spread to a distant enemy', () => {
    const src = lit({ x: 0, y: 0 })
    const faraway = createEnemy(EnemyKind.drone, { x: 1000, y: 0 })
    const result = updateBurningEnemies([src, faraway], 0.1)
    expect(result.enemies.find((e) => e.id === faraway.id)!.burning).toBeUndefined()
  })

  it('reports kills and score when the fire finishes an enemy', () => {
    const enemy = { ...lit({ x: 0, y: 0 }, { dps: 1000 }), hp: 5 }
    const result = updateBurningEnemies([enemy], 1)
    expect(result.killedEnemies.map((e) => e.id)).toEqual([enemy.id])
    expect(result.scoreGained).toBe(enemy.scoreValue)
    expect(result.enemies).toHaveLength(0)
  })

  it('is a no-op for enemies that are not burning', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 0, y: 0 })
    const result = updateBurningEnemies([enemy], 0.5)
    expect(result.enemies[0]).toBe(enemy)
    expect(result.killedEnemies).toHaveLength(0)
  })
})
