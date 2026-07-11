import { describe, expect, it } from 'vitest'
import { subscriptionDetailFields } from './subscription-detail'
import { SubscriptionAdminOut, SubscriptionAdminStatus } from './admin.types'

const base: SubscriptionAdminOut = {
  id: '1',
  email: 'a@b.com',
  status: SubscriptionAdminStatus.active,
  countries: ['us'],
  affectedCountries: [],
  entities: [],
  companies: [],
  categories: [],
  minSeverity: null,
  confirmedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  lastDigestAt: null,
}

const euField = (sub: SubscriptionAdminOut) =>
  subscriptionDetailFields(sub).find((f) => f.label === 'EU countries')

describe('subscriptionDetailFields — EU member-state narrowing', () => {
  it('omits the EU-countries row for a non-EU subscription', () => {
    expect(euField(base)).toBeUndefined()
  })

  it('shows the chosen member states as names for an EU subscription', () => {
    const field = euField({ ...base, countries: ['eu'], affectedCountries: ['DE', 'AT'] })
    expect(field?.value).toBe('Germany, Austria')
  })

  it('reads "All EU countries" when an EU subscription has no narrowing', () => {
    const field = euField({ ...base, countries: ['eu'], affectedCountries: [] })
    expect(field?.value).toBe('All EU countries')
  })

  it('tolerates a missing affectedCountries (a row from before the column existed)', () => {
    const legacy = { ...base, countries: ['eu'] } as SubscriptionAdminOut
    delete (legacy as { affectedCountries?: string[] }).affectedCountries
    expect(euField(legacy)?.value).toBe('All EU countries')
  })
})
