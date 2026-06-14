import { describe, expect, it } from 'vitest'
import {
  deriveYears,
  formatDate,
  formatMonthLabel,
  formatNumber,
  ingestFreshness,
  monthsForYear,
} from './chart-format'

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

describe('deriveYears', () => {
  it('returns distinct years, newest first', () => {
    const byMonth = [
      { month: '2025-03', count: 1 },
      { month: '2026-01', count: 2 },
      { month: '2025-11', count: 3 },
    ]
    expect(deriveYears(byMonth)).toEqual([2026, 2025])
  })
})

describe('monthsForYear', () => {
  it('builds a full 12-month series, filling gaps with 0', () => {
    const series = monthsForYear(
      [
        { month: '2026-02', count: 5 },
        { month: '2026-12', count: 9 },
      ],
      2026
    )
    expect(series).toHaveLength(12)
    expect(series[0]).toEqual({ month: '2026-01', count: 0 })
    expect(series[1]).toEqual({ month: '2026-02', count: 5 })
    expect(series[11]).toEqual({ month: '2026-12', count: 9 })
  })
})

describe('ingestFreshness', () => {
  const now = new Date('2026-06-14T12:00:00Z')

  it('reports fresh data', () => {
    const result = ingestFreshness('2026-06-14T09:00:00Z', now)
    expect(result.stale).toBe(false)
    expect(result.label).toBe('Updated 3 hours ago')
  })

  it('flags stale data past the threshold', () => {
    const result = ingestFreshness('2026-06-10T12:00:00Z', now)
    expect(result.stale).toBe(true)
    expect(result.label).toBe('Data may be stale — last updated 4 days ago')
  })

  it('handles a missing ingest', () => {
    expect(ingestFreshness(null, now)).toEqual({ stale: true, label: 'No data ingested yet' })
  })
})
