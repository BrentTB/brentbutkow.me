import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { useMatrixRain } from './useMatrixRain'

function stubContext() {
  return { fillRect: vi.fn(), fillText: vi.fn(), fillStyle: '', font: '' }
}

function renderRain(running: boolean) {
  return renderHook(() => {
    const ref = useRef<HTMLCanvasElement>(document.createElement('canvas'))
    useMatrixRain(ref, running)
  })
}

describe('useMatrixRain', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('touches nothing while it is not running', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
    renderRain(false)
    expect(getContext).not.toHaveBeenCalled()
  })

  it('starts a rAF loop when running and cancels it on unmount', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      stubContext() as unknown as CanvasRenderingContext2D
    )
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false } as MediaQueryList))
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame')

    const { unmount } = renderRain(true)
    expect(requestFrame).toHaveBeenCalled()

    unmount()
    expect(cancelFrame).toHaveBeenCalled()
  })

  it('renders a single static frame under reduced motion, no loop', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      stubContext() as unknown as CanvasRenderingContext2D
    )
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true } as MediaQueryList))
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame')

    renderRain(true)
    expect(requestFrame).not.toHaveBeenCalled()
  })
})
