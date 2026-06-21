import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { RecallFeed } from './RecallFeed'
import type { Recall } from '../recall.types'

// RecallFeed renders <Link>s (the per-row "Open recall page" + related recalls), so each render
// needs a Router context. Wrap testing-library's render once rather than at every call site.
const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>)

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

  it('mounts related recalls on open and unmounts them on close across a rapid toggle', async () => {
    // Exercises the onToggle add/remove path the rapid-toggle fix lives in: opening adds the row to
    // openRows (mounting RelatedRecalls), closing removes it (unmounting). The crash the fix guards
    // (currentTarget null in the deferred updater) only reproduces in a real browser, not jsdom.
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
    const details = container.querySelector('details') as HTMLDetailsElement

    details.open = true
    fireEvent(details, new Event('toggle'))
    await waitFor(() => expect(screen.getByText('Similar cookies')).toBeTruthy())

    details.open = false
    fireEvent(details, new Event('toggle'))
    expect(screen.queryByText('Similar cookies')).toBeNull() // closing unmounts related recalls
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
        topicsById={
          new Map([
            [
              2,
              {
                id: 2,
                slug: 'listeria-deli-meat',
                label: 'listeria · deli · meat',
                topTerms: ['listeria', 'deli', 'meat'],
                size: 9,
              },
            ],
          ])
        }
        onTopicSelect={onTopicSelect}
      />
    )
    const details = container.querySelector('details')
    fireEvent.click(screen.getByRole('button', { name: 'listeria · deli · meat' }))
    expect(onTopicSelect).toHaveBeenCalledWith('listeria-deli-meat')
    expect(details?.open).toBe(false) // the chip click must not expand the row
  })

  const outbreak = (over = {}) => ({
    id: 5,
    slug: 'listeria-2026-03',
    label: 'Listeria · 7 recalls',
    isOutbreak: true,
    dominantEntity: 'Listeria',
    recallCount: 7,
    companyCount: 3,
    stateCount: 4,
    firstDate: null,
    lastDate: null,
    severityMax: 92,
    ...over,
  })

  it('shows an outbreak badge that filters without toggling the row open', () => {
    const onEventSelect = vi.fn()
    const { container } = render(
      <RecallFeed
        recalls={[{ ...recall, eventClusterId: 5 }]}
        eventsById={new Map([[5, outbreak()]])}
        onEventSelect={onEventSelect}
      />
    )
    const details = container.querySelector('details')
    fireEvent.click(screen.getByRole('button', { name: /Outbreak/i }))
    expect(onEventSelect).toHaveBeenCalledWith('listeria-2026-03')
    expect(details?.open).toBe(false) // the badge click must not expand the row
  })

  it('shows no badge for a recall in a non-outbreak cluster', () => {
    render(
      <RecallFeed
        recalls={[{ ...recall, eventClusterId: 5 }]}
        eventsById={new Map([[5, outbreak({ isOutbreak: false })]])}
        onEventSelect={vi.fn()}
      />
    )
    expect(screen.queryByText('⚠ Outbreak')).toBeNull()
  })

  it('clears the theme filter when its already-active chip is re-clicked', () => {
    const onTopicSelect = vi.fn()
    render(
      <RecallFeed
        recalls={[{ ...recall, topicId: 2 }]}
        topicsById={
          new Map([
            [
              2,
              {
                id: 2,
                slug: 'listeria-deli-meat',
                label: 'listeria · deli · meat',
                topTerms: ['listeria', 'deli', 'meat'],
                size: 9,
              },
            ],
          ])
        }
        onTopicSelect={onTopicSelect}
        activeTopic="listeria-deli-meat"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'listeria · deli · meat' }))
    expect(onTopicSelect).toHaveBeenCalledWith('') // toggles off, not re-set
  })

  it('clears the outbreak filter when its already-active badge is re-clicked', () => {
    const onEventSelect = vi.fn()
    render(
      <RecallFeed
        recalls={[{ ...recall, eventClusterId: 5 }]}
        eventsById={new Map([[5, outbreak()]])}
        onEventSelect={onEventSelect}
        activeEvent="listeria-2026-03"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /Outbreak/i }))
    expect(onEventSelect).toHaveBeenCalledWith('')
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
