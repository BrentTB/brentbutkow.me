import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useApiResource } from './useApiResource'

const mockRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

const isShape = (raw: unknown): raw is { value: number } =>
  typeof raw === 'object' && raw !== null && 'value' in raw

describe('useApiResource', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('starts loading then resolves data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes({ value: 1 }))
    )
    const { result } = renderHook(() => useApiResource('/x', isShape))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ value: 1 })
    expect(result.current.error).toBeNull()
  })

  it('captures an error on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes('nope', 500))
    )
    const { result } = renderHook(() => useApiResource('/x', isShape))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toMatch(/500/)
    expect(result.current.data).toBeNull()
  })

  it('errors when the validator rejects the payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes({ wrong: true }))
    )
    const { result } = renderHook(() => useApiResource('/x', isShape))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).not.toBeNull()
  })
})
