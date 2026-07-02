import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { WaveClearBanner } from './WaveClearBanner'
import { GameUIStateProvider } from '../../useGameUIState'
import type { GameUIState } from '../../useNullSpace'
import { GamePhase } from '../../engine/types'

// The banner only reads wave + phase off the UI state, so a partial value suffices.
const uiState = (wave: number, phase: GamePhase) => ({ wave, phase }) as unknown as GameUIState

function renderBanner(wave: number, phase: GamePhase = GamePhase.playing) {
  const utils = render(
    <GameUIStateProvider value={uiState(wave, phase)}>
      <WaveClearBanner />
    </GameUIStateProvider>
  )
  return {
    ...utils,
    advance: (nextWave: number, nextPhase: GamePhase = GamePhase.playing) =>
      utils.rerender(
        <GameUIStateProvider value={uiState(nextWave, nextPhase)}>
          <WaveClearBanner />
        </GameUIStateProvider>
      ),
  }
}

describe('WaveClearBanner', () => {
  afterEach(cleanup)

  it('renders nothing until a wave clears', () => {
    const { container } = renderBanner(1)
    expect(container.firstChild).toBeNull()
  })

  it('flashes the cleared wave when it advances mid-play', () => {
    const { advance } = renderBanner(1)
    advance(2) // wave 1 cleared, straight into wave 2 — both frames `playing`
    expect(screen.getByText(/Wave 1\/\d+ cleared/)).toBeTruthy()
  })

  it('does not flash on the first wave starting (0 → 1)', () => {
    const { container, advance } = renderBanner(0)
    advance(1)
    expect(container.firstChild).toBeNull()
  })

  it('does not flash when the wave climbs across a shop (non-playing between)', () => {
    // wave 3 (playing) → shop → wave 4 (playing): the shop frame breaks the
    // playing→playing chain, so the sector/boss transition shows no clear notice.
    const { container, advance } = renderBanner(3)
    advance(3, GamePhase.upgradeScreen)
    advance(4, GamePhase.playing)
    expect(container.firstChild).toBeNull()
  })
})
