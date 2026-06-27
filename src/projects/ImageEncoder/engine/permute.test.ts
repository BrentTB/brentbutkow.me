import { describe, expect, it } from 'vitest'
import { makePermutation } from './permute'

describe('makePermutation', () => {
  it('is a bijection over the range', () => {
    for (const size of [2, 3, 5, 16, 100, 257, 4096]) {
      const perm = makePermutation(size, 12345)
      const seen = new Set<number>()
      for (let i = 0; i < size; i++) {
        const position = perm.at(i)
        expect(position).toBeGreaterThanOrEqual(0)
        expect(position).toBeLessThan(size)
        seen.add(position)
      }
      expect(seen.size).toBe(size)
    }
  })

  it('is deterministic for the same seed', () => {
    const a = makePermutation(1000, 42)
    const b = makePermutation(1000, 42)
    for (let i = 0; i < 50; i++) expect(a.at(i)).toBe(b.at(i))
  })

  it('produces a different order for a different seed', () => {
    const a = makePermutation(1000, 1)
    const b = makePermutation(1000, 2)
    let differences = 0
    for (let i = 0; i < 50; i++) if (a.at(i) !== b.at(i)) differences++
    expect(differences).toBeGreaterThan(0)
  })

  it('handles trivial sizes', () => {
    expect(makePermutation(1, 7).at(0)).toBe(0)
    expect(makePermutation(0, 7).at(0)).toBe(0)
  })
})
