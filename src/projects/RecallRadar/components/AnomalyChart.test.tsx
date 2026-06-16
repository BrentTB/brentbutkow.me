import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AnomalyChart } from './AnomalyChart'
import type { MonthCount } from '../recall.types'

const series: MonthCount[] = [
  { month: '2025-01', count: 5 },
  { month: '2025-02', count: 6 },
  { month: '2025-03', count: 40 },
]

describe('AnomalyChart', () => {
  afterEach(cleanup)

  it('draws a bar per month and labels the typical (median) level', () => {
    const { container } = render(
      <AnomalyChart
        series={series}
        months={[{ month: '2025-03', observed: 40, baseline: 6, z: 8.1 }]}
        label="Listeria"
      />
    )
    expect(container.querySelectorAll('rect')).toHaveLength(3)
    expect(screen.getByText(/Typical ~6\/month/i)).toBeTruthy() // median of [5, 6, 40]
  })

  it('renders all flagged months without error', () => {
    const { container } = render(
      <AnomalyChart
        series={series}
        months={[
          { month: '2025-02', observed: 6, baseline: 3, z: 3.1 },
          { month: '2025-03', observed: 40, baseline: 6, z: 8.1 },
        ]}
        label="x"
      />
    )
    expect(container.querySelectorAll('rect')).toHaveLength(3)
  })

  it('renders nothing for an empty series', () => {
    const { container } = render(<AnomalyChart series={[]} months={[]} label="x" />)
    expect(container.querySelector('svg')).toBeNull()
  })
})
