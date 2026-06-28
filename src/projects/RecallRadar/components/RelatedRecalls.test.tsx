import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render as rtlRender, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { RelatedRecalls } from './RelatedRecalls'
import { RecallSource, type Recall } from '../recall.types'

// Each related recall is now a <Link> to its detail page, so renders need a Router context.
const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>)

const neighbour: Recall = {
  country: 'us',
  source: 'fda',
  recallNumber: 'F-9',
  sourceUrl: 'https://example.com/F-9',
  status: null,
  classification: null,
  productDescription: 'Sliced deli turkey',
  reasonText: 'Listeria contamination',
  companyName: null,
  state: null,
  distributionPattern: null,
  recallInitiationDate: null,
  reportDate: null,
  category: 'pathogen',
  categoryConfidence: 0.9,
  severityScore: 80,
  severityLabel: 'severe',
  entities: [],
}

const mockRes = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

describe('RelatedRecalls', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders similar recalls with a similarity percentage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes([{ similarity: 0.82, recall: neighbour }]))
    )
    render(<RelatedRecalls source={RecallSource.fda} recallNumber="F-1" />)
    await waitFor(() => expect(screen.getByText('Sliced deli turkey')).toBeTruthy())
    expect(screen.getByText('82%')).toBeTruthy()
  })

  it('surfaces each neighbour’s identifying fields (recall number, company, severity, date)', async () => {
    const full: Recall = {
      ...neighbour,
      recallNumber: 'F-42',
      companyName: 'Globex Foods',
      classification: 'Class I',
      reportDate: '2026-06-10',
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes([{ similarity: 0.7, recall: full }]))
    )
    render(<RelatedRecalls source={RecallSource.fda} recallNumber="F-1" />)
    await waitFor(() => expect(screen.getByText('F-42')).toBeTruthy())
    expect(screen.getByText('Globex Foods')).toBeTruthy()
    expect(screen.getByText('Severe')).toBeTruthy() // severityLabel 'severe' → label
    expect(screen.getByText('Class I')).toBeTruthy()
    expect(screen.getByText(/Jun 10, 2026/)).toBeTruthy()
    // The product links to the neighbour's own detail page — the recursive-exploration entry point.
    expect(screen.getByText('Sliced deli turkey').closest('a')?.getAttribute('href')).toBe(
      '/projects/recall-radar/fda/F-42'
    )
  })

  it('shows an empty state when there are no neighbours', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes([]))
    )
    render(<RelatedRecalls source={RecallSource.fda} recallNumber="F-1" />)
    await waitFor(() => expect(screen.getByText('No similar recalls found.')).toBeTruthy())
  })
})
