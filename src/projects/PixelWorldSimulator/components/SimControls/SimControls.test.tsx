import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { BRUSH_RADIUS, DEFAULT_SPEED, PRESETS, SIM_SPEEDS } from '../../data'
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
    onLoad: vi.fn(),
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

  it('keeps Clear away from the transport, past the brush control', () => {
    renderControls()

    const clear = screen.getByRole('button', { name: 'Clear' })
    const brush = screen.getByRole('slider')
    const pause = screen.getByRole('button', { name: 'Pause' })

    // It throws the whole world away; a miss while reaching for a speed should not cost you that.
    expect(clear.compareDocumentPosition(brush) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    expect(pause.compareDocumentPosition(clear) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('offers a ready-made world to drop in', () => {
    const props = renderControls()

    screen.getByRole('button', { name: PRESETS[0].label }).click()

    expect(props.onLoad).toHaveBeenCalledWith(PRESETS[0].preset)
  })
})
