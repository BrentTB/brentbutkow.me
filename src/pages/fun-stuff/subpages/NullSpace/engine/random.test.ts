import { describe, it, expect } from 'vitest'
import { SeededRandom } from './random'

describe('SeededRandom', () => {
  it('produces values between 0 and 1', () => {
    const rng = new SeededRandom(12345)
    for (let i = 0; i < 100; i++) {
      const val = rng.next()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })

  it('same seed produces same sequence', () => {
    const a = new SeededRandom(42)
    const b = new SeededRandom(42)
    for (let i = 0; i < 20; i++) {
      expect(a.next()).toBe(b.next())
    }
  })

  it('different seeds produce different sequences', () => {
    const a = new SeededRandom(1)
    const b = new SeededRandom(2)
    const valuesA = Array.from({ length: 5 }, () => a.next())
    const valuesB = Array.from({ length: 5 }, () => b.next())
    expect(valuesA).not.toEqual(valuesB)
  })

  it('intRange returns values in [min, max]', () => {
    const rng = new SeededRandom(999)
    for (let i = 0; i < 100; i++) {
      const val = rng.intRange(3, 7)
      expect(val).toBeGreaterThanOrEqual(3)
      expect(val).toBeLessThanOrEqual(7)
      expect(Number.isInteger(val)).toBe(true)
    }
  })

  it('range returns values in [min, max)', () => {
    const rng = new SeededRandom(555)
    for (let i = 0; i < 100; i++) {
      const val = rng.range(2.0, 5.0)
      expect(val).toBeGreaterThanOrEqual(2.0)
      expect(val).toBeLessThan(5.0)
    }
  })
})
