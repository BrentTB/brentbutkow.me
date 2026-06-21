import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRecallDetail } from './useRecallDetail'
import { RecallSource, type Recall } from './recall.types'

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

describe('useRecallDetail', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('requests the encoded recall path and returns the recall', async () => {
    const fetchMock = vi.fn(async () => mockRes(recall))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useRecallDetail(RecallSource.fda, 'F-007/2026'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data?.recallNumber).toBe('F-2')
    // Segments are encoded — FDA recall numbers can carry slashes.
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/recalls/fda/F-007%2F2026'),
      expect.anything()
    )
  })

  it('rejects a malformed payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes({ recallNumber: 123 }))
    )
    const { result } = renderHook(() => useRecallDetail(RecallSource.fda, 'F-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).not.toBeNull()
  })
})
