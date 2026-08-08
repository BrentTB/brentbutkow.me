import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copy, imposedWaitSeconds, MAILINGS, UNSUBSCRIBE_MS } from './data'
import { UnsubscribeSlog } from './UnsubscribeSlog'

const leaveButtons = () => screen.getAllByRole('button', { name: copy.unsubscribe })
const settle = () => act(() => vi.advanceTimersByTime(UNSUBSCRIBE_MS))

/** Works through every mailing the way a visitor has to: one press, one wait, repeat. */
const leaveEverything = () => {
  for (let done = 0; done < MAILINGS.length; done += 1) {
    fireEvent.click(leaveButtons()[0])
    settle()
  }
}

describe('UnsubscribeSlog', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('offers one control per subscription', () => {
    render(<UnsubscribeSlog />)

    expect(leaveButtons()).toHaveLength(MAILINGS.length)
    expect(screen.getByText(copy.quiet(MAILINGS.length))).toBeTruthy()
  })

  it('makes each one wait before it takes', () => {
    render(<UnsubscribeSlog />)

    fireEvent.click(leaveButtons()[0])
    expect(screen.getByText(copy.pending)).toBeTruthy()
    expect(screen.queryByText(copy.gone)).toBeNull()

    settle()
    expect(screen.getByText(copy.gone)).toBeTruthy()
  })

  /**
   * The wait only costs anything if it blocks the whole panel. Queueing them up let a visitor fire all
   * nine inside a second and never feel it.
   */
  it('locks every other subscription while one is processing', () => {
    render(<UnsubscribeSlog />)

    fireEvent.click(leaveButtons()[0])

    expect((screen.getByText(copy.pending) as HTMLButtonElement).disabled).toBe(true)
    const others = screen.getAllByRole('button', { name: copy.unsubscribe }) as HTMLButtonElement[]
    expect(others).toHaveLength(MAILINGS.length - 1)
    expect(others.every((button) => button.disabled)).toBe(true)
    expect(screen.getByText(copy.waiting)).toBeTruthy()
  })

  it('unlocks the panel once the wait is served', () => {
    render(<UnsubscribeSlog />)

    fireEvent.click(leaveButtons()[0])
    settle()

    const others = screen.getAllByRole('button', { name: copy.unsubscribe }) as HTMLButtonElement[]
    expect(others.every((button) => button.disabled)).toBe(false)
  })

  it('charges the full wait to get out', () => {
    render(<UnsubscribeSlog />)

    leaveEverything()

    expect(screen.getByText(copy.cleared(imposedWaitSeconds(MAILINGS.length)))).toBeTruthy()
  })

  /** The asymmetry is the exhibit: nine slow presses out, one instant press back in. */
  it('puts every subscription back on a single press, with no waiting', () => {
    render(<UnsubscribeSlog />)
    leaveEverything()

    fireEvent.click(screen.getByRole('button', { name: copy.resubscribe }))

    expect(leaveButtons()).toHaveLength(MAILINGS.length)
    expect(screen.getByText(copy.restored)).toBeTruthy()
    // Nothing is still queued: letting any timer run must not undo the restore or re-take a mailing.
    act(() => vi.runOnlyPendingTimers())
    expect(screen.getByText(copy.restored)).toBeTruthy()
    expect(leaveButtons()).toHaveLength(MAILINGS.length)
  })

  it('keeps keyboard focus in the panel after an unsubscribe settles', () => {
    render(<UnsubscribeSlog />)

    fireEvent.click(leaveButtons()[0])
    settle()

    expect(leaveButtons()).toContain(document.activeElement)
  })

  it('clears pending timers on unmount', () => {
    const { unmount } = render(<UnsubscribeSlog />)

    fireEvent.click(leaveButtons()[0])
    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
