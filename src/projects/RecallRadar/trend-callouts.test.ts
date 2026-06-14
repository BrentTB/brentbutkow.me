import { describe, expect, it } from 'vitest'
import { deriveCallouts } from './trend-callouts'
import type { RecallStats } from './recall.types'

const baseStats: RecallStats = {
  total: 100,
  byCategory: [
    { category: 'allergen', count: 60 },
    { category: 'pathogen', count: 40 },
  ],
  byMonth: [
    { month: '2025-11', count: 10 },
    { month: '2025-12', count: 10 },
    { month: '2026-01', count: 10 },
    { month: '2026-02', count: 10 },
    { month: '2026-03', count: 20 },
    { month: '2026-04', count: 20 },
    { month: '2026-05', count: 20 },
    { month: '2026-06', count: 20 },
  ],
  byClassification: [],
  byState: [
    { label: 'CA', count: 25 },
    { label: 'TX', count: 10 },
  ],
  byCompany: [],
  bySource: [],
  lastIngestAt: null,
}

describe('deriveCallouts', () => {
  it('computes a 3-month volume trend, leading cause, and top-state share', () => {
    const callouts = deriveCallouts(baseStats)

    const volume = callouts.find((c) => c.id === 'volume')
    expect(volume?.value).toBe('+50%') // (60 - 40) / 40
    expect(volume?.direction).toBe('up')
    expect(volume?.detail).toBe('over the last 3 months vs the prior 3 months')

    const cause = callouts.find((c) => c.id === 'cause')
    expect(cause?.value).toBe('60%')
    expect(cause?.label).toBe('Undeclared allergen')

    const state = callouts.find((c) => c.id === 'state')
    expect(state?.value).toBe('25%')
    expect(state?.label).toBe('California') // mapped from the CA code
  })

  it('marks a falling volume trend as down', () => {
    const falling = {
      ...baseStats,
      byMonth: [
        { month: '2026-01', count: 30 },
        { month: '2026-02', count: 30 },
        { month: '2026-03', count: 30 },
        { month: '2026-04', count: 10 },
        { month: '2026-05', count: 10 },
        { month: '2026-06', count: 10 },
      ],
    }
    const volume = deriveCallouts(falling).find((c) => c.id === 'volume')
    expect(volume?.value).toBe('-67%')
    expect(volume?.direction).toBe('down')
  })

  it('omits the volume callout without enough history', () => {
    const sparse = { ...baseStats, byMonth: [{ month: '2026-06', count: 5 }] }
    expect(deriveCallouts(sparse).find((c) => c.id === 'volume')).toBeUndefined()
  })

  it('sorts byMonth before windowing so input order does not change the trend', () => {
    const shuffled = { ...baseStats, byMonth: [...baseStats.byMonth].reverse() }
    const volume = deriveCallouts(shuffled).find((c) => c.id === 'volume')
    expect(volume?.value).toBe('+50%')
    expect(volume?.direction).toBe('up')
  })
})
