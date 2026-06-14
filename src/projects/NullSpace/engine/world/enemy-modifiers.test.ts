import { beforeEach, describe, expect, it } from 'vitest'
import { applyModifier, modifierChance, rollEnemyModifier } from './enemy-modifiers'
import { createEnemy } from '../entities/entity-creator'
import { rng } from '../math/random'
import { ENEMY_MODIFIERS } from '../../data'
import { EnemyKind, EnemyModifier } from '../types'

beforeEach(() => rng.reseed(12345))

describe('modifierChance', () => {
  it('is zero before startWave', () => {
    expect(modifierChance(ENEMY_MODIFIERS.startWave - 1)).toBe(0)
    expect(modifierChance(1)).toBe(0)
  })

  it('rises with wave and caps', () => {
    expect(modifierChance(ENEMY_MODIFIERS.startWave)).toBeCloseTo(ENEMY_MODIFIERS.baseChance)
    expect(modifierChance(ENEMY_MODIFIERS.startWave + 5)).toBeGreaterThan(
      modifierChance(ENEMY_MODIFIERS.startWave)
    )
    expect(modifierChance(1000)).toBe(ENEMY_MODIFIERS.maxChance)
  })
})

describe('rollEnemyModifier', () => {
  it('never rolls before startWave', () => {
    for (let i = 0; i < 50; i++) {
      expect(rollEnemyModifier(EnemyKind.drone, ENEMY_MODIFIERS.startWave - 1)).toBeUndefined()
    }
  })

  it('never rolls on excluded kinds', () => {
    for (const kind of [EnemyKind.swarm, EnemyKind.dreadnought, EnemyKind.shieldGenerator]) {
      for (let i = 0; i < 50; i++) {
        expect(rollEnemyModifier(kind, 40)).toBeUndefined()
      }
    }
  })

  it('rolls valid modifiers on eligible kinds late game', () => {
    const valid = new Set<string>(Object.values(EnemyModifier))
    let rolled = 0
    for (let i = 0; i < 400; i++) {
      const m = rollEnemyModifier(EnemyKind.tank, 40)
      if (m !== undefined) {
        expect(valid.has(m)).toBe(true)
        rolled++
      }
    }
    expect(rolled).toBeGreaterThan(0)
  })
})

describe('applyModifier', () => {
  const base = () => createEnemy(EnemyKind.tank, { x: 0, y: 0 })

  it('speed raises movement speed and tags the enemy', () => {
    const e = base()
    const m = applyModifier(e, EnemyModifier.speed)
    expect(m.modifier).toBe(EnemyModifier.speed)
    expect(m.speed).toBeCloseTo(e.speed * ENEMY_MODIFIERS.speedMult)
    expect(m.enemyShield).toBeUndefined()
  })

  it('shield sizes the pool off maxHp', () => {
    const e = base()
    const m = applyModifier(e, EnemyModifier.shield)
    expect(m.modifier).toBe(EnemyModifier.shield)
    expect(m.enemyShield?.shield).toBeCloseTo(e.maxHp * ENEMY_MODIFIERS.shieldFraction)
    expect(m.enemyShield?.maxShield).toBeCloseTo(e.maxHp * ENEMY_MODIFIERS.shieldFraction)
    expect(m.enemyShield?.cooldownRemaining).toBe(0)
  })

  it('giant slows, enlarges, and toughens', () => {
    const e = base()
    const m = applyModifier(e, EnemyModifier.giant)
    expect(m.modifier).toBe(EnemyModifier.giant)
    expect(m.speed).toBeCloseTo(e.speed * ENEMY_MODIFIERS.giantSpeedMult)
    expect(m.radius).toBeCloseTo(e.radius * ENEMY_MODIFIERS.giantRadiusMult)
    expect(m.hp).toBeCloseTo(e.hp * ENEMY_MODIFIERS.giantHpMult)
    expect(m.maxHp).toBeCloseTo(e.maxHp * ENEMY_MODIFIERS.giantHpMult)
  })
})
