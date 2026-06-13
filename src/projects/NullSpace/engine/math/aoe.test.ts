import { describe, it, expect } from 'vitest'
import { damageEnemiesInRadius, damageEnemiesInRadiusFlat } from './aoe'
import { createEnemy } from '../entities/entity-creator'
import { EnemyKind } from '../types'

describe('damageEnemiesInRadius', () => {
  it('damages enemies inside the radius', () => {
    const enemy = createEnemy(EnemyKind.tank, { x: 105, y: 100 })
    const hpBefore = enemy.hp
    const result = damageEnemiesInRadius([enemy], { x: 100, y: 100 }, 50, 10, 0.1)
    expect(result.enemies[0]?.hp).toBeLessThan(hpBefore)
  })

  it('leaves enemies outside the radius untouched', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 500, y: 500 })
    const hpBefore = enemy.hp
    const result = damageEnemiesInRadius([enemy], { x: 0, y: 0 }, 50, 10, 0.1)
    expect(result.enemies[0]?.hp).toBe(hpBefore)
    expect(result.killedEnemies.length).toBe(0)
  })

  it('scales damage with dt', () => {
    const enemy = createEnemy(EnemyKind.tank, { x: 100, y: 100 })
    const shortTick = damageEnemiesInRadius([enemy], enemy.pos, 50, 10, 0.1)
    const longTick = damageEnemiesInRadius([enemy], enemy.pos, 50, 10, 0.5)
    const shortDelta = enemy.hp - (shortTick.enemies[0]?.hp ?? 0)
    const longDelta = enemy.hp - (longTick.enemies[0]?.hp ?? 0)
    expect(longDelta).toBeCloseTo(shortDelta * 5, 5)
  })

  it('removes enemies whose hp drops to zero and reports kills', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 100, y: 100 })
    const result = damageEnemiesInRadius([enemy], enemy.pos, 50, 9999, 1)
    expect(result.enemies.length).toBe(0)
    expect(result.killedEnemies.length).toBe(1)
    expect(result.scoreGained).toBe(enemy.scoreValue)
    expect(result.powerGained).toBe(enemy.powerReward)
  })

  it('a fast survivor and a kill are reported correctly in one call', () => {
    const survivor = createEnemy(EnemyKind.tank, { x: 100, y: 100 })
    const dead = createEnemy(EnemyKind.drone, { x: 100, y: 100 })
    const result = damageEnemiesInRadius([survivor, dead], { x: 100, y: 100 }, 50, 30, 1)
    expect(result.killedEnemies.length).toBe(1)
    expect(result.killedEnemies[0].id).toBe(dead.id)
    expect(result.enemies.some((e) => e.id === survivor.id)).toBe(true)
  })
})

describe('damageEnemiesInRadiusFlat', () => {
  it('applies the full flat damage value once (no dt scaling)', () => {
    const enemy = createEnemy(EnemyKind.tank, { x: 100, y: 100 })
    const result = damageEnemiesInRadiusFlat([enemy], enemy.pos, 50, 25)
    expect(result.enemies[0]?.hp).toBe(enemy.hp - 25)
  })

  it('one-shot kill removes the enemy and reports it', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 0, y: 0 })
    const result = damageEnemiesInRadiusFlat([enemy], enemy.pos, 50, 9999)
    expect(result.enemies.length).toBe(0)
    expect(result.killedEnemies.length).toBe(1)
    expect(result.scoreGained).toBe(enemy.scoreValue)
  })

  it('ignores enemies outside the radius', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 500, y: 500 })
    const result = damageEnemiesInRadiusFlat([enemy], { x: 0, y: 0 }, 50, 100)
    expect(result.enemies[0]?.hp).toBe(enemy.hp)
  })
})
