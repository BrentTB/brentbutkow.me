import { describe, expect, it } from 'vitest'
import { SubscriptionAdminOut, SubscriptionAdminStatus } from './admin.types'
import { toFilterFields } from './subscription-edit'

const base: SubscriptionAdminOut = {
  id: '1',
  email: 'a@b.com',
  status: SubscriptionAdminStatus.active,
  countries: ['us', 'uk', 'eu'],
  affectedCountries: ['DE'],
  entities: ['peanut'],
  companies: ['Acme'],
  categories: ['allergen'],
  minSeverity: 'high',
  confirmedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  lastDigestAt: null,
}

describe('toFilterFields', () => {
  it('passes through valid values', () => {
    expect(toFilterFields(base)).toEqual({
      countries: ['us', 'uk', 'eu'],
      affectedCountries: ['DE'],
      entities: ['peanut'],
      companies: ['Acme'],
      categories: ['allergen'],
      minSeverity: 'high',
    })
  })

  it('drops unknown countries and categories', () => {
    const result = toFilterFields({
      ...base,
      countries: ['us', 'xx'],
      categories: ['allergen', 'nope'],
    })
    expect(result.countries).toEqual(['us'])
    expect(result.categories).toEqual(['allergen'])
  })

  it('falls back to "any severity" when the stored value is null or unrecognised', () => {
    expect(toFilterFields({ ...base, minSeverity: null }).minSeverity).toBe('')
    expect(toFilterFields({ ...base, minSeverity: 'bogus' }).minSeverity).toBe('')
  })

  it('drops affected-country codes with no matching tile', () => {
    const result = toFilterFields({ ...base, affectedCountries: ['DE', 'ZZ', 'russia'] })
    expect(result.affectedCountries).toEqual(['DE'])
  })

  it('defaults affectedCountries to [] for a row from before the column existed', () => {
    const legacy = { ...base } as SubscriptionAdminOut
    delete (legacy as { affectedCountries?: string[] }).affectedCountries
    expect(toFilterFields(legacy).affectedCountries).toEqual([])
  })
})
