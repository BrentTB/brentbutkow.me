import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { SpeedUpWarning } from './SpeedUpWarning'

afterEach(cleanup)

describe('SpeedUpWarning', () => {
  it('shows the countdown while the warning window is open', () => {
    const { container } = render(<SpeedUpWarning countdown={3} />)
    expect(container.textContent).toMatch(/speed up in 3s/i)
  })

  it('shows nothing when no warning window is open', () => {
    const { container } = render(<SpeedUpWarning countdown={null} />)
    expect(container.firstChild).toBeNull()
  })

  // The core of the request: the countdown lapsing (a number → null) pops a brief
  // "sped up" sign instead of the warning just disappearing.
  it('flashes a sped-up sign when the countdown lapses, then clears it', () => {
    vi.useFakeTimers()
    try {
      const { rerender, container } = render(<SpeedUpWarning countdown={1} />)
      rerender(<SpeedUpWarning countdown={null} />)
      expect(container.textContent).toMatch(/sped up/i)
      act(() => {
        vi.advanceTimersByTime(2600)
      })
      expect(container.firstChild).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not flash when the window was never open', () => {
    const { rerender, container } = render(<SpeedUpWarning countdown={null} />)
    rerender(<SpeedUpWarning countdown={null} />)
    expect(container.firstChild).toBeNull()
  })
})
