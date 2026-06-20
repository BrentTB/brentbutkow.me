import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { LeaderboardScreen } from './LeaderboardScreen'

vi.mock('../leaderboard/useLeaderboard', () => ({
  useLeaderboard: () => ({
    data: [
      { id: '1', name: 'AAA', wave: 5, score: 1000 },
      { id: '2', name: 'BBB', wave: 3, score: 500 },
    ],
    loading: false,
    error: null,
  }),
}))

afterEach(cleanup)

describe('LeaderboardScreen', () => {
  it('wraps the whole board in one element so it scales as a single GameOverlay child', () => {
    const { container } = render(<LeaderboardScreen onClose={() => {}} />)
    // A single wrapper, not a fragment of siblings: GameOverlay scales each
    // `.content > *` by --hud-scale via transform (no reserved layout space), so
    // separate children let the tall table overflow onto the Back button in
    // fullscreen. One wrapper makes the board scale as a unit and flow internally.
    expect(container.children).toHaveLength(1)
    const panel = container.firstElementChild as HTMLElement
    expect(panel.querySelector('h2')?.textContent).toBe('Leaderboard')
    expect(panel.querySelector('button')?.textContent).toBe('Back')
  })
})
