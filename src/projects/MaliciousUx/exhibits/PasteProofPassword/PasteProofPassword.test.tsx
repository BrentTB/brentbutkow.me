import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copy, REVEAL_MS } from './data'
import { PasteProofPassword } from './PasteProofPassword'

const field = () => screen.getByLabelText(copy.label) as HTMLInputElement
const revealButton = () => screen.getByRole('button', { name: copy.revealLabel })

describe('PasteProofPassword', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('refuses a paste and keeps count', () => {
    render(<PasteProofPassword />)

    const blocked = !fireEvent.paste(field())

    expect(blocked).toBe(true)
    expect(screen.getByText(copy.blocked(1))).toBeTruthy()
  })

  it('still lets you type the thing out by hand', () => {
    render(<PasteProofPassword />)

    fireEvent.change(field(), { target: { value: 'hunter2' } })

    expect(field().value).toBe('hunter2')
    expect(screen.getByText(copy.typed('hunter2'.length))).toBeTruthy()
  })

  it('shows the password, then hides it again on its own', () => {
    render(<PasteProofPassword />)
    fireEvent.change(field(), { target: { value: 'hunter2' } })

    fireEvent.click(revealButton())
    expect(field().type).toBe('text')

    act(() => vi.advanceTimersByTime(REVEAL_MS))

    expect(field().type).toBe('password')
    expect(screen.getByText(copy.peeked)).toBeTruthy()
  })

  it('clears the hide timer on unmount', () => {
    const { unmount } = render(<PasteProofPassword />)

    fireEvent.click(revealButton())
    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
