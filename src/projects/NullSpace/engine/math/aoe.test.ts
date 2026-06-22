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

describe('Void Worm segment falloff (burst AoE)', () => {
  const center = { x: 100, y: 100 }
  // Damage taken by an enemy id, given its starting hp.
  const dmg = (result: { enemies: { id: string; hp: number }[] }, id: string, base: number) =>
    base - (result.enemies.find((e) => e.id === id)?.hp ?? 0)

  it('deals diminishing damage to each further segment in one burst', () => {
    const near = createEnemy(EnemyKind.wormSegment, { x: 105, y: 100 })
    const mid = createEnemy(EnemyKind.wormSegment, { x: 120, y: 100 })
    const far = createEnemy(EnemyKind.wormSegment, { x: 140, y: 100 })
    // Fed out of distance order — falloff ranks by distance, not array order.
    const result = damageEnemiesInRadiusFlat([far, near, mid], center, 60, 50)
    const dNear = dmg(result, near.id, near.hp)
    const dMid = dmg(result, mid.id, mid.hp)
    const dFar = dmg(result, far.id, far.hp)
    expect(dNear).toBeCloseTo(50, 5) // nearest takes the full hit
    expect(dNear).toBeGreaterThan(dMid)
    expect(dMid).toBeGreaterThan(dFar)
  })

  it('leaves non-segment clusters at full damage', () => {
    const a = createEnemy(EnemyKind.tank, { x: 105, y: 100 })
    const b = createEnemy(EnemyKind.tank, { x: 140, y: 100 })
    const result = damageEnemiesInRadiusFlat([a, b], center, 60, 20)
    expect(dmg(result, a.id, a.hp)).toBe(20)
    expect(dmg(result, b.id, b.hp)).toBe(20)
  })

  it('does not apply falloff on the DOT path (every segment takes full)', () => {
    const near = createEnemy(EnemyKind.wormSegment, { x: 105, y: 100 })
    const far = createEnemy(EnemyKind.wormSegment, { x: 140, y: 100 })
    const result = damageEnemiesInRadius([near, far], center, 60, 100, 0.1)
    const dNear = dmg(result, near.id, near.hp)
    const dFar = dmg(result, far.id, far.hp)
    expect(dNear).toBeGreaterThan(0)
    expect(dNear).toBeCloseTo(dFar, 5)
  })
})
