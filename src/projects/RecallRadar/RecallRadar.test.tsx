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
    { month: '2026-05', count: 20 },
    { month: '2026-06', count: 22 },
  ],
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

  it('renders stats, chart, and a recall row from the API', async () => {
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
    await waitFor(() => expect(screen.getByText('Test cookies')).toBeTruthy())
    expect(screen.getByText('Acme Foods')).toBeTruthy()
    expect(screen.getByText('42')).toBeTruthy()
  })
})
