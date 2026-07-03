import { describe, it, expect } from 'vitest'
import { createShuffledCycle, shuffle } from './shuffled-cycle'

describe('shuffle', () => {
  it('returns a new array with the same members', () => {
    const items = [1, 2, 3, 4, 5]
    const result = shuffle(items)
    expect(result).not.toBe(items)
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5])
  })
})

describe('createShuffledCycle', () => {
  it('yields every item exactly once before any repeat', () => {
    const cycle = createShuffledCycle([1, 2, 3, 4, 5])
    const firstPass = Array.from({ length: 5 }, () => cycle.next())
    expect([...firstPass].sort()).toEqual([1, 2, 3, 4, 5])
    expect(firstPass).toContain(cycle.next())
  })

  it('skips items that fail the filter without restarting the cursor', () => {
    const cycle = createShuffledCycle([1, 2, 3, 4, 5, 6])
    const evens = Array.from({ length: 3 }, () => cycle.next((n) => n % 2 === 0))
    expect([...evens].sort()).toEqual([2, 4, 6])
  })

  it('keeps its position when the filter changes mid-cycle', () => {
    const cycle = createShuffledCycle([1, 2, 3, 4])
    const seen = [
      cycle.next((n) => n % 2 === 0),
      cycle.next((n) => n % 2 === 0),
      cycle.next((n) => n % 2 === 1),
      cycle.next((n) => n % 2 === 1),
    ]
    expect([...seen].sort()).toEqual([1, 2, 3, 4])
  })

  it('returns null for an empty pool or a filter nothing passes', () => {
    expect(createShuffledCycle<number>([]).next()).toBeNull()
    expect(createShuffledCycle([1, 2]).next(() => false)).toBeNull()
  })
})
