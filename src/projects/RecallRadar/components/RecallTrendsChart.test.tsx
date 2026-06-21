import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { RecallTrendsChart } from './RecallTrendsChart'
import type { ForecastPoint } from '../recall.types'
import type { ChartMonth, ChartSegment } from '../trend-chart'

const legend: ChartSegment[] = [{ key: 'total', label: 'Recalls', color: '#e9b872', count: 0 }]

// 12 single-segment ChartMonths for `year`, with `counts` keyed by 1-based month number.
function yearData(year: number, counts: Record<number, number>): ChartMonth[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`
    return { month, segments: [{ ...legend[0], count: counts[index + 1] ?? 0 }] }
  })
}

const forecast: ForecastPoint[] = [
  { month: '2026-06', predicted: 21, lower: 15, upper: 27 },
  { month: '2026-07', predicted: 20, lower: 12, upper: 28 },
  { month: '2026-08', predicted: 20, lower: 11, upper: 29 },
]

describe('RecallTrendsChart forecast overlay', () => {
  afterEach(cleanup) // no global auto-cleanup here; otherwise one render's note leaks into the next

  it('draws projected bars only for forecast months after the latest actual', () => {
    // 2026 with actuals through June → ghosts for Jul + Aug; June keeps its real (partial) bar.
    const { container } = render(
      <RecallTrendsChart
        data={yearData(2026, { 5: 20, 6: 22 })}
        year={2026}
        legend={legend}
        forecast={forecast}
      />
    )
    expect(container.querySelectorAll('[aria-label*="projected"]')).toHaveLength(2)
    expect(container.querySelector('[aria-label^="Jul 2026 · projected 20"]')).toBeTruthy()
    expect(screen.getByText(/Projected/i)).toBeTruthy()
  })

  it('shows no projection for a year that has no forecast months', () => {
    const { container } = render(
      <RecallTrendsChart
        data={yearData(2025, { 11: 8 })}
        year={2025}
        legend={legend}
        forecast={forecast}
      />
    )
    expect(container.querySelector('[aria-label*="projected"]')).toBeNull()
    expect(screen.queryByText(/Projected/i)).toBeNull()
  })

  it('renders no overlay when no forecast is provided', () => {
    const { container } = render(
      <RecallTrendsChart data={yearData(2026, { 5: 20, 6: 22 })} year={2026} legend={legend} />
    )
    expect(container.querySelector('[aria-label*="projected"]')).toBeNull()
    expect(screen.queryByText(/Projected/i)).toBeNull()
  })
})
