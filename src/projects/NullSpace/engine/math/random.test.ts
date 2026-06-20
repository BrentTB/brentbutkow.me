import { describe, it, expect, beforeEach } from 'vitest'
import { rng, reseedForNewSession, setSessionSeed } from './random'

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

describe('rng getState / setState', () => {
  it('restores the exact sequence from a snapshot (drives deterministic reload)', () => {
    rng.reseed(777)
    rng.next()
    rng.next()
    const snapshot = rng.getState()
    const after = Array.from({ length: 8 }, () => rng.next())
    rng.setState(snapshot)
    const replayed = Array.from({ length: 8 }, () => rng.next())
    expect(replayed).toEqual(after)
  })

  it('getState changes as the generator advances', () => {
    rng.reseed(5)
    const before = rng.getState()
    rng.next()
    expect(rng.getState()).not.toBe(before)
  })

  it('setState guards against a 0 state freezing the generator', () => {
    rng.setState(0)
    expect(rng.getState()).not.toBe(0)
  })
})

describe('reseedForNewSession', () => {
  // Regression: a fresh run reseeded straight from Date.now(), so a test that
  // pinned a seed still drew a wall-clock sequence — the source of the flaky
  // game-loop suite. With a seed pinned, the reseed must honour it, not the clock.
  it('reseeds from the pinned session seed verbatim, not the wall clock', () => {
    setSessionSeed(424242)
    reseedForNewSession()
    expect(rng.getState()).toBe(424242)
    setSessionSeed(null)
  })

  // Production path: with nothing pinned it falls back to a wall-clock seed, so
  // every real run still gets its own unique sequence.
  it('falls back to a fresh seed when no session seed is pinned', () => {
    setSessionSeed(null)
    rng.setState(11)
    reseedForNewSession()
    expect(rng.getState()).not.toBe(11)
  })
})
