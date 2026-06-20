import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { RelatedRecalls } from './RelatedRecalls'
import { RecallSource, type Recall } from '../recall.types'

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

  it('shows an empty state when there are no neighbours', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes([]))
    )
    render(<RelatedRecalls source={RecallSource.fda} recallNumber="F-1" />)
    await waitFor(() => expect(screen.getByText('No similar recalls found.')).toBeTruthy())
  })
})
