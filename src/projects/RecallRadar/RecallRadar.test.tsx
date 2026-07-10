import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { FunModeProvider } from '../../contexts/FunModeProvider'
import { RecallRadar } from './RecallRadar'
import { countryTabLabels } from './data'
import { emptyFacets } from './test-fixtures'

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
    { label: 'moderate', count: 3 },
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
  forecast: [
    { month: '2026-06', predicted: 21, lower: 15, upper: 27 },
    { month: '2026-07', predicted: 20, lower: 12, upper: 28 },
    { month: '2026-08', predicted: 20, lower: 11, upper: 29 },
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
      eventClusterId: 0,
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
  {
    id: 0,
    slug: 'listeria-deli-meat',
    label: 'listeria · deli · meat',
    topTerms: ['listeria', 'deli', 'meat'],
    size: 9,
  },
]

const events = [
  {
    id: 0,
    slug: 'listeria-2026-06',
    label: 'Listeria · 5 recalls',
    isOutbreak: true,
    dominantEntity: 'Listeria',
    recallCount: 5,
    companyCount: 3,
    stateCount: 4,
    firstDate: '2026-06-01',
    lastDate: '2026-06-10',
    severityMax: 95,
  },
]

const facets = {
  ...emptyFacets,
  category: [
    { label: 'allergen', count: 30 },
    { label: 'pathogen', count: 12 },
  ],
  classification: [
    { label: 'Class I', count: 25 },
    { label: 'Class II', count: 17 },
  ],
  severity: [
    { label: 'severe', count: 25 },
    { label: 'high', count: 12 },
  ],
  source: [
    { label: 'fda', count: 30 },
    { label: 'usda', count: 12 },
  ],
  state: [
    { label: 'CA', count: 18 },
    { label: 'TX', count: 9 },
  ],
  company: [{ label: 'Globex Foods', count: 14 }],
  entity: [
    { type: 'allergen', label: 'peanuts', count: 20 },
    { type: 'pathogen', label: 'Listeria', count: 8 },
  ],
  topicCounts: { '0': 9 }, // theme id 0 (the topics fixture) has matches → it stays visible
  eventCounts: { '0': 5 }, // outbreak id 0 (the events fixture) has matches → it stays visible
  affectedCountry: [
    { label: 'IE', count: 5 },
    { label: 'ES', count: 3 },
  ],
}

const mockRes = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

