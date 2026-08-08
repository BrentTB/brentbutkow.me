import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FunModeProvider } from '../../../../contexts/FunModeProvider'
import { HOSTILITY } from '../../data'
import { copy } from './data'
import { StillThere } from './StillThere'

const show = () =>
  render(
    <FunModeProvider>
      <StillThere />
    </FunModeProvider>
  )

const confirm = () => screen.getByRole('button', { name: copy.confirm })
const clickWithPointer = (button: HTMLElement) => {
  fireEvent.pointerDown(button)
  fireEvent.click(button)
}
const clickWithKeyboard = (button: HTMLElement) => {
  fireEvent.keyDown(button, { key: 'Enter' })
  fireEvent.click(button)
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  cleanup()
})

describe('StillThere', () => {
  it('comes back after the wait when a pointer dismisses it', () => {
    show()

    clickWithPointer(confirm())
    expect(screen.getByText(copy.waiting(HOSTILITY.nagIntervalMs / 1000))).toBeTruthy()

    act(() => vi.advanceTimersByTime(HOSTILITY.nagIntervalMs))
    expect(screen.getByText(copy.asked(1))).toBeTruthy()
  })

  it('takes the answer and stays gone when the keyboard gives it', () => {
    show()

    clickWithKeyboard(confirm())

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText(copy.keyboardGone)).toBeTruthy()
    const reset = screen.getByRole('button', { name: copy.reset })
    expect(document.activeElement).toBe(reset)
  })

  it('restarts clean from the reset control', () => {
    show()
    clickWithKeyboard(confirm())

    fireEvent.click(screen.getByRole('button', { name: copy.reset }))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText(copy.quiet)).toBeTruthy()
  })
})
