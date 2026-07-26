import { describe, it, expect, afterEach, beforeEach, vi, Mock } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useFullscreen } from './useFullscreen'

let element: HTMLDivElement
let requestFullscreen: Mock<(options?: FullscreenOptions) => Promise<void>>
let exitFullscreen: Mock<() => Promise<void>>

/** Puts the document into or out of full screen the way the browser would, event included. */
function documentGoes(fullscreen: boolean) {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    value: fullscreen ? element : null,
  })
  act(() => {
    document.dispatchEvent(new Event('fullscreenchange'))
  })
}

beforeEach(() => {
  element = document.createElement('div')
  requestFullscreen = vi.fn().mockResolvedValue(undefined)
  exitFullscreen = vi.fn().mockResolvedValue(undefined)
  element.requestFullscreen = requestFullscreen
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exitFullscreen })
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null })
})

afterEach(cleanup)

function mount() {
  return renderHook(() => useFullscreen({ current: element }))
}

describe('useFullscreen', () => {
  it('starts windowed and reports the API as available', () => {
    const { result } = mount()

    expect(result.current.isFullscreen).toBe(false)
    expect(result.current.supported).toBe(true)
  })

  it('asks the element to go full screen, and the document to come back', () => {
    const { result } = mount()

    act(() => result.current.toggle())
    expect(requestFullscreen).toHaveBeenCalled()

    documentGoes(true)
    act(() => result.current.toggle())
    expect(exitFullscreen).toHaveBeenCalled()
  })

  it('follows the document, so leaving with Escape is not missed', () => {
    const { result } = mount()

    // Nothing was clicked here: the browser's own control and the Escape key both arrive this way.
    documentGoes(true)
    expect(result.current.isFullscreen).toBe(true)

    documentGoes(false)
    expect(result.current.isFullscreen).toBe(false)
  })

  it('offers full screen even where the browser has no Fullscreen API', () => {
    // iPhone Safari has none, and hiding the control there left the device most in need of a bigger world
    // without one. The fixed-overlay fallback stands in, so the control is always offered.
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: undefined })

    const { result } = mount()

    expect(result.current.supported).toBe(true)
  })

  it('falls back to the overlay where the API is missing', () => {
    const element = document.createElement('div')
    Object.defineProperty(element, 'requestFullscreen', { configurable: true, value: undefined })
    const { result } = renderHook(() => useFullscreen({ current: element }))

    act(() => result.current.toggle())

    expect(result.current.isPseudo).toBe(true)
    expect(result.current.isFullscreen).toBe(true)
  })

  it('falls back to the overlay when the API refuses the call', async () => {
    // Having the method is not the same as being allowed to use it.
    requestFullscreen.mockRejectedValue(new Error('not allowed'))
    const { result } = mount()

    await act(async () => result.current.toggle())

    expect(result.current.isPseudo).toBe(true)
  })

  it('comes back out of the overlay on a second press', async () => {
    requestFullscreen.mockRejectedValue(new Error('not allowed'))
    const { result } = mount()
    await act(async () => result.current.toggle())
    expect(result.current.isPseudo).toBe(true)

    act(() => result.current.toggle())

    expect(result.current.isPseudo).toBe(false)
    expect(result.current.isFullscreen).toBe(false)
  })

  it('swallows a refused request rather than throwing at the page', () => {
    requestFullscreen.mockRejectedValue(new Error('gesture required'))
    const { result } = mount()

    expect(() => act(() => result.current.toggle())).not.toThrow()
    expect(result.current.isFullscreen).toBe(false)
  })

  it('does nothing without an element to enlarge', () => {
    const { result } = renderHook(() => useFullscreen({ current: null }))

    act(() => result.current.toggle())

    expect(requestFullscreen).not.toHaveBeenCalled()
  })

  it('leaves full screen if the page is torn down while still in it', () => {
    const { unmount } = mount()
    documentGoes(true)

    unmount()

    expect(exitFullscreen).toHaveBeenCalled()
  })

  it('does not try to exit on unmount when it was already windowed', () => {
    const { unmount } = mount()

    unmount()

    expect(exitFullscreen).not.toHaveBeenCalled()
  })

  it('stops listening once it is gone', () => {
    const remove = vi.spyOn(document, 'removeEventListener')
    const { unmount } = mount()

    unmount()

    expect(remove).toHaveBeenCalledWith('fullscreenchange', expect.any(Function))
  })
})
