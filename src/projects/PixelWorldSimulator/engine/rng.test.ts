import { describe, it, expect } from 'vitest'
import { createRng } from './rng'

describe('createRng', () => {
  it('stays inside [0, 1)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 500; i++) {
      const value = rng.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('repeats its sequence for the same seed', () => {
    const first = Array.from({ length: 20 }, createRng(99).next)
    const second = Array.from({ length: 20 }, createRng(99).next)
    expect(first).toEqual(second)
  })

  it('diverges for different seeds', () => {
    const a = Array.from({ length: 20 }, createRng(1).next)
    const b = Array.from({ length: 20 }, createRng(2).next)
    expect(a).not.toEqual(b)
  })

  it('keeps generators independent', () => {
    const a = createRng(5)
    const b = createRng(5)
    a.next()
    a.next()
    expect(b.next()).toEqual(createRng(5).next())
  })

  it('chance(0) never fires and chance(1) always does', () => {
    const rng = createRng(3)
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false)
      expect(rng.chance(1)).toBe(true)
    }
  })
})
