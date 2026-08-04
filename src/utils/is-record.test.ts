import { describe, expect, it } from 'vitest'
import { isRecord } from './is-record'

describe('isRecord', () => {
  it('accepts a plain object', () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ a: 1 })).toBe(true)
  })

  it('rejects null, which typeof calls an object', () => {
    expect(isRecord(null)).toBe(false)
  })

  it('rejects primitives and undefined', () => {
    expect(isRecord(undefined)).toBe(false)
    expect(isRecord(1)).toBe(false)
    expect(isRecord('x')).toBe(false)
    expect(isRecord(true)).toBe(false)
  })

  it('accepts an array, which callers narrow further themselves', () => {
    expect(isRecord([])).toBe(true)
  })

  it('lets a narrowed value be read without a cast', () => {
    const raw: unknown = { name: 'Ada' }
    expect(isRecord(raw) && raw.name === 'Ada').toBe(true)
  })
})
