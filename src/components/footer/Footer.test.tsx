import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Footer } from './Footer'
import { FunModeContext } from '../../contexts/useFunMode'

function renderFooter(isFunMode: boolean) {
  return render(
    <MemoryRouter>
      <FunModeContext.Provider value={{ isFunMode, setIsFunMode: () => {} }}>
        <Footer />
      </FunModeContext.Provider>
    </MemoryRouter>
  )
}

describe('Footer sign-off', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    cleanup()
  })

  it('flashes a loading line whose ellipsis animates, then settles on completed (fun mode)', () => {
    renderFooter(true)
    // First frame has no dots yet.
    expect(screen.getByText(/^loading \S/)).toBeTruthy()
    expect(screen.queryByText(/^loading .+\.\.\.$/)).toBeNull()
    // A few dot-ticks in, the ellipsis has grown to three dots.
    act(() => vi.advanceTimersByTime(900))
    expect(screen.getByText(/^loading .+\.\.\.$/)).toBeTruthy()
    // Past the loading window it settles (advance generously so the test doesn't couple to the ms).
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByText('[process completed - exit code 0]')).toBeTruthy()
    expect(screen.queryByText(/^loading /)).toBeNull()
  })

  it('shows no sign-off line in professional mode', () => {
    renderFooter(false)
    expect(screen.queryByText(/loading |process completed/)).toBeNull()
  })
})
