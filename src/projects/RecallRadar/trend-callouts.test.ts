import { describe, expect, it } from 'vitest'
import { anomalyCallouts, deriveCallouts, forecastCallout } from './trend-callouts'
import type { Anomaly, ForecastPoint, RecallStats } from './recall.types'

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
  bySeverity: [],
  byState: [
    { label: 'CA', count: 25 },
    { label: 'TX', count: 10 },
  ],
  byCompany: [],
  bySource: [],
  byEntity: [],
  anomalies: [],
  forecast: [],
  lastIngestAt: null,
}

describe('deriveCallouts', () => {
  it('computes a 3-month volume trend, leading cause, and top-state share', () => {
    const callouts = deriveCallouts(baseStats)

    const volume = callouts.find((c) => c.id === 'volume')
    expect(volume?.value).toBe('+50%') // (60 - 40) / 40
    expect(volume?.direction).toBe('up')
    expect(volume?.caption).toBe('over the last 3 months vs the prior 3 months')

    const cause = callouts.find((c) => c.id === 'cause')
    expect(cause?.value).toBe('60%')
    expect(cause?.title).toBe('Undeclared allergen')

    const state = callouts.find((c) => c.id === 'state')
    expect(state?.value).toBe('25%')
    expect(state?.title).toBe('California') // mapped from the CA code
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

describe('anomalyCallouts', () => {
  it('maps backend anomalies to flagged callouts with sign + direction', () => {
    const series = [
      { month: '2026-01', count: 8 },
      { month: '2026-02', count: 9 },
      { month: '2026-03', count: 40 },
    ]
    const anomalies: Anomaly[] = [
      {
        scope: 'entity',
        label: 'Listeria',
        months: [{ month: '2026-03', observed: 40, baseline: 8, z: 3.4 }],
        series,
      },
      {
        scope: 'category',
        label: 'allergen',
        months: [{ month: '2026-02', observed: 5, baseline: 20, z: -3.1 }],
        series,
      },
      {
        scope: 'overall',
        label: 'All recalls',
        months: [{ month: '2026-01', observed: 60, baseline: 30, z: 3 }],
        series,
      },
    ]
    const callouts = anomalyCallouts(anomalies)
    expect(callouts).toHaveLength(3)

    expect(callouts[0].anomaly).toBe(true)
    expect(callouts[0].value).toBe('40') // peak observed count, no σ jargon
    expect(callouts[0].direction).toBe('up')
    expect(callouts[0].title).toBe('Listeria')
    expect(callouts[0].caption).toContain('Mar 2026')
    expect(callouts[0].caption).toContain('above ~8/mo typical')
    // the chart payload rides along on the callout
    expect(callouts[0].chart?.months).toHaveLength(1)
    expect(callouts[0].chart?.series).toHaveLength(3)

    expect(callouts[1].value).toBe('5')
    expect(callouts[1].direction).toBe('down') // 5 vs a typical ~20
    expect(callouts[1].title).toBe('Undeclared allergen') // category value → label
    expect(callouts[1].caption).toContain('below ~20/mo typical') // a dip reads distinctly from a spike

    expect(callouts[2].title).toBe('All recalls')
  })

  it('consolidates several flagged months into one callout, headlined by the strongest', () => {
    const series = [
      { month: '2025-03', count: 10 },
      { month: '2026-05', count: 16 },
    ]
    const anomalies: Anomaly[] = [
      {
        scope: 'entity',
        label: 'Clostridium botulinum',
        months: [
          { month: '2025-03', observed: 10, baseline: 2, z: 26.8 },
          { month: '2026-05', observed: 16, baseline: 6, z: 20.9 },
        ],
        series,
      },
    ]
    const [callout] = anomalyCallouts(anomalies)
    expect(callout.value).toBe('16') // biggest flagged month's count
    expect(callout.caption).toContain('2 unusual months')
    expect(callout.caption).toContain('latest May 2026')
    expect(callout.caption).toContain('above ~6/mo typical') // baseline kept on multi-month too
    expect(callout.chart?.months).toHaveLength(2)
  })

  it('returns nothing for no anomalies', () => {
    expect(anomalyCallouts([])).toEqual([])
  })
})

describe('forecastCallout', () => {
  // baseStats recent complete months (drop in-progress 2026-06) average ~16.7/mo.
  const upForecast: ForecastPoint[] = [
    { month: '2026-06', predicted: 24, lower: 18, upper: 30 },
    { month: '2026-07', predicted: 26, lower: 20, upper: 32 },
    { month: '2026-08', predicted: 25, lower: 19, upper: 31 },
  ]

  it('headlines the projected monthly average with a ±band', () => {
    const callout = forecastCallout(upForecast, baseStats.byMonth)
    expect(callout?.eyebrow).toBe('Outlook')
    expect(callout?.value).toBe('~25/mo') // mean of 24, 26, 25
    expect(callout?.caption).toContain('next 3 months')
    expect(callout?.caption).toContain('±6') // mean half-width of the bands
  })

  it('reads direction from the projection vs recent complete months', () => {
    // Recent complete months (Mar–May) average 20; a ~25 projection is up.
    expect(forecastCallout(upForecast, baseStats.byMonth)?.direction).toBe('up')
    const downForecast: ForecastPoint[] = upForecast.map((p) => ({ ...p, predicted: 8 }))
    const down = forecastCallout(downForecast, baseStats.byMonth)
    expect(down?.direction).toBe('down')
    expect(down?.caption).toContain('trending down')
  })

  it('returns null when there is no forecast', () => {
    expect(forecastCallout([], baseStats.byMonth)).toBeNull()
  })
})
