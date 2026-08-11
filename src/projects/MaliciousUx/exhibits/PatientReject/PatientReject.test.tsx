import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FunModeProvider } from '../../../../contexts/FunModeProvider'
import { HOSTILITY } from '../../data'
import { copy } from './data'
import { PatientReject } from './PatientReject'

const show = () =>
  render(
    <FunModeProvider>
      <PatientReject />
    </FunModeProvider>
  )

const reject = () => screen.getByRole('button', { name: copy.reject })
const accept = () => screen.getByRole('button', { name: copy.accept })

const pressWithPointer = (button: HTMLElement) => {
  fireEvent.pointerDown(button)
  fireEvent.click(button)
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  cleanup()
})

describe('PatientReject', () => {
  it('makes a pointer wait the full delay, then rejects on a second press', () => {
    show()

    pressWithPointer(reject())
    expect(screen.queryByText(copy.rejected(1))).toBeNull()

    act(() => vi.advanceTimersByTime(HOSTILITY.rejectDelayMs))
    expect(screen.getByText(copy.ready)).toBeTruthy()

    pressWithPointer(reject())
    expect(screen.getByText(copy.rejected(2))).toBeTruthy()
  })

  it('counts the presses it actually took to accept', () => {
    show()

    pressWithPointer(reject())
    fireEvent.click(accept())

    expect(screen.getByText(copy.accepted(2))).toBeTruthy()
  })

  /**
   * Regression: accepting and then thinking better of it left the "accepted" line in place, so the
   * countdown the press had started was invisible — the Reject button looked broken rather than slow.
   */
  it('starts the wait over when a mind is changed after accepting', () => {
    show()

    fireEvent.click(accept())
    expect(screen.getByText(copy.accepted(1))).toBeTruthy()

    pressWithPointer(reject())
    expect(
      screen.getByText(copy.preparing((HOSTILITY.rejectDelayMs / 1000).toFixed(1)))
    ).toBeTruthy()

    act(() => vi.advanceTimersByTime(HOSTILITY.rejectDelayMs))
    pressWithPointer(reject())

    expect(screen.getByText(copy.rejected(3))).toBeTruthy()
  })

  /**
   * Regression: restarting the wait for any outcome, not just an acceptance, meant a rejection already
   * granted by the keyboard was taken back by the next mouse press and replaced with a fresh countdown.
   */
  it('leaves a rejection alone once it has been granted', () => {
    show()

    pressWithPointer(reject())
    fireEvent.keyDown(reject())
    fireEvent.click(reject())
    expect(screen.getByText(copy.rejected(2))).toBeTruthy()

    pressWithPointer(reject())

    expect(screen.getByText(copy.rejected(3))).toBeTruthy()
    expect(
      screen.queryByText(copy.preparing((HOSTILITY.rejectDelayMs / 1000).toFixed(1)))
    ).toBeNull()
  })

  it('stops the countdown once a decision is made', () => {
    show()

    pressWithPointer(reject())
    fireEvent.click(accept())

    expect(vi.getTimerCount()).toBe(0)
  })
})
