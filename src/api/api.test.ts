import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpError, apiUrl, fetchJson, postJson, postJsonFor } from './api'

const mockRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

const isShape = (raw: unknown): raw is { value: number } =>
  typeof raw === 'object' && raw !== null && typeof (raw as { value?: unknown }).value === 'number'

const stubFetch = (res: Response) => {
  const spy = vi.fn(async () => res)
  vi.stubGlobal('fetch', spy)
  return spy
}

afterEach(() => vi.unstubAllGlobals())

describe('fetchJson', () => {
  it('returns the validated body', async () => {
    stubFetch(mockRes({ value: 1 }))
    await expect(fetchJson('/x', undefined, isShape)).resolves.toEqual({ value: 1 })
  })

  it('surfaces a non-2xx as an HttpError carrying the status', async () => {
    stubFetch(mockRes('nope', 404))
    await expect(fetchJson('/x', undefined, isShape)).rejects.toMatchObject({
      name: 'HttpError',
      status: 404,
    })
  })

  it('rejects a body the guard turns down rather than casting it', async () => {
    stubFetch(mockRes({ value: 'one' }))
    await expect(fetchJson('/x', undefined, isShape)).rejects.toThrow('Unexpected response shape')
  })

  it('forwards the headers it is given, which is how a seat token travels', async () => {
    const spy = stubFetch(mockRes({ value: 1 }))
    await fetchJson('/x', undefined, isShape, { 'X-Seat-Token': 'tok' })
    expect(spy).toHaveBeenCalledWith(apiUrl('/x'), {
      signal: undefined,
      headers: { 'X-Seat-Token': 'tok' },
    })
  })
})

describe('postJson', () => {
  it('posts the body as JSON', async () => {
    const spy = stubFetch(mockRes(null))
    await postJson('/x', { a: 1 })
    expect(spy).toHaveBeenCalledWith(
      apiUrl('/x'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: 1 }),
      })
    )
  })

  it('surfaces a non-2xx as an HttpError', async () => {
    stubFetch(mockRes(null, 422))
    await expect(postJson('/x', {})).rejects.toBeInstanceOf(HttpError)
  })

  it('never reads the body, so an unparseable response still counts as success', async () => {
    stubFetch({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('no body')
      },
    } as unknown as Response)
    await expect(postJson('/x', {})).resolves.toBeUndefined()
  })
})

describe('postJsonFor', () => {
  it('returns the validated body', async () => {
    stubFetch(mockRes({ value: 2 }))
    await expect(postJsonFor('/x', {}, isShape)).resolves.toEqual({ value: 2 })
  })

  it('surfaces a non-2xx as an HttpError carrying the status', async () => {
    stubFetch(mockRes(null, 409))
    await expect(postJsonFor('/x', {}, isShape)).rejects.toMatchObject({ status: 409 })
  })

  it('rejects a body the guard turns down', async () => {
    stubFetch(mockRes({}))
    await expect(postJsonFor('/x', {}, isShape)).rejects.toThrow('Unexpected response shape')
  })
})

describe('HttpError', () => {
  it('reads as the message the resource hooks render', () => {
    expect(new HttpError(500).message).toBe('Request failed (500)')
  })
})