const stubApi = (over: { recalls?: unknown } = {}) => {
  const fetchMock = vi.fn(async (url: string | URL) => {
    const path = String(url)
    if (path.includes('/similar')) return mockRes([])
    if (path.includes('/recalls/trend')) return mockRes(trend)
    if (path.includes('/recalls/stats')) return mockRes(stats)
    if (path.includes('/recalls/topics')) return mockRes(topics)
    if (path.includes('/recalls/events')) return mockRes(events)
    if (path.includes('/recalls/facets')) return mockRes(facets)
    return mockRes(over.recalls ?? recalls)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Surfaces the router's current query string so tests can assert what the page writes to the URL.
function SearchProbe() {
  return <output data-testid="search">{useLocation().search}</output>
}

describe('RecallRadar page', () => {
  afterEach(() => {
    cleanup() // two tests now render the page; clear the DOM between them
    vi.unstubAllGlobals()
  })

  it('renders the overview, breakdowns, and a recall row from the API', async () => {
    const fetchMock = stubApi()

    render(
      <MemoryRouter>
        <FunModeProvider>
          <RecallRadar />
        </FunModeProvider>
      </MemoryRouter>
    )

    expect(screen.getByText('Recall Radar')).toBeTruthy()
    expect(screen.getByRole('button', { name: countryTabLabels.uk })).toBeTruthy() // location tabs (expanded)

    // Dashboard tab (the default view) — the data-driven analytics after the fetch resolves.
    await waitFor(() => expect(screen.getByText('US recalls by state')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'California: 18 recalls' })).toBeTruthy()
    expect(screen.getByText('Top states')).toBeTruthy()
    // appears in the breakdown row and the company filter option
    expect(screen.getAllByText('Globex Foods').length).toBeGreaterThan(0)
    expect(screen.getByText('By source')).toBeTruthy() // FDA / USDA breakdown
    expect(screen.getByText('42')).toBeTruthy()
    // entity leaderboard + a detected anomaly callout (headlined by the spike's count, not σ)
    expect(screen.getByText('Top allergens')).toBeTruthy()
    // severity surface: the distribution bar
    expect(screen.getByText('Severity mix')).toBeTruthy()
    expect(screen.getAllByText('Severe').length).toBeGreaterThan(0)
    expect(screen.getByText('Anomaly')).toBeTruthy()
    expect(screen.getByText(/~6\/mo typical/i)).toBeTruthy() // anomaly caption, plain-language
    // forward-looking forecast: the Outlook callout + the chart's projected overlay note
    expect(screen.getByText('Outlook')).toBeTruthy()
    expect(screen.getByText(/Projected/i)).toBeTruthy()
    // themes section + the per-card theme chip both render the topic label
    expect(screen.getAllByText('Themes').length).toBeGreaterThan(0) // nav rail + section heading
    expect(screen.getAllByText('listeria · deli · meat').length).toBeGreaterThan(0)
    // outbreaks section renders its card
    expect(screen.getAllByText('Outbreaks').length).toBeGreaterThan(0) // nav rail + section heading
    expect(screen.getByText('5 recalls')).toBeTruthy() // the outbreak card

    // Recalls tab — the recall feed, its drill-down detail, and the per-recall outbreak badge.
    fireEvent.click(screen.getByRole('tab', { name: /^Recalls/ }))
    await waitFor(() => expect(screen.getByText('Test cookies')).toBeTruthy())
    expect(screen.getByText('Acme Foods')).toBeTruthy()
    expect(screen.getByText('Nationwide')).toBeTruthy()
    expect(screen.getByText('100%')).toBeTruthy() // per-recall classifier confidence
    expect(screen.getByText('⚠ Outbreak')).toBeTruthy() // the per-recall badge

    // About tab — the tech-stack write-up + methodology, tucked behind its own tab.
    fireEvent.click(screen.getByRole('tab', { name: 'About' }))
    expect(screen.getByText('FastAPI')).toBeTruthy()
    expect(screen.getByText('How it works')).toBeTruthy()

    // similar recalls are lazy — nothing is fetched until a row is expanded
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/similar'),
      expect.anything()
    )
  })

  it('renders the EU country map and writes a clicked country to the URL', async () => {
    stubApi()

    render(
      <MemoryRouter initialEntries={['/?location=eu']}>
        <FunModeProvider>
          <RecallRadar />
        </FunModeProvider>
        <SearchProbe />
      </MemoryRouter>
    )

    // The EU scope swaps the US state map for the country cartogram.
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'EU food recalls by country' })).toBeTruthy()
    )
    expect(screen.queryByRole('group', { name: 'US food recalls by state' })).toBeNull()

    // Tiles label with display names + counts from the affectedCountry facet; a click filters.
    fireEvent.click(screen.getByRole('button', { name: 'Ireland: 5 recalls' }))
    expect(screen.getByTestId('search').textContent).toContain('affectedCountry=IE')
    // Clicking the active tile again clears the filter.
    fireEvent.click(screen.getByRole('button', { name: 'Ireland: 5 recalls' }))
    expect(screen.getByTestId('search').textContent).not.toContain('affectedCountry=')
  })

  it('persists expanded feed rows in the ?open= param and restores them from it', async () => {
    stubApi()
    const scrollSpy = vi.fn()
    Element.prototype.scrollIntoView = scrollSpy

    // Restore: a shared link with ?open= renders that row already expanded and jumps to it.
    const { container, unmount } = render(
      <MemoryRouter initialEntries={['/?view=recalls&open=F-1']}>
        <FunModeProvider>
          <RecallRadar />
        </FunModeProvider>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('Test cookies')).toBeTruthy())
    expect(container.querySelector('details')?.open).toBe(true)
    // The one-shot jump targets the restored row itself, like a #fragment.
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled())
    expect((scrollSpy.mock.contexts[0] as Element).id).toBe('recall-F-1')
    unmount()

    // Persist: toggling a row writes its recall number to the URL, and closing clears it.
    const { container: c2 } = render(
      <MemoryRouter initialEntries={['/?view=recalls']}>
        <FunModeProvider>
          <RecallRadar />
        </FunModeProvider>
        <SearchProbe />
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('Test cookies')).toBeTruthy())
    // jsdom flips `open` on summary click but never fires the toggle event — dispatch it directly.
    const details = c2.querySelector('details') as HTMLDetailsElement
    details.open = true
    fireEvent(details, new Event('toggle'))
    expect(screen.getByTestId('search').textContent).toContain('open=F-1')
    details.open = false
    fireEvent(details, new Event('toggle'))
    expect(screen.getByTestId('search').textContent).not.toContain('open=')
  })

  it('drops expanded rows from the URL when the country changes', async () => {
    stubApi()
    window.scrollTo = vi.fn()

    render(
      <MemoryRouter initialEntries={['/?view=recalls&open=F-1']}>
        <FunModeProvider>
          <RecallRadar />
        </FunModeProvider>
        <SearchProbe />
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('Test cookies')).toBeTruthy())
    expect(screen.getByTestId('search').textContent).toContain('open=F-1')

    // Switching country is a fresh scope — those recall numbers belong to the old feed, so the ?open=
    // param must clear rather than trying to reopen rows that don't exist here.
    fireEvent.click(screen.getByRole('button', { name: countryTabLabels.uk }))
    expect(screen.getByTestId('search').textContent).not.toContain('open=')
  })

  it('scrolls back to the recalls section when paging', async () => {
    const scrollSpy = vi.fn()
    // jsdom doesn't implement scrollIntoView; install a spy so the pager's call is observable.
    Element.prototype.scrollIntoView = scrollSpy
    stubApi({ recalls: { items: recalls.items, total: 50 } }) // > PAGE_SIZE → a pager renders

    render(
      <MemoryRouter>
        <FunModeProvider>
          <RecallRadar />
        </FunModeProvider>
      </MemoryRouter>
    )

    // The recall feed + its pager live on the Recalls tab now, so open it first.
    fireEvent.click(screen.getByRole('tab', { name: /^Recalls/ }))
    await waitFor(() => expect(screen.getByText('Test cookies')).toBeTruthy())
    scrollSpy.mockClear() // ignore any scroll from the tab switch; assert only the pager's
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(scrollSpy).toHaveBeenCalled()
  })
})
