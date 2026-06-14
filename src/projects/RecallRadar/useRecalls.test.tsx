import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRecalls } from './useRecalls'
import { RecallCategory } from './recall.types'

const mockRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

describe('useRecalls', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('requests /recalls with filters applied and returns the result', async () => {
    const fetchMock = vi.fn(async () => mockRes({ items: [], total: 0 }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() =>
      useRecalls({ category: RecallCategory.allergen, limit: 10 })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual({ items: [], total: 0 })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('category=allergen'),
      expect.anything()
    )
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('limit=10'), expect.anything())
  })
})
