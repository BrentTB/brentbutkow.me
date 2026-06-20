import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FunModeProvider } from '../../contexts/FunModeProvider'
import { RecallRadar } from './RecallRadar'

const stats = {
  total: 42,
  byCategory: [
    { category: 'allergen', count: 30 },
    { category: 'pathogen', count: 12 },
  ],
  byMonth: [
    { month: '2025-11', count: 8 },
    { month: '2026-05', count: 20 },
    { month: '2026-06', count: 22 },
  ],
  byClassification: [
    { label: 'Class I', count: 25 },
    { label: 'Class II', count: 17 },
  ],
  bySeverity: [
    { label: 'severe', count: 25 },
    { label: 'high', count: 12 },
    { label: 'elevated', count: 3 },
    { label: 'low', count: 2 },
  ],
  byState: [
    { label: 'CA', count: 18 },
    { label: 'TX', count: 9 },
  ],
  byCompany: [{ label: 'Globex Foods', count: 14 }],
  bySource: [
    { label: 'fda', count: 30 },
    { label: 'usda', count: 12 },
  ],
  byEntity: [
    { type: 'allergen', label: 'peanuts', count: 20 },
    { type: 'pathogen', label: 'Listeria', count: 8 },
  ],
  anomalies: [
    {
      scope: 'entity',
      label: 'Listeria',
      months: [{ month: '2026-06', observed: 22, baseline: 6, z: 3.5 }],
      series: [
        { month: '2026-04', count: 6 },
        { month: '2026-05', count: 7 },
        { month: '2026-06', count: 22 },
      ],
    },
  ],
  lastIngestAt: '2026-06-13T08:00:00.000Z',
}

const recalls = {
  items: [
    {
      country: 'us',
      source: 'fda',
      recallNumber: 'F-1',
      sourceUrl: null,
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
      categoryConfidence: 1,
      severityScore: 91,
      severityLabel: 'severe',
      topicId: 0,
      entities: [{ type: 'allergen', value: 'peanuts' }],
    },
  ],
  total: 1,
}

const trend = {
  group: 'total',
  buckets: [
    { month: '2026-05', group: 'total', count: 20 },
    { month: '2026-06', group: 'total', count: 22 },
  ],
}

const topics = [
  { id: 0, label: 'listeria · deli · meat', topTerms: ['listeria', 'deli', 'meat'], size: 9 },
]

const mockRes = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

describe('RecallRadar page', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders the overview, breakdowns, and a recall row from the API', async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const path = String(url)
      if (path.includes('/recalls/trend')) return mockRes(trend)
      if (path.includes('/recalls/stats')) return mockRes(stats)
      if (path.includes('/recalls/topics')) return mockRes(topics)
      return mockRes(recalls)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter>
        <FunModeProvider>
          <RecallRadar />
        </FunModeProvider>
      </MemoryRouter>
    )

    expect(screen.getByText('Recall Radar')).toBeTruthy()
    // tech-stack overview + methodology render immediately (not data-gated)
    expect(screen.getByText('FastAPI')).toBeTruthy()
    expect(screen.getByText('How it works')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'United Kingdom' })).toBeTruthy() // country selector

    // data-driven sections after the fetch resolves
    await waitFor(() => expect(screen.getByText('Test cookies')).toBeTruthy())
    expect(screen.getByText('Acme Foods')).toBeTruthy()
    expect(screen.getByText('US recalls by state')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'California: 18 recalls' })).toBeTruthy()
    // trend callouts + per-recall drill-down detail
    expect(screen.getByText('Leading cause')).toBeTruthy()
    expect(screen.getByText('Nationwide')).toBeTruthy()
    expect(screen.getByText('100%')).toBeTruthy() // per-recall classifier confidence
    expect(screen.getByText('Top states')).toBeTruthy()
    // appears in the breakdown row and the company filter option
    expect(screen.getAllByText('Globex Foods').length).toBeGreaterThan(0)
    expect(screen.getByText('By source')).toBeTruthy() // FDA / USDA breakdown
    expect(screen.getByText('42')).toBeTruthy()
    // entity leaderboard + a detected anomaly callout (headlined by the spike's count, not σ)
    expect(screen.getByText('Top allergens')).toBeTruthy()
    // severity surface: the distribution bar + a color-graded per-recall badge
    expect(screen.getByText('Severity mix')).toBeTruthy()
    expect(screen.getAllByText('Severe').length).toBeGreaterThan(0)
    expect(screen.getByText('Anomaly')).toBeTruthy()
    expect(screen.getByText(/~6\/mo typical/i)).toBeTruthy() // anomaly caption, plain-language
    // themes section + the per-card theme chip both render the topic label
    expect(screen.getByText('Themes')).toBeTruthy()
    expect(screen.getAllByText('listeria · deli · meat').length).toBeGreaterThan(0)
    // similar recalls are lazy — nothing is fetched until a row is expanded
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/similar'),
      expect.anything()
    )
  })
})
