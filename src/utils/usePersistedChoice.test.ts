import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePersistedChoice } from './usePersistedChoice'

const KEY = 'test-choice'
const isColour = (value: unknown): value is 'red' | 'blue' => value === 'red' || value === 'blue'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('usePersistedChoice', () => {
  it('starts at the fallback when nothing is saved', () => {
    const { result } = renderHook(() => usePersistedChoice(KEY, isColour, 'red'))
    expect(result.current[0]).toBe('red')
  })

  it('reads a saved valid value', () => {
    localStorage.setItem(KEY, 'blue')
    const { result } = renderHook(() => usePersistedChoice(KEY, isColour, 'red'))
    expect(result.current[0]).toBe('blue')
  })

  it('falls back when the saved value fails the guard', () => {
    localStorage.setItem(KEY, 'chartreuse')
    const { result } = renderHook(() => usePersistedChoice(KEY, isColour, 'red'))
    expect(result.current[0]).toBe('red')
  })

  it('persists a chosen value under the key', () => {
    const { result } = renderHook(() => usePersistedChoice(KEY, isColour, 'red'))
    act(() => result.current[1]('blue'))
    expect(result.current[0]).toBe('blue')
    expect(localStorage.getItem(KEY)).toBe('blue')
  })

  it('treats blocked storage as no saved value, and still updates in memory', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => usePersistedChoice(KEY, isColour, 'red'))
    expect(result.current[0]).toBe('red')
    act(() => result.current[1]('blue'))
    expect(result.current[0]).toBe('blue')
  })
})
