import { describe, expect, it } from 'vitest'
import { pickWeighted, seededRng } from './rng'

describe('seededRng', () => {
  it('repeats exactly for the same seed', () => {
    const runA = Array.from({ length: 20 }, seededRng(1234))
    const runB = Array.from({ length: 20 }, seededRng(1234))
    expect(runA).toEqual(runB)
  })

  it('differs between seeds', () => {
    const a = Array.from({ length: 10 }, seededRng(1))
    const b = Array.from({ length: 10 }, seededRng(2))
    expect(a).not.toEqual(b)
  })

  it('stays inside [0, 1)', () => {
    const rng = seededRng(99)
    for (let i = 0; i < 500; i++) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('pickWeighted', () => {
  it('never picks a zero-weight item when others are available', () => {
    const rng = seededRng(3)
    for (let i = 0; i < 200; i++) {
      expect(pickWeighted(['skip', 'take'], [0, 5], rng)).toBe('take')
    }
  })

  it('skips a zero-weight item even on a draw of exactly zero', () => {
    expect(pickWeighted(['skip', 'take'], [0, 5], () => 0)).toBe('take')
    expect(pickWeighted(['skip', 'also skip', 'take'], [0, 0, 1], () => 0)).toBe('take')
  })

  it('ignores negative weights', () => {
    const rng = seededRng(4)
    for (let i = 0; i < 100; i++) {
      expect(pickWeighted(['bad', 'good'], [-10, 1], rng)).toBe('good')
    }
  })

  it('splits draws roughly in proportion to the weights', () => {
    const rng = seededRng(11)
    let heavy = 0
    const draws = 4000
    for (let i = 0; i < draws; i++) {
      if (pickWeighted(['heavy', 'light'], [9, 1], rng) === 'heavy') heavy++
    }
    expect(heavy / draws).toBeGreaterThan(0.85)
    expect(heavy / draws).toBeLessThan(0.95)
  })

  it('falls back to a uniform pick when every weight is zero', () => {
    expect(['a', 'b']).toContain(pickWeighted(['a', 'b'], [0, 0], () => 0.9))
  })

  it('returns undefined only for an empty list', () => {
    expect(pickWeighted([], [], seededRng(1))).toBeUndefined()
  })
})
