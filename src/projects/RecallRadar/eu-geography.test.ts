import { describe, expect, it } from 'vitest'
import { euGeographyRows } from './eu-geography'

describe('euGeographyRows', () => {
  it('resolves the three RASFF geography facts to display names', () => {
    const rows = euGeographyRows({
      notifyingCountry: 'IE',
      originCountries: ['ES'],
      distributionCountries: ['IE', 'DE'],
    })
    expect(rows).toEqual([
      { term: 'Notified by', value: 'Ireland' },
      { term: 'Origin', value: 'Spain' },
      { term: 'Distributed to', value: 'Ireland, Germany' },
    ])
  })

  it('returns nothing for non-EU recalls, whose fields are null or absent', () => {
    expect(euGeographyRows({})).toEqual([])
    expect(
      euGeographyRows({
        notifyingCountry: null,
        originCountries: null,
        distributionCountries: null,
      })
    ).toEqual([])
  })

  it('skips empty country lists rather than rendering a blank row', () => {
    const rows = euGeographyRows({
      notifyingCountry: 'FR',
      originCountries: [],
      distributionCountries: [],
    })
    expect(rows).toEqual([{ term: 'Notified by', value: 'France' }])
  })
})
