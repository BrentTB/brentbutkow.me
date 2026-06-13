import { describe, it, expect, vi, afterEach } from 'vitest'
import { computeCurrencyFromKills } from './economy'
import { createEnemy } from '../entities/entity-creator'
import { EnemyKind } from '../types'
import { rng } from '../math/random'

describe('computeCurrencyFromKills', () => {
  afterEach(() => vi.restoreAllMocks())

  const drone = () => createEnemy(EnemyKind.drone, { x: 0, y: 0 })

  it('returns 0 for no kills, whatever the multiplier', () => {
    expect(computeCurrencyFromKills([], 5)).toBe(0)
  })

  it('sums each enemy drop at the default 1x multiplier', () => {
    vi.spyOn(rng, 'intRange').mockReturnValue(10)
    expect(computeCurrencyFromKills([drone(), drone()])).toBe(20)
  })

  it('scales the total by the multiplier and floors a fractional result', () => {
    vi.spyOn(rng, 'intRange').mockReturnValue(10)
    // 10 * 1.25 = 12.5 → floored to 12
    expect(computeCurrencyFromKills([drone()], 1.25)).toBe(12)
  })
})
