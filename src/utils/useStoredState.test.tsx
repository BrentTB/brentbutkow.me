import { act, renderHook } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { useIsHydrating, useStoredState } from './useStoredState'

const Probe = ({ read }: { read: () => string }) => {
  const [value] = useStoredState(read, 'fallback')
  return <p>{value}</p>
}

describe('useStoredState', () => {
  it('reads storage up front in a client render', () => {
    const { result } = renderHook(() => useStoredState(() => 'stored', 'fallback'))
    expect(result.current[0]).toBe('stored')
  })

  it('prerenders the fallback without reading storage', () => {
    const read = vi.fn(() => 'stored')
    expect(renderToString(<Probe read={read} />)).toBe('<p>fallback</p>')
    expect(read).not.toHaveBeenCalled()
  })

  it('hydrates over the fallback, then shows the stored value', async () => {
    const container = document.createElement('div')
    container.innerHTML = renderToString(<Probe read={() => 'fallback'} />)
    const recoverableErrors: unknown[] = []
    await act(async () => {
      hydrateRoot(container, <Probe read={() => 'stored'} />, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      })
    })
    expect(recoverableErrors).toEqual([])
    expect(container.textContent).toBe('stored')
  })

  it('keeps the setter working like useState', () => {
    const { result } = renderHook(() => useStoredState(() => 1, 0))
    act(() => result.current[1]((n) => n + 1))
    expect(result.current[0]).toBe(2)
  })
})

describe('useIsHydrating', () => {
  it('is false in a client render', () => {
    expect(renderHook(() => useIsHydrating()).result.current).toBe(false)
  })

  it('is true while prerendering', () => {
    const Flag = () => String(useIsHydrating())
    expect(renderToString(<Flag />)).toBe('true')
  })
})
