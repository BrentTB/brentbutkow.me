import { describe, expect, it } from 'vitest'
import { scaleEnemy, waveStatScale } from './enemy-scaling'
import { createEnemy } from '../entities/entity-creator'
import { STAT_SCALING } from '../../data'
import { EnemyKind } from '../types'

describe('waveStatScale', () => {
  it('is ×1.0 at wave 1', () => {
    expect(waveStatScale(1)).toEqual({ hp: 1, damage: 1 })
  })

  it('scales HP much harder than damage', () => {
    const steps = 19 // wave 20
    const s = waveStatScale(20)
    // Derived from the tunable constants so balance tweaks don't break the test.
    expect(s.hp).toBeCloseTo(Math.min(STAT_SCALING.hpMax, 1 + STAT_SCALING.hpPerWave * steps), 5)
    expect(s.damage).toBeCloseTo(
      Math.min(STAT_SCALING.damageMax, 1 + STAT_SCALING.damagePerWave * steps),
      5
    )
    // HP must climb several times faster than contact damage.
    expect(s.hp).toBeGreaterThan(s.damage)
    expect(STAT_SCALING.hpPerWave).toBeGreaterThan(STAT_SCALING.damagePerWave * 2)
  })

  it('increases monotonically', () => {
    for (let w = 2; w < 40; w++) {
      expect(waveStatScale(w).hp).toBeGreaterThanOrEqual(waveStatScale(w - 1).hp)
      expect(waveStatScale(w).damage).toBeGreaterThanOrEqual(waveStatScale(w - 1).damage)
    }
  })

  it('respects the caps', () => {
    const s = waveStatScale(1000)
    expect(s.hp).toBe(STAT_SCALING.hpMax)
    expect(s.damage).toBe(STAT_SCALING.damageMax)
  })
})

describe('scaleEnemy', () => {
  it('scales hp, maxHp and damage together', () => {
    const base = createEnemy(EnemyKind.drone, { x: 0, y: 0 })
    const scaled = scaleEnemy(base, 20)
    const mult = waveStatScale(20)
    expect(scaled.hp).toBeCloseTo(base.hp * mult.hp)
    expect(scaled.maxHp).toBeCloseTo(base.maxHp * mult.hp)
    expect(scaled.damage).toBeCloseTo(base.damage * mult.damage)
    // maxHp tracks hp (full health on spawn).
    expect(scaled.hp).toBeCloseTo(scaled.maxHp)
  })

  it('scales bosses on the same curve and stamps their spawn wave', () => {
    const boss = createEnemy(EnemyKind.dreadnought, { x: 0, y: 0 })
    const scaled = scaleEnemy(boss, 30)
    const mult = waveStatScale(30)
    expect(scaled.hp).toBeCloseTo(boss.hp * mult.hp)
    expect(scaled.maxHp).toBeCloseTo(boss.maxHp * mult.hp)
    expect(scaled.damage).toBeCloseTo(boss.damage * mult.damage)
    // bossTier reads spawnWave to grow the boss's signature mechanic.
    expect(scaled.boss?.spawnWave).toBe(30)
    // The source runtime isn't mutated.
    expect(boss.boss?.spawnWave).toBe(0)
  })
})
