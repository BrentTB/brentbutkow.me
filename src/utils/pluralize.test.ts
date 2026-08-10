import { describe, it, expect } from 'vitest'
import { pluralize } from './pluralize'

describe('pluralize', () => {
  it('uses the singular form for a count of one', () => {
    expect(pluralize(1, 'company', 'companies')).toBe('1 company')
  })

  it('uses the plural form for zero and counts above one', () => {
    expect(pluralize(0, 'state', 'states')).toBe('0 states')
    expect(pluralize(4, 'state', 'states')).toBe('4 states')
  })
})
