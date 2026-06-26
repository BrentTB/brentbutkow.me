import { describe, expect, it } from 'vitest'
import { capacityBands, largestBandWithin } from './capacity-bands'

describe('largestBandWithin', () => {
  it('picks the largest band that still fits', () => {
    expect(largestBandWithin(300)?.label).toBe('a tweet') // 280 fits, 650 does not
    expect(largestBandWithin(280)?.label).toBe('a tweet') // exact boundary fits
    expect(largestBandWithin(500_000)?.label).toBe('the first Harry Potter book')
  })

  it('returns null when even the smallest band is too big', () => {
    expect(largestBandWithin(10)).toBeNull()
  })

  it('caps at the largest band for huge capacities', () => {
    const top = capacityBands[capacityBands.length - 1]
    expect(largestBandWithin(top.bytes * 100)).toBe(top)
  })

  it('never returns a band larger than the capacity', () => {
    for (const max of [50, 1_000, 100_000, 9_000_000]) {
      const band = largestBandWithin(max)
      if (band) expect(band.bytes).toBeLessThanOrEqual(max)
    }
  })
})
