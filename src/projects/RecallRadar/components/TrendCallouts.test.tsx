import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TrendCallouts } from './TrendCallouts'
import { TrendDirection, type TrendCallout } from '../trend-callouts'

const anomaly: TrendCallout = {
  id: 'a1',
  label: 'Listeria',
  value: '+3.4σ',
  detail: 'spiked in 2025-03',
  direction: TrendDirection.up,
  anomaly: true,
  chart: {
    series: [
      { month: '2025-01', count: 5 },
      { month: '2025-02', count: 6 },
      { month: '2025-03', count: 40 },
    ],
    months: [{ month: '2025-03', observed: 40, baseline: 6, z: 3.4 }],
  },
}

const plain: TrendCallout = { id: 'c1', label: 'Pathogen', value: '40%', detail: 'leading cause' }

describe('TrendCallouts', () => {
  afterEach(cleanup)

  it('reveals a chart when an anomaly card is clicked, and toggles it closed', () => {
    render(<TrendCallouts callouts={[anomaly, plain]} />)
    expect(screen.queryByText(/Typical ~6\/month/i)).toBeNull()

    const card = screen.getByRole('button', { name: /Listeria/ })
    fireEvent.click(card)
    expect(screen.getByText(/Typical ~6\/month/i)).toBeTruthy()

    fireEvent.click(card)
    expect(screen.queryByText(/Typical ~6\/month/i)).toBeNull()
  })

  it('does not make descriptive callouts clickable', () => {
    render(<TrendCallouts callouts={[plain]} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
