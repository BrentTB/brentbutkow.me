import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Tool } from '../../pixel-world.types'
import { BRUSH_RADIUS, DEFAULT_SPEED, SIM_SPEEDS } from '../../data'
import { SimControls } from './SimControls'

function renderControls(overrides: Partial<Parameters<typeof SimControls>[0]> = {}) {
  const props = {
    isPaused: false,
    speed: DEFAULT_SPEED,
    tool: Tool.paint,
    radius: BRUSH_RADIUS.default,
    onTogglePause: vi.fn(),
    onSpeed: vi.fn(),
    onStep: vi.fn(),
    onClear: vi.fn(),
    onTool: vi.fn(),
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

  it('turns identify on from the paint tool', () => {
    const props = renderControls()

    screen.getByRole('button', { name: 'Identify' }).click()

    expect(props.onTool).toHaveBeenCalledWith(Tool.inspect)
  })

  it('turns identify back off, rather than needing another button', () => {
    const props = renderControls({ tool: Tool.inspect })
    const identify = screen.getByRole('button', { name: 'Identify' })

    expect(identify.getAttribute('aria-pressed')).toBe('true')
    identify.click()

    expect(props.onTool).toHaveBeenCalledWith(Tool.paint)
  })

  it('leaves the brush usable while identifying', () => {
    // Identify follows the pointer instead of taking its clicks, so painting carries on underneath it.
    renderControls({ tool: Tool.inspect })

    expect(screen.getByRole('slider').hasAttribute('disabled')).toBe(false)
  })
})
