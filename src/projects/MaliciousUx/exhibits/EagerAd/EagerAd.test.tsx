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

  it('clears the pending arrival timer on unmount', () => {
    const { unmount } = render(<EagerAd />)
    nudge(4, 4)

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
