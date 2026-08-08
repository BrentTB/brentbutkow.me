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

  it('stops the countdown once a decision is made', () => {
    show()

    pressWithPointer(reject())
    fireEvent.click(accept())

    expect(vi.getTimerCount()).toBe(0)
  })
})
