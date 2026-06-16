import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ChartTooltip } from './ChartTooltip'

describe('ChartTooltip', () => {
  afterEach(cleanup)

  it('renders the text when a tip is set', () => {
    render(<ChartTooltip tip={{ text: 'Mar 2026 · Pathogen: 12', x: 10, y: 20 }} />)
    expect(screen.getByText('Mar 2026 · Pathogen: 12')).toBeTruthy()
  })

  it('renders nothing when there is no tip', () => {
    const { container } = render(<ChartTooltip tip={null} />)
    expect(container.firstChild).toBeNull()
  })
})
