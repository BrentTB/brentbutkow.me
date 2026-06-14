import { describe, expect, it } from 'vitest'
import { applyDamageToEnemy } from './enemy-damage'
import { createEnemy } from './entity-creator'
import { ANIMATION, SHIELD_COOLDOWN } from '../../data'
import { EnemyKind } from '../types'

const shielded = (shield: number, max = shield) => ({
  ...createEnemy(EnemyKind.tank, { x: 0, y: 0 }),
  enemyShield: { shield, maxShield: max, regen: 6, cooldownRemaining: 0 },
})

describe('applyDamageToEnemy', () => {
  it('subtracts straight from HP when there is no shield', () => {
    const e = createEnemy(EnemyKind.tank, { x: 0, y: 0 })
    expect(applyDamageToEnemy(e, 10).hp).toBe(e.hp - 10)
  })

  it('is a no-op for non-positive damage', () => {
    const e = createEnemy(EnemyKind.tank, { x: 0, y: 0 })
    expect(applyDamageToEnemy(e, 0)).toBe(e)
    expect(applyDamageToEnemy(e, -5)).toBe(e)
  })

  it('absorbs into the shield first and resets the regen cooldown', () => {
    const e = shielded(30)
    const hit = applyDamageToEnemy(e, 10)
    expect(hit.hp).toBe(e.hp) // HP untouched
    expect(hit.enemyShield?.shield).toBe(20)
    expect(hit.enemyShield?.cooldownRemaining).toBe(SHIELD_COOLDOWN)
  })

  it('overflows to HP once the shield is exhausted', () => {
    const e = shielded(10)
    const hit = applyDamageToEnemy(e, 25)
    expect(hit.enemyShield?.shield).toBe(0)
    expect(hit.hp).toBe(e.hp - 15)
    expect(hit.enemyShield?.cooldownRemaining).toBe(SHIELD_COOLDOWN)
  })

  it('does not reset the cooldown when the shield is already depleted', () => {
    const e = {
      ...shielded(0, 30),
      enemyShield: { shield: 0, maxShield: 30, regen: 6, cooldownRemaining: 1 },
    }
    const hit = applyDamageToEnemy(e, 10)
    expect(hit.hp).toBe(e.hp - 10)
    expect(hit.enemyShield?.cooldownRemaining).toBe(1) // regen keeps ticking
  })

  it('triggers the white hit-flash on HP damage but not on a pure shield absorb', () => {
    const plain = createEnemy(EnemyKind.tank, { x: 0, y: 0 })
    expect(applyDamageToEnemy(plain, 10).hitFlash).toBeCloseTo(ANIMATION.hitFlash)

    // Damage fully absorbed by the shield → no flash (the ring reads instead).
    expect(applyDamageToEnemy(shielded(30), 10).hitFlash).toBe(0)
    // Overflow past the shield → flash fires.
    expect(applyDamageToEnemy(shielded(10), 25).hitFlash).toBeCloseTo(ANIMATION.hitFlash)
  })
})
