import { describe, it, expect } from 'vitest'
import { damageEnemiesInBeam } from './beam-damage'
import { createEnemy } from '../../entities/entity-creator'
import { EnemyKind } from '../../types'
import type { Enemy } from '../../types'

const KILL_BURST = { count: 12, color: '#fff' }

function tank(pos: { x: number; y: number }, hp = 1000): Enemy {
  return { ...createEnemy(EnemyKind.tank, pos), hp, maxHp: hp }
}

describe('damageEnemiesInBeam', () => {
  it('damages enemies inside the radius and leaves those outside untouched', () => {
    const inside = tank({ x: 0, y: 0 })
    const outside = tank({ x: 1000, y: 0 })
    const result = damageEnemiesInBeam([inside, outside], [], { x: 0, y: 0 }, 40, 50, {
      killBurst: KILL_BURST,
    })
    expect(result.killedEnemies).toHaveLength(0)
    expect(result.enemies).toHaveLength(2)
    const hit = result.enemies.find((e) => e.id === inside.id)!
    const missed = result.enemies.find((e) => e.id === outside.id)!
    expect(hit.hp).toBe(950)
    expect(missed.hp).toBe(1000)
  })

  it('moves lethal hits to killedEnemies and emits the kill burst', () => {
    const enemy = tank({ x: 0, y: 0 }, 10)
    const result = damageEnemiesInBeam([enemy], [], { x: 0, y: 0 }, 40, 50, {
      killBurst: { count: 12, color: '#abc' },
    })
    expect(result.killedEnemies).toEqual([enemy])
    expect(result.enemies).toHaveLength(0)
    expect(result.particles).toHaveLength(12)
  })

  it('applies the onSurvive transform to enemies that live through the hit', () => {
    const enemy = tank({ x: 0, y: 0 })
    const result = damageEnemiesInBeam([enemy], [], { x: 0, y: 0 }, 40, 50, {
      killBurst: KILL_BURST,
      onSurvive: (e) => ({ ...e, burning: { remaining: 3, duration: 3, dps: 5, spreadRange: 10 } }),
    })
    expect(result.enemies[0].burning).toEqual({
      remaining: 3,
      duration: 3,
      dps: 5,
      spreadRange: 10,
    })
  })

  it('emits the survive burst only when one is configured', () => {
    const enemy = tank({ x: 0, y: 0 })
    const without = damageEnemiesInBeam([enemy], [], { x: 0, y: 0 }, 40, 50, {
      killBurst: KILL_BURST,
    })
    expect(without.particles).toHaveLength(0)
    const withBurst = damageEnemiesInBeam([enemy], [], { x: 0, y: 0 }, 40, 50, {
      killBurst: KILL_BURST,
      surviveBurst: { count: 4, color: '#def' },
    })
    expect(withBurst.particles).toHaveLength(4)
  })
})
