import { describe, it, expect } from 'vitest'
import { stampOverdriveDebuffs, overdriveHasteAt, type OverdriveZone } from './overdrive'
import { createEnemy } from '../entities/entity-creator'
import { EnemyKind } from '../types'

const zone = (overrides: Partial<OverdriveZone> = {}): OverdriveZone => ({
  pos: { x: 1000, y: 1000 },
  radius: 160,
  ampMult: 1.5,
  slowMult: 0.6,
  enemyDamageMult: 0.6,
  selfHaste: 1.4,
  ...overrides,
})

describe('stampOverdriveDebuffs', () => {
  it('stamps the zone multipliers on an enemy inside', () => {
    const e = createEnemy(EnemyKind.drone, { x: 1000, y: 1000 })
    const [stamped] = stampOverdriveDebuffs([e], [zone()])
    expect(stamped.damageTakenMult).toBe(1.5)
    expect(stamped.speedMult).toBe(0.6)
    expect(stamped.damageDealtMult).toBe(0.6)
  })

  it('leaves an enemy outside every zone unstamped', () => {
    const e = createEnemy(EnemyKind.drone, { x: 1400, y: 1000 }) // 400 away, outside r=160
    const [stamped] = stampOverdriveDebuffs([e], [zone()])
    expect(stamped.damageTakenMult).toBeUndefined()
  })

  it('clears a stale stamp when the enemy is no longer in any zone', () => {
    const e = {
      ...createEnemy(EnemyKind.drone, { x: 1400, y: 1000 }),
      damageTakenMult: 1.5,
      speedMult: 0.6,
      damageDealtMult: 0.6,
    }
    const [cleared] = stampOverdriveDebuffs([e], [])
    expect(cleared.damageTakenMult).toBeUndefined()
    expect(cleared.speedMult).toBeUndefined()
    expect(cleared.damageDealtMult).toBeUndefined()
  })

  it('is a no-op (same array) with no zones and no stamps', () => {
    const enemies = [createEnemy(EnemyKind.drone, { x: 0, y: 0 })]
    expect(stampOverdriveDebuffs(enemies, [])).toBe(enemies)
  })

  it('the strongest amp wins when zones overlap', () => {
    const e = createEnemy(EnemyKind.drone, { x: 1000, y: 1000 })
    const [stamped] = stampOverdriveDebuffs([e], [zone({ ampMult: 1.5 }), zone({ ampMult: 2 })])
    expect(stamped.damageTakenMult).toBe(2)
  })
})

describe('overdriveHasteAt', () => {
  it('returns the zone self-haste when the ship is inside', () => {
    expect(overdriveHasteAt({ x: 1000, y: 1000 }, [zone({ selfHaste: 1.4 })])).toBe(1.4)
  })

  it('returns 1 when outside every zone', () => {
    expect(overdriveHasteAt({ x: 1400, y: 1000 }, [zone()])).toBe(1)
  })

  it('takes the strongest haste among overlapping zones', () => {
    const zones = [zone({ selfHaste: 1.4 }), zone({ selfHaste: 1.6 })]
    expect(overdriveHasteAt({ x: 1000, y: 1000 }, zones)).toBe(1.6)
  })
})
