import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copy } from './data'
import { ARRIVAL_MS, EagerAd } from './EagerAd'

const action = () => screen.getByRole('button', { name: copy.action })
const nudge = (clientX: number, clientY: number) =>
  fireEvent.pointerMove(action(), { clientX, clientY })

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  cleanup()
})

describe('EagerAd', () => {
  it('leaves the page alone while the cursor is far from the button', () => {
    render(<EagerAd />)

    nudge(500, 500)
    act(() => vi.advanceTimersByTime(ARRIVAL_MS))

    expect(screen.queryByText(copy.ad)).toBeNull()
  })

  it('drops the advert once the cursor nears the button', () => {
    render(<EagerAd />)

    nudge(4, 4)
    act(() => vi.advanceTimersByTime(ARRIVAL_MS))

    expect(screen.getByText(copy.ad)).toBeTruthy()
  })

  it('counts a click on the advert as interest, and resets clean', () => {
    render(<EagerAd />)
    nudge(4, 4)
    act(() => vi.advanceTimersByTime(ARRIVAL_MS))

    fireEvent.click(screen.getByRole('button', { name: copy.adAction }))
    expect(screen.getByText(copy.advert)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: copy.reset }))
    expect(screen.queryByText(copy.ad)).toBeNull()
    expect(screen.getByText(copy.quiet)).toBeTruthy()
  })

  /**
   * Regression: the whole trick hung off a cursor's approach, so on a phone — where there is no
   * approach and no cursor — the advert never loaded and the exhibit demonstrated nothing at all.
   */
  it('lets the advert take the tap on a touch screen', () => {
    render(<EagerAd />)

    fireEvent.pointerDown(action(), { pointerType: 'touch' })
    expect(screen.getByText(copy.ad)).toBeTruthy()

    fireEvent.click(action())
    expect(screen.getByText(copy.advert)).toBeTruthy()
  })

  it('gives the article the next tap, once the advert is already sitting there', () => {
    render(<EagerAd />)
    fireEvent.pointerDown(action(), { pointerType: 'touch' })
    fireEvent.click(action())

    fireEvent.pointerDown(action(), { pointerType: 'touch' })
    fireEvent.click(action())

    expect(screen.getByText(copy.article)).toBeTruthy()
  })

  it('drops the claim when the finger slides off instead of releasing', () => {
    render(<EagerAd />)

    // The advert arrives on the first press, which is then abandoned: no click, so nothing lands.
    fireEvent.pointerDown(action(), { pointerType: 'touch' })
    fireEvent.pointerDown(action(), { pointerType: 'touch' })
    fireEvent.click(action())

    expect(screen.getByText(copy.article)).toBeTruthy()
  })

  /**
   * Regression: an abandoned touch press left the claim on the advert, and the next Enter cashed it in —
   * breaking the museum's one promise, that a control reached by Tab does what its label says.
   */
  it('gives Enter the article even when a touch press was abandoned mid-tap', () => {
    render(<EagerAd />)

    fireEvent.pointerDown(action(), { pointerType: 'touch' })
    expect(screen.getByText(copy.ad)).toBeTruthy()

    fireEvent.keyDown(action(), { key: 'Enter' })
    fireEvent.click(action())

    expect(screen.getByText(copy.article)).toBeTruthy()
  })

  it('spells out the tap on a touch screen, where there is no cursor to watch', () => {
    const matchMedia = vi.fn((query: string) => ({
      matches: query === '(hover: none)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    vi.stubGlobal('matchMedia', matchMedia)

    render(<EagerAd />)
    expect(screen.getByText(copy.quietTouch)).toBeTruthy()

    vi.unstubAllGlobals()
  })

  it('leaves a mouse press to the cursor path, which steals no clicks', () => {
    render(<EagerAd />)

    fireEvent.pointerDown(action(), { pointerType: 'mouse' })
    expect(screen.queryByText(copy.ad)).toBeNull()

    fireEvent.click(action())
    expect(screen.getByText(copy.article)).toBeTruthy()
  })

  it('clears the pending arrival timer on unmount', () => {
    const { unmount } = render(<EagerAd />)
    nudge(4, 4)

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
