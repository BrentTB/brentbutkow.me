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
  byState: [
    { label: 'CA', count: 18 },
    { label: 'TX', count: 9 },
  ],
  byCompany: [{ label: 'Globex Foods', count: 14 }],
  lastIngestAt: '2026-06-13T08:00:00.000Z',
}

const recalls = {
  items: [
    {
      recallNumber: 'F-1',
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
    },
  ],
  total: 1,
}

const mockRes = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

describe('RecallRadar page', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders the overview, breakdowns, and a recall row from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) =>
        String(url).includes('/recalls/stats') ? mockRes(stats) : mockRes(recalls)
      )
    )

    render(
      <MemoryRouter>
        <FunModeProvider>
          <RecallRadar />
        </FunModeProvider>
      </MemoryRouter>
    )

    expect(screen.getByText('Recall Radar')).toBeTruthy()
    // tech-stack overview renders immediately (not data-gated)
    expect(screen.getByText('FastAPI')).toBeTruthy()

    // data-driven sections after the fetch resolves
    await waitFor(() => expect(screen.getByText('Test cookies')).toBeTruthy())
    expect(screen.getByText('Acme Foods')).toBeTruthy()
    expect(screen.getByText('100%')).toBeTruthy() // per-recall classifier confidence
    expect(screen.getByText('Top states')).toBeTruthy()
    // appears in the breakdown row and the company filter option
    expect(screen.getAllByText('Globex Foods').length).toBeGreaterThan(0)
    expect(screen.getByText('42')).toBeTruthy()
  })
})
