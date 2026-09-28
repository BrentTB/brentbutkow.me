import { renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BUILD_YEAR, useCurrentYear } from './useCurrentYear'

afterEach(() => {
  vi.useRealTimers()
})

describe('useCurrentYear', () => {
  it('is baked in as a real year', () => {
    expect(Number.isInteger(BUILD_YEAR)).toBe(true)
  })

  it('renders the build year into prerendered HTML', () => {
    vi.useFakeTimers({ now: new Date(BUILD_YEAR + 1, 0, 1) })
    const Probe = () => useCurrentYear()
    expect(renderToString(<Probe />)).toBe(String(BUILD_YEAR))
  })

  it('reports the visitor’s current year in the browser', () => {
    vi.useFakeTimers({ now: new Date(BUILD_YEAR + 1, 0, 1) })
    const { result } = renderHook(() => useCurrentYear())
    expect(result.current).toBe(BUILD_YEAR + 1)
  })
})
