import { describe, it, expect, beforeEach } from 'vitest'
import { rng } from './random'

beforeEach(() => {
  rng.reseed(12345)
})

describe('rng singleton', () => {
  it('produces values between 0 and 1', () => {
    for (let i = 0; i < 100; i++) {
      const val = rng.next()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })

  it('same seed produces same sequence after reseed', () => {
    rng.reseed(42)
    const first = Array.from({ length: 10 }, () => rng.next())
    rng.reseed(42)
    const second = Array.from({ length: 10 }, () => rng.next())
    expect(first).toEqual(second)
  })

  it('different seeds produce different sequences', () => {
    rng.reseed(1)
    const valuesA = Array.from({ length: 5 }, () => rng.next())
    rng.reseed(2)
    const valuesB = Array.from({ length: 5 }, () => rng.next())
    expect(valuesA).not.toEqual(valuesB)
  })

  it('intRange returns values in [min, max]', () => {
    for (let i = 0; i < 100; i++) {
      const val = rng.intRange(3, 7)
      expect(val).toBeGreaterThanOrEqual(3)
      expect(val).toBeLessThanOrEqual(7)
      expect(Number.isInteger(val)).toBe(true)
    }
  })

  it('range returns values in [min, max)', () => {
    for (let i = 0; i < 100; i++) {
      const val = rng.range(2.0, 5.0)
      expect(val).toBeGreaterThanOrEqual(2.0)
      expect(val).toBeLessThan(5.0)
    }
  })
})
