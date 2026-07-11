import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { StatusStrip } from './StatusStrip'

describe('StatusStrip', () => {
  afterEach(cleanup)

  it('always shows the live recall count', () => {
    render(<StatusStrip total={1234} />)
    expect(screen.getByText('LIVE')).toBeTruthy()
    expect(screen.getByText(/recalls tracked/)).toBeTruthy()
    expect(screen.getByText('1,234')).toBeTruthy()
  })

  it('omits optional segments when their data is absent', () => {
    render(<StatusStrip total={10} />)
    expect(screen.queryByText(/-led/)).toBeNull()
    expect(screen.queryByText(/most in/)).toBeNull()
  })

  it('renders each optional segment when its data is present', () => {
    render(
      <StatusStrip
        total={10}
        topCategoryLabel="Allergen"
        topCategoryPct={38}
        topRegion="CA"
        freshness={{ label: 'Synced today', stale: false }}
      />
    )
    expect(screen.getByText(/Allergen-led/)).toBeTruthy()
    expect(screen.getByText('38%')).toBeTruthy()
    expect(screen.getByText(/most in/)).toBeTruthy()
    expect(screen.getByText('CA')).toBeTruthy()
    expect(screen.getByText('Synced today')).toBeTruthy()
  })

  it('shows the freshness label on its own without the other segments', () => {
    render(<StatusStrip total={10} freshness={{ label: 'Last sync 4 days ago', stale: true }} />)
    expect(screen.getByText('Last sync 4 days ago')).toBeTruthy()
    expect(screen.queryByText(/most in/)).toBeNull()
  })
})
