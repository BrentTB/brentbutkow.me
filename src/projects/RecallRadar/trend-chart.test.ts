import { describe, expect, it } from 'vitest'
import { toChartMonths } from './trend-chart'
import type { TrendResult } from './recall.types'

describe('toChartMonths', () => {
  it('pivots category buckets into 12 months, ordering causes by total recalls', () => {
    const result: TrendResult = {
      group: 'category',
      buckets: [
        { month: '2026-01', group: 'allergen', count: 2 },
        { month: '2026-01', group: 'pathogen', count: 8 },
        { month: '2026-03', group: 'allergen', count: 1 },
      ],
    }
    const { months, legend } = toChartMonths(result, 2026)

    expect(months).toHaveLength(12)
    // pathogen (8) outranks allergen (3), so it leads despite allergen coming first in the enum.
    expect(legend.map((s) => s.key)).toEqual(['pathogen', 'allergen'])
    const jan = months[0]
    expect(jan.month).toBe('2026-01')
    expect(jan.segments.find((s) => s.key === 'allergen')?.count).toBe(2)
    expect(jan.segments.find((s) => s.key === 'pathogen')?.count).toBe(8)
    expect(months[1].segments.every((s) => s.count === 0)).toBe(true) // a gap month → zeros
  })

  it('collapses totals to a single Recalls segment', () => {
    const result: TrendResult = {
      group: 'total',
      buckets: [{ month: '2026-02', group: 'total', count: 9 }],
    }
    const { months, legend } = toChartMonths(result, 2026)
    expect(legend).toHaveLength(1)
    expect(legend[0].label).toBe('Recalls')
    expect(months[1].segments[0].count).toBe(9)
  })

  it('groups by severity with band labels, ordered by volume', () => {
    const result: TrendResult = {
      group: 'severity',
      buckets: [
        { month: '2026-01', group: 'severe', count: 5 },
        { month: '2026-01', group: 'moderate', count: 2 },
      ],
    }
    const { legend } = toChartMonths(result, 2026)
    expect(legend.map((s) => s.key)).toEqual(['severe', 'moderate'])
    expect(legend.find((s) => s.key === 'severe')?.label).toBe('Severe')
  })

  it('groups by classification, keeping the coalesced Unclassified segment', () => {
    const result: TrendResult = {
      group: 'classification',
      buckets: [
        { month: '2026-01', group: 'Class I', count: 4 },
        { month: '2026-01', group: 'Unclassified', count: 1 },
      ],
    }
    const { legend, months } = toChartMonths(result, 2026)
    const keys = legend.map((s) => s.key)
    expect(keys).toContain('Class I')
    expect(keys).toContain('Unclassified') // not dropped despite not being a RecallClass value
    expect(months[0].segments.find((s) => s.key === 'Unclassified')?.count).toBe(1)
  })
})
