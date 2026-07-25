import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Tool } from '../../pixel-world.types'
import { BRUSH_RADIUS } from '../../data'
import { SimControls } from './SimControls'

function renderControls(overrides: Partial<Parameters<typeof SimControls>[0]> = {}) {
  const props = {
    isPaused: false,
    tool: Tool.paint,
    radius: BRUSH_RADIUS.default,
    onTogglePause: vi.fn(),
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
  it('offers Pause while running and Play while paused', () => {
    renderControls()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy()

    cleanup()
    renderControls({ isPaused: true })
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy()
  })

  it('only allows a single step while paused', () => {
    renderControls()
    expect(screen.getByRole('button', { name: 'Step' }).hasAttribute('disabled')).toBe(true)

    cleanup()
    renderControls({ isPaused: true })
    expect(screen.getByRole('button', { name: 'Step' }).hasAttribute('disabled')).toBe(false)
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

  it('takes the brush size away while identifying, since nothing is being painted', () => {
    renderControls({ tool: Tool.inspect })

    expect(screen.getByRole('slider').hasAttribute('disabled')).toBe(true)
  })
})
