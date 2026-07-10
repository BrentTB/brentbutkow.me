import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RecallDetail } from './RecallDetail'
import type { Recall } from './recall.types'

const recall: Recall = {
  country: 'us',
  source: 'fda',
  recallNumber: 'F-9',
  sourceUrl: 'https://example.com/F-9',
  status: 'Ongoing',
  classification: 'Class I',
  productDescription: 'Sliced deli turkey',
  reasonText: 'Listeria contamination',
  companyName: 'Acme Foods',
  state: 'CA',
  distributionPattern: 'Nationwide',
  recallInitiationDate: '2026-06-01',
  reportDate: '2026-06-10',
  category: 'pathogen',
  categoryConfidence: 0.9,
  severityScore: 88,
  severityLabel: 'severe',
  entities: [{ type: 'pathogen', value: 'Listeria' }],
  topicId: 3,
  eventClusterId: 5,
}

const topic = {
  id: 3,
  slug: 'listeria-deli',
  label: 'listeria · deli · meat',
  topTerms: ['listeria', 'deli', 'meat'],
  size: 9,
}
const event = {
  id: 5,
  slug: 'listeria-2026-06',
  label: 'Listeria · 7 recalls',
  isOutbreak: true,
  dominantEntity: 'Listeria',
  recallCount: 7,
  companyCount: 3,
  stateCount: 4,
  firstDate: null,
  lastDate: null,
  severityMax: 92,
}

const mockRes = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/projects/recall-radar/:source/:recallNumber" element={<RecallDetail />} />
      </Routes>
    </MemoryRouter>
  )

describe('RecallDetail page', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the recall and (empty) related recalls', async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const p = String(url)
      // The body resolves the recall's theme + outbreak from the per-country topics/events lists.
      if (p.includes('/topics')) return mockRes([topic])
      if (p.includes('/events')) return mockRes([event])
      if (p.includes('/similar')) return mockRes([]) // RelatedRecalls
      return mockRes(recall) // the recall itself
    })
    vi.stubGlobal('fetch', fetchMock)

    renderAt('/projects/recall-radar/fda/F-9')

    await waitFor(() => expect(screen.getByText('Sliced deli turkey')).toBeTruthy())
    // The breadcrumb keeps the full URL but only links back to the dashboard — the source and recall
    // number segments have no page of their own, so they stay plain text.
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'recall-radar' }).getAttribute('href')).toBe(
      '/projects/recall-radar'
    )
    expect(within(nav).queryByRole('link', { name: 'fda' })).toBeNull()
    expect(within(nav).queryByRole('link', { name: 'F-9' })).toBeNull()
    expect(within(nav).getByText('F-9')).toBeTruthy()
    expect(screen.getByText('Acme Foods')).toBeTruthy()
    expect(screen.getByText('Severe')).toBeTruthy() // severity band
    expect(screen.getByText('Listeria')).toBeTruthy() // entity chip

    // The theme + outbreak the recall belongs to resolve from the per-country lists and link back
    // to the dashboard with that filter applied (carrying the country, since both are per-country).
    const themeChip = await screen.findByText(/Theme · /)
    expect(themeChip.closest('a')?.getAttribute('href')).toBe(
      '/projects/recall-radar?location=us&topic=listeria-deli'
    )
    const outbreakChip = await screen.findByText(/Outbreak · /)
    expect(outbreakChip.closest('a')?.getAttribute('href')).toBe(
      '/projects/recall-radar?location=us&event=listeria-2026-06'
    )
  })

  it('shows the EU geography facts as country names for a RASFF recall', async () => {
    const euRecall: Recall = {
      ...recall,
      country: 'eu',
      source: 'rasff',
      recallNumber: '2026.1234',
      state: null,
      topicId: null,
      eventClusterId: null,
      notifyingCountry: 'IE',
      originCountries: ['ES'],
      distributionCountries: ['IE', 'DE'],
    }
    const fetchMock = vi.fn(async (url: string | URL) => {
      const p = String(url)
      if (p.includes('/topics')) return mockRes([])
      if (p.includes('/events')) return mockRes([])
      if (p.includes('/similar')) return mockRes([])
      return mockRes(euRecall)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderAt('/projects/recall-radar/rasff/2026.1234')

    await waitFor(() => expect(screen.getByText('Sliced deli turkey')).toBeTruthy())
    expect(screen.getByText('Notified by')).toBeTruthy()
    expect(screen.getByText('Ireland')).toBeTruthy()
    expect(screen.getByText('Origin')).toBeTruthy()
    expect(screen.getByText('Spain')).toBeTruthy()
    expect(screen.getByText('Distributed to')).toBeTruthy()
    expect(screen.getByText('Ireland, Germany')).toBeTruthy()
  })

  it('rejects a malformed source param without fetching', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/projects/recall-radar/epa/F-9') // epa is not a valid source
    expect(screen.getByText(/malformed/i)).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
