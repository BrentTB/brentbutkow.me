import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOffscreenReset } from './useOffscreenReset'

type Callback = (entries: { isIntersecting: boolean }[]) => void

let latest: { callback: Callback; disconnect: () => void } | null = null

class FakeObserver {
  disconnect = vi.fn()
  observe = vi.fn()

  constructor(callback: Callback) {
    latest = { callback, disconnect: this.disconnect }
  }
}

function Subject({ onReturn }: { onReturn: () => void }) {
  const ref = useOffscreenReset<HTMLDivElement>(onReturn)
  return <div ref={ref} />
}

const cross = (isIntersecting: boolean) => latest?.callback([{ isIntersecting }])

describe('useOffscreenReset', () => {
  beforeEach(() => {
    latest = null
    vi.stubGlobal('IntersectionObserver', FakeObserver)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('stays quiet while the element is on screen', () => {
    const onReturn = vi.fn()
    render(<Subject onReturn={onReturn} />)

    cross(true)
    expect(onReturn).not.toHaveBeenCalled()
  })

  it('fires once the element has left and come back', () => {
    const onReturn = vi.fn()
    render(<Subject onReturn={onReturn} />)

    cross(false)
    cross(true)
    expect(onReturn).toHaveBeenCalledTimes(1)
  })

  it('fires again on every round trip, not just the first', () => {
    const onReturn = vi.fn()
    render(<Subject onReturn={onReturn} />)

    cross(false)
    cross(true)
    cross(false)
    cross(true)
    expect(onReturn).toHaveBeenCalledTimes(2)
  })

  it('calls the newest callback, so a parent re-render is not stale', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender } = render(<Subject onReturn={first} />)

    rerender(<Subject onReturn={second} />)
    cross(false)
    cross(true)

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('disconnects on unmount', () => {
    const { unmount } = render(<Subject onReturn={vi.fn()} />)
    const disconnect = latest?.disconnect

    unmount()
    expect(disconnect).toHaveBeenCalled()
  })

  it('does nothing where IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    expect(() => render(<Subject onReturn={vi.fn()} />)).not.toThrow()
  })
})
