import { describe, it, expect } from 'vitest'
import { inZone, nearestZoneWithin, type Zone } from './zone'

const at = (x: number, y: number) => ({ x, y })

describe('inZone', () => {
  it('is true inside a zone and false outside every zone', () => {
    const zones: Zone[] = [{ pos: at(1000, 1000), radius: 100 }]
    expect(inZone(at(1050, 1000), zones)).toBe(true)
    expect(inZone(at(1200, 1000), zones)).toBe(false)
  })

  it('is false when there are no zones', () => {
    expect(inZone(at(0, 0), [])).toBe(false)
  })
})

describe('nearestZoneWithin', () => {
  it('returns the centre of the nearest containing zone', () => {
    const zones: Zone[] = [
      { pos: at(1000, 1000), radius: 200 },
      { pos: at(1100, 1000), radius: 200 },
    ]
    // (1080,1000) sits in both; the (1100,1000) centre is closer.
    expect(nearestZoneWithin(at(1080, 1000), zones)).toEqual(at(1100, 1000))
  })

  it('returns null when no zone contains the point', () => {
    const zones: Zone[] = [{ pos: at(1000, 1000), radius: 50 }]
    expect(nearestZoneWithin(at(1200, 1000), zones)).toBeNull()
  })

  it('ignores zones whose radius does not reach the point', () => {
    const zones: Zone[] = [
      { pos: at(1000, 1000), radius: 30 }, // closest centre, but too small to contain
      { pos: at(900, 1000), radius: 200 }, // farther centre, but contains the point
    ]
    expect(nearestZoneWithin(at(1040, 1000), zones)).toEqual(at(900, 1000))
  })
})
