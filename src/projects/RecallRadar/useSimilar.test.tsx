import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSimilar } from './useSimilar'
import { RecallSource, type Recall } from './recall.types'

// A full Recall so isSimilarRecall → isRecall validates the payload.
const recall: Recall = {
  country: 'us',
  source: 'fda',
  recallNumber: 'F-2',
  sourceUrl: null,
  status: null,
  classification: null,
  productDescription: 'Test cookies',
  reasonText: 'undeclared peanuts',
  companyName: null,
  state: null,
  distributionPattern: null,
  recallInitiationDate: null,
  reportDate: null,
  category: 'allergen',
  categoryConfidence: 0.9,
  severityScore: 50,
  severityLabel: 'moderate',
  entities: [],
}

const mockRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

describe('useSimilar', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('requests the encoded similar path and returns neighbours', async () => {
    const similar = [{ similarity: 0.8, recall }]
    const fetchMock = vi.fn(async () => mockRes(similar))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSimilar(RecallSource.fda, 'F-1', 6))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual(similar)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/recalls/fda/F-1/similar?limit=6'),
      expect.anything()
    )
  })

  it('encodes a slash-bearing recall number and honours a custom limit', async () => {
    const fetchMock = vi.fn(async () => mockRes([{ similarity: 0.8, recall }]))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSimilar(RecallSource.fda, 'F-007/2026', 3))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/recalls/fda/F-007%2F2026/similar?limit=3'),
      expect.anything()
    )
  })

  it('rejects a malformed payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes([{ similarity: 'x' }]))
    )
    const { result } = renderHook(() => useSimilar(RecallSource.fda, 'F-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).not.toBeNull()
  })
})
