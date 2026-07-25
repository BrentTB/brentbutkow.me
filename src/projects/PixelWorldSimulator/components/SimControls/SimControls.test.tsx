import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { BRUSH_RADIUS, DEFAULT_SPEED, SIM_SPEEDS } from '../../data'
import { SimControls } from './SimControls'

function renderControls(overrides: Partial<Parameters<typeof SimControls>[0]> = {}) {
  const props = {
    isPaused: false,
    speed: DEFAULT_SPEED,
    radius: BRUSH_RADIUS.default,
    onTogglePause: vi.fn(),
    onSpeed: vi.fn(),
    onStep: vi.fn(),
    onClear: vi.fn(),
    onRadius: vi.fn(),
    ...overrides,
  }
  render(<SimControls {...props} />)
  return props
}

afterEach(cleanup)

describe('SimControls', () => {
  it('shows a pause control while running and a play control while paused', () => {
    // The glyph is a drawing, so the accessible name is the only thing carrying the state.
    renderControls()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()

    cleanup()
    renderControls({ isPaused: true })
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy()
  })

  it('only allows a single step while paused', () => {
    renderControls()
    expect(screen.getByRole('button', { name: 'Step one frame' }).hasAttribute('disabled')).toBe(
      true
    )

    cleanup()
    renderControls({ isPaused: true })
    expect(screen.getByRole('button', { name: 'Step one frame' }).hasAttribute('disabled')).toBe(
      false
    )
  })

  it('marks the speed the world is running at', () => {
    renderControls({ speed: SIM_SPEEDS[0].rate })

    expect(
      screen.getByRole('button', { name: SIM_SPEEDS[0].label }).getAttribute('aria-pressed')
    ).toBe('true')
    expect(
      screen.getByRole('button', { name: SIM_SPEEDS[1].label }).getAttribute('aria-pressed')
    ).toBe('false')
  })

  it('reports a change of speed', () => {
    const props = renderControls()

    screen.getByRole('button', { name: SIM_SPEEDS[2].label }).click()

    expect(props.onSpeed).toHaveBeenCalledWith(SIM_SPEEDS[2].rate)
  })
})
