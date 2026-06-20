import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SeverityBar } from './SeverityBar'

describe('SeverityBar', () => {
  afterEach(cleanup)

  it('renders a legend entry per present band with its share, worst-first', () => {
    render(
      <SeverityBar
        data={[
          { label: 'low', count: 10 },
          { label: 'severe', count: 30 },
          { label: 'high', count: 10 },
        ]}
      />
    )
    expect(screen.getByText('Severity mix')).toBeTruthy()
    expect(screen.getByText('50 recalls')).toBeTruthy()
    expect(screen.getByText('Severe')).toBeTruthy()
    expect(screen.getByText('High')).toBeTruthy()
    expect(screen.getByText('Low')).toBeTruthy()
    // 30 of 50 = 60% severe
    expect(screen.getByText('60%')).toBeTruthy()
  })

  it('renders nothing when there are no recalls', () => {
    const { container } = render(<SeverityBar data={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
