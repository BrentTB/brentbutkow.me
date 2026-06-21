import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
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
        <Route path="/recall-radar/:source/:recallNumber" element={<RecallDetail />} />
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

    renderAt('/recall-radar/fda/F-9')

    await waitFor(() => expect(screen.getByText('Sliced deli turkey')).toBeTruthy())
    expect(screen.getByText('F-9')).toBeTruthy() // recall-number fact
    expect(screen.getByText('Acme Foods')).toBeTruthy()
    expect(screen.getByText('Severe')).toBeTruthy() // severity band
    expect(screen.getByText('Listeria')).toBeTruthy() // entity chip

    // The theme + outbreak the recall belongs to resolve from the per-country lists and link back
    // to the dashboard with that filter applied (carrying the country, since both are per-country).
    const themeChip = await screen.findByText(/Theme · /)
    expect(themeChip.closest('a')?.getAttribute('href')).toBe(
      '/recall-radar?location=us&topic=listeria-deli'
    )
    const outbreakChip = await screen.findByText(/Outbreak · /)
    expect(outbreakChip.closest('a')?.getAttribute('href')).toBe(
      '/recall-radar?location=us&event=listeria-2026-06'
    )
  })

  it('rejects a malformed source param without fetching', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/recall-radar/epa/F-9') // epa is not a valid source
    expect(screen.getByText(/malformed/i)).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
