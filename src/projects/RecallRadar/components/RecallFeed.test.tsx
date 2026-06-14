import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RecallFeed } from './RecallFeed'
import type { Recall } from '../recall.types'

const recall: Recall = {
  source: 'usda',
  recallNumber: 'F-1234',
  sourceUrl: 'https://www.fsis.usda.gov/recalls/test',
  status: 'Ongoing',
  classification: 'Class I',
  productDescription: 'Test cookies',
  reasonText: 'Undeclared peanut',
  companyName: 'Acme Foods',
  state: 'CA',
  states: ['CA'],
  distributionPattern: 'Nationwide',
  recallInitiationDate: '2026-06-01',
  reportDate: '2026-06-10',
  category: 'allergen',
  categoryConfidence: 0.92,
}

describe('RecallFeed', () => {
  afterEach(cleanup)

  it('shows the product summary and a drill-down with the recall metadata', () => {
    render(<RecallFeed recalls={[recall]} />)
    expect(screen.getByText('Test cookies')).toBeTruthy()
    expect(screen.getByText('92%')).toBeTruthy()
    // fields revealed in the expandable detail panel
    expect(screen.getByText('F-1234')).toBeTruthy()
    expect(screen.getByText('Nationwide')).toBeTruthy()
    expect(screen.getByText('USDA FSIS')).toBeTruthy() // source badge
    expect(screen.getByText('View original notice ↗')).toBeTruthy() // source_url link
  })

  it('toggles the detail panel open when the summary is clicked', () => {
    const { container } = render(<RecallFeed recalls={[recall]} />)
    const details = container.querySelector('details')
    const summary = container.querySelector('summary')
    expect(details?.open).toBe(false)
    fireEvent.click(summary as Element)
    expect(details?.open).toBe(true)
  })

  it('renders an empty state when there are no recalls', () => {
    render(<RecallFeed recalls={[]} />)
    expect(screen.getByText('No recalls match these filters.')).toBeTruthy()
  })
})
