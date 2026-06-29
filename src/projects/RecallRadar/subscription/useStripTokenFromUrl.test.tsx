import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useStripTokenFromUrl } from './useStripTokenFromUrl'

const wrapper = (entry: string) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
  }

afterEach(() => vi.restoreAllMocks())

describe('useStripTokenFromUrl', () => {
  it('captures the token and strips it from the address bar', () => {
    const spy = vi.spyOn(window.history, 'replaceState')
    const { result } = renderHook(() => useStripTokenFromUrl(), {
      wrapper: wrapper('/x?token=abc123'),
    })
    expect(result.current).toBe('abc123')
    expect(spy).toHaveBeenCalled()
    // The replacement URL carries no query string.
    expect(String(spy.mock.calls[0][2])).not.toContain('token')
  })

  it('returns null and strips nothing when no token is present', () => {
    const spy = vi.spyOn(window.history, 'replaceState')
    const { result } = renderHook(() => useStripTokenFromUrl(), {
      wrapper: wrapper('/x'),
    })
    expect(result.current).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })
})
