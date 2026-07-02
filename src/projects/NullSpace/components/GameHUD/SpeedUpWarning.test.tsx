import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { SpeedUpWarning } from './SpeedUpWarning'
import { GameUIStateProvider } from '../../useGameUIState'
import type { GameUIState } from '../../useNullSpace'

afterEach(cleanup)

// The warning only reads speedUpCountdown off the UI state, so a partial value suffices.
const uiState = (speedUpCountdown: number | null) =>
  ({ speedUpCountdown }) as unknown as GameUIState

function renderWarning(countdown: number | null) {
  return render(
    <GameUIStateProvider value={uiState(countdown)}>
      <SpeedUpWarning />
    </GameUIStateProvider>
  )
}

function rerenderWarning(utils: ReturnType<typeof renderWarning>, countdown: number | null) {
  utils.rerender(
    <GameUIStateProvider value={uiState(countdown)}>
      <SpeedUpWarning />
    </GameUIStateProvider>
  )
}

describe('SpeedUpWarning', () => {
  it('shows the countdown while the warning window is open', () => {
    const { container } = renderWarning(3)
    expect(container.textContent).toMatch(/speed up in 3s/i)
  })

  it('shows nothing when no warning window is open', () => {
    const { container } = renderWarning(null)
    expect(container.firstChild).toBeNull()
  })

  // The core of the request: the countdown lapsing (a number → null) pops a brief
  // "sped up" sign instead of the warning just disappearing.
  it('flashes a sped-up sign when the countdown lapses, then clears it', () => {
    vi.useFakeTimers()
    try {
      const utils = renderWarning(1)
      rerenderWarning(utils, null)
      expect(utils.container.textContent).toMatch(/sped up/i)
      act(() => {
        vi.advanceTimersByTime(2600)
      })
      expect(utils.container.firstChild).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not flash when the window was never open', () => {
    const utils = renderWarning(null)
    rerenderWarning(utils, null)
    expect(utils.container.firstChild).toBeNull()
  })
})
