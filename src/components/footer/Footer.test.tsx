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

  it('flashes a loading line on load, then settles on the completed line (fun mode)', () => {
    renderFooter(true)
    expect(screen.getByText(/^loading .+\.\.\.$/)).toBeTruthy()
    // Advance well past the loading window (kept short so the test doesn't couple to its exact ms).
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByText('[process completed - exit code 0]')).toBeTruthy()
    expect(screen.queryByText(/^loading /)).toBeNull()
  })

  it('shows no sign-off line in professional mode', () => {
    renderFooter(false)
    expect(screen.queryByText(/loading |process completed/)).toBeNull()
  })
})
