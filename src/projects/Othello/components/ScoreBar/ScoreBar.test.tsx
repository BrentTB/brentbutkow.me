import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ScoreBar } from './ScoreBar'
import { Player } from '../../othello.types'
import { gameCopy } from '../../data'

afterEach(cleanup)

const renderBar = (overrides = {}) => {
  const { container } = render(
    <ScoreBar
      dark={2}
      light={2}
      darkName="Dark"
      lightName="Light"
      currentPlayer={Player.dark}
      {...overrides}
    />
  )
  return container
}

describe('ScoreBar', () => {
  it('shows each side its tally', () => {
    renderBar({ dark: 10, light: 4 })
    expect(screen.getByText(gameCopy.scoreLabel('Dark', 10))).toBeTruthy()
    expect(screen.getByText(gameCopy.scoreLabel('Light', 4))).toBeTruthy()
  })

  it('fills the bar in proportion to the lead', () => {
    const container = renderBar({ dark: 30, light: 10 })
    const score = container.querySelector('[style*="--dark-share"]') as HTMLElement
    expect(score.style.getPropertyValue('--dark-share')).toBe('75%')
  })

  it('splits the bar evenly on an empty board rather than dividing by zero', () => {
    const container = renderBar({ dark: 0, light: 0 })
    const score = container.querySelector('[style*="--dark-share"]') as HTMLElement
    expect(score.style.getPropertyValue('--dark-share')).toBe('50%')
  })

  it('marks only the side whose turn it is', () => {
    const container = renderBar({ currentPlayer: Player.light })
    const marked = container.querySelectorAll('[data-turn="true"]')
    expect(marked).toHaveLength(1)
    expect(marked[0].getAttribute('data-player')).toBe(Player.light)
  })
})
