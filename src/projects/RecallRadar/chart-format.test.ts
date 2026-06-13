import { describe, expect, it } from 'vitest'
import { formatDate, formatMonthLabel, formatNumber } from './chart-format'

describe('chart-format', () => {
  it('formats a YYYY-MM month label', () => {
    expect(formatMonthLabel('2026-03')).toBe('Mar 2026')
  })

  it('formats numbers with grouping separators', () => {
    expect(formatNumber(28966)).toBe('28,966')
  })

  it('formats an ISO date and falls back for null', () => {
    expect(formatDate('2026-03-01')).toBe('Mar 1, 2026')
    expect(formatDate(null)).toBe('—')
  })
})
