import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RecallFeed } from './RecallFeed'
import type { Recall } from '../recall.types'

const mockRes = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

const recall: Recall = {
  country: 'us',
  source: 'usda',
  recallNumber: 'F-1234',
  sourceUrl: 'https://www.fsis.usda.gov/recalls/test',
  status: 'Ongoing',
  classification: 'Class I',
  productDescription: 'Test cookies',
  reasonText: 'Undeclared peanut',
  companyName: 'Acme Foods',
  state: 'CA',
  distributionPattern: 'Nationwide',
  recallInitiationDate: '2026-06-01',
  reportDate: '2026-06-10',
  category: 'allergen',
  categoryConfidence: 0.92,
  severityScore: 91,
  severityLabel: 'severe',
  entities: [{ type: 'allergen', value: 'peanuts' }],
}

describe('RecallFeed', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows the product summary and a drill-down with the recall metadata', () => {
    render(<RecallFeed recalls={[recall]} />)
    expect(screen.getByText('Test cookies')).toBeTruthy()
    expect(screen.getByText('92%')).toBeTruthy()
    expect(screen.getByText('Severe')).toBeTruthy() // color-graded severity badge
    // fields revealed in the expandable detail panel
    expect(screen.getByText('F-1234')).toBeTruthy()
    expect(screen.getByText('Nationwide')).toBeTruthy()
    expect(screen.getByText('USDA FSIS')).toBeTruthy() // source badge
    expect(screen.getByText('View original notice ↗')).toBeTruthy() // source_url link
    expect(screen.getByText('peanuts')).toBeTruthy() // extracted entity chip
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

  it('shows a theme chip that filters without toggling the row open', () => {
    const onTopicSelect = vi.fn()
    const { container } = render(
      <RecallFeed
        recalls={[{ ...recall, topicId: 2 }]}
        topicLabels={new Map([[2, 'listeria · deli · meat']])}
        onTopicSelect={onTopicSelect}
      />
    )
    const details = container.querySelector('details')
    fireEvent.click(screen.getByRole('button', { name: 'listeria · deli · meat' }))
    expect(onTopicSelect).toHaveBeenCalledWith(2)
    expect(details?.open).toBe(false) // the chip click must not expand the row
  })

  it('fetches and renders related recalls only once a row is expanded', async () => {
    const fetchMock = vi.fn(async () =>
      mockRes([
        {
          similarity: 0.7,
          recall: { ...recall, recallNumber: 'F-2', productDescription: 'Similar cookies' },
        },
      ])
    )
    vi.stubGlobal('fetch', fetchMock)
    const { container } = render(<RecallFeed recalls={[recall]} />)

    expect(fetchMock).not.toHaveBeenCalled() // nothing fetched before expanding

    const details = container.querySelector('details') as HTMLDetailsElement
    details.open = true
    fireEvent(details, new Event('toggle'))

    await waitFor(() => expect(screen.getByText('Similar cookies')).toBeTruthy())
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/recalls/usda/F-1234/similar'),
      expect.anything()
    )
  })
})
