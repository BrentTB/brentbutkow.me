import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFunMode } from './useFunMode'
import { FunModeProvider } from './FunModeProvider'

describe('useFunMode', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('fun-mode')
  })

  it('guards against use outside a FunModeProvider', () => {
    // Catch the throw inside render so React never reports an uncaught error (keeps output clean).
    const { result } = renderHook(() => {
      try {
        useFunMode()
        return null
      } catch (error) {
        return (error as Error).message
      }
    })
    expect(result.current).toMatch(/must be used within a FunModeProvider/)
  })

  it('exposes the flag and lets it be toggled inside the provider', () => {
    const { result } = renderHook(() => useFunMode(), { wrapper: FunModeProvider })

    expect(result.current.isFunMode).toBe(false)

    act(() => result.current.setIsFunMode(true))
    expect(result.current.isFunMode).toBe(true)
    expect(document.documentElement.classList.contains('fun-mode')).toBe(true)
  })
})
