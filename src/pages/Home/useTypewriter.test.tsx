import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTypewriter } from './useTypewriter'

function stubMatchMedia(reduceMotion: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: reduceMotion } as MediaQueryList))
}

// Fast timings so the cycle arithmetic in tests stays readable.
const fast = { typeMs: 10, deleteMs: 5, holdPrimaryMs: 100, holdAltMs: 50 }

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reveals the text one character per tick', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useTypewriter('~/ab', fast))
    expect(result.current).toBe('')
    act(() => vi.advanceTimersByTime(10))
    expect(result.current).toBe('~')
    act(() => vi.advanceTimersByTime(30))
    expect(result.current).toBe('~/ab')
  })

  it('stays on the full text when there are no alternates', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useTypewriter('~/ab', fast))
    act(() => vi.advanceTimersByTime(10_000))
    expect(result.current).toBe('~/ab')
  })

  it('backspaces to the prompt root and types the alternate after the primary hold', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useTypewriter('~/ab', { ...fast, alternates: ['~/cd'] }))
    act(() => vi.advanceTimersByTime(40)) // primary fully typed
    expect(result.current).toBe('~/ab')
    act(() => vi.advanceTimersByTime(99)) // still inside the primary hold
    expect(result.current).toBe('~/ab')
    act(() => vi.advanceTimersByTime(31)) // backspaced to ~/ then typed the alternate
    expect(result.current).toBe('~/cd')
  })

  it('returns to the primary after the alternate hold', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useTypewriter('~/ab', { ...fast, alternates: ['~/cd'] }))
    act(() => vi.advanceTimersByTime(250))
    expect(result.current).toBe('~/ab')
  })

  it('cycles through alternates in order, primary between each', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() =>
      useTypewriter('~/ab', { ...fast, alternates: ['~/cd', '~/ef'] })
    )
    act(() => vi.advanceTimersByTime(170))
    expect(result.current).toBe('~/cd')
    act(() => vi.advanceTimersByTime(80)) // back on primary
    expect(result.current).toBe('~/ab')
    act(() => vi.advanceTimersByTime(130)) // second alternate
    expect(result.current).toBe('~/ef')
  })

  it('randomized order still visits every alternate, then repeats the same order', () => {
    stubMatchMedia(false)
    // Equal-length strings keep the cycle timings identical regardless of shuffle outcome.
    const { result } = renderHook(() =>
      useTypewriter('~/pp', { ...fast, alternates: ['~/aa', '~/bb', '~/cc'], randomizeOrder: true })
    )
    const seen: string[] = []
    act(() => vi.advanceTimersByTime(170))
    seen.push(result.current)
    act(() => vi.advanceTimersByTime(210)) // t=380
    seen.push(result.current)
    act(() => vi.advanceTimersByTime(210)) // t=590
    seen.push(result.current)
    expect([...seen].sort()).toEqual(['~/aa', '~/bb', '~/cc'])
    act(() => vi.advanceTimersByTime(210)) // t=800 — 4th alternate wraps to the 1st again
    expect(result.current).toBe(seen[0])
  })

  it('types a queued override as the next alternate, then resumes rotation', () => {
    stubMatchMedia(false)
    const nextOverride = vi
      .fn<() => string | null>()
      .mockReturnValueOnce('~/xx')
      .mockReturnValue(null)
    const { result } = renderHook(() =>
      useTypewriter('~/ab', { ...fast, alternates: ['~/cd'], nextOverride })
    )
    act(() => vi.advanceTimersByTime(170)) // primary → override instead of the alternate
    expect(result.current).toBe('~/xx')
    act(() => vi.advanceTimersByTime(80)) // back on primary
    expect(result.current).toBe('~/ab')
    act(() => vi.advanceTimersByTime(130)) // rotation resumes with the skipped alternate
    expect(result.current).toBe('~/cd')
  })

  it('reads a value queued during the hold, not only at the start of it', () => {
    stubMatchMedia(false)
    // Mirrors the real eyebrow queue: hand out the pending value once, then nothing.
    let queued: string | null = null
    const nextOverride = () => {
      const value = queued
      queued = null
      return value
    }
    const { result } = renderHook(() =>
      useTypewriter('~/ab', { ...fast, alternates: ['~/cd'], nextOverride })
    )
    act(() => vi.advanceTimersByTime(40)) // primary typed; hold begins with the queue still empty
    queued = '~/zz' // arrives mid-hold — too late for the old "decide at hold start" logic
    act(() => vi.advanceTimersByTime(130)) // hold + erase + type the queued line
    expect(result.current).toBe('~/zz')
  })

  it('shows the primary immediately when disabled', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useTypewriter('~/about', { enabled: false }))
    expect(result.current).toBe('~/about')
  })

  it('shows the primary immediately and never cycles when reduced motion is preferred', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() =>
      useTypewriter('~/full-stack-engineer', { ...fast, alternates: ['~/cd'] })
    )
    expect(result.current).toBe('~/full-stack-engineer')
    act(() => vi.advanceTimersByTime(10_000))
    expect(result.current).toBe('~/full-stack-engineer')
  })

  it('shows the primary immediately when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useTypewriter('plain'))
    expect(result.current).toBe('plain')
  })

  it('clears its pending timer on unmount', () => {
    stubMatchMedia(false)
    const clearSpy = vi.spyOn(window, 'clearTimeout')
    const { unmount } = renderHook(() => useTypewriter('abc', fast))
    unmount()
    expect(clearSpy).toHaveBeenCalled()
  })
})
