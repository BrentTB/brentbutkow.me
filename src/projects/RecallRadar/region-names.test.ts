import { describe, expect, it } from 'vitest'
import { regionName } from './region-names'

describe('regionName', () => {
  it('maps ISO alpha-2 codes to English names', () => {
    expect(regionName('IE')).toBe('Ireland')
    expect(regionName('DE')).toBe('Germany')
    expect(regionName('GB')).toBe('United Kingdom')
    expect(regionName('GR')).toBe('Greece') // the backend's Greece code (not Eurostat's EL)
  })

  it('is case-insensitive', () => {
    expect(regionName('ie')).toBe('Ireland')
  })

  it('falls back to the raw code for malformed input', () => {
    expect(regionName('??')).toBe('??') // RangeError swallowed, code shown as-is
  })
})
