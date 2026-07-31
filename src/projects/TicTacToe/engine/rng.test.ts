import { describe, expect, it } from 'vitest'
import { pickOne, pickWeighted, seededRng } from './rng'

describe('seededRng', () => {
  it('repeats exactly for the same seed', () => {
    const first = seededRng(1234)
    const second = seededRng(1234)
    const runA = Array.from({ length: 20 }, first)
    const runB = Array.from({ length: 20 }, second)
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

describe('pickOne', () => {
  it('returns undefined for an empty list', () => {
    expect(pickOne([], seededRng(1))).toBeUndefined()
  })

  it('picks by position in the list', () => {
    const items = ['a', 'b', 'c', 'd']
    expect(pickOne(items, () => 0)).toBe('a')
    expect(pickOne(items, () => 0.5)).toBe('c')
  })

  /** A generator returning exactly 1 would index past the end. */
  it('stays in range at the very top of the generator', () => {
    expect(pickOne(['a', 'b'], () => 0.999999)).toBe('b')
    expect(pickOne(['a', 'b'], () => 1)).toBe('b')
  })

  it('reaches every item across many draws', () => {
    const rng = seededRng(7)
    const seen = new Set(Array.from({ length: 200 }, () => pickOne(['a', 'b', 'c'], rng)))
    expect(seen.size).toBe(3)
  })
})

describe('pickWeighted', () => {
  it('never picks a zero-weight item when others are available', () => {
    const rng = seededRng(3)
    for (let i = 0; i < 200; i++) {
      expect(pickWeighted(['skip', 'take'], [0, 5], rng)).toBe('take')
    }
  })

  /**
   * Regression: a draw of exactly zero left the running total at zero, which the `target <= 0` test read as
   * a hit on whichever item came first — including one whose weight ruled it out. `Rng`'s contract is
   * [0, 1), so zero is a legal draw, and `seededRng` happens never to produce it.
   */
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

  /** A caller always needs a move back, even if every candidate scored zero. */
  it('falls back to a uniform pick when every weight is zero', () => {
    const chosen = pickWeighted(['a', 'b'], [0, 0], () => 0.9)
    expect(['a', 'b']).toContain(chosen)
  })

  it('returns undefined only for an empty list', () => {
    expect(pickWeighted([], [], seededRng(1))).toBeUndefined()
  })
})
