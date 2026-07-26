import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { Tool } from '../../pixel-world.types'
import { TOOLS, simCopy } from '../../data'
import { ToolRow } from './ToolRow'

function renderTools(overrides: Partial<Parameters<typeof ToolRow>[0]> = {}) {
  const props = {
    selected: Tool.paint,
    onSelect: vi.fn(),
    isFullscreen: false,
    canFullscreen: true,
    onToggleFullscreen: vi.fn(),
    isSettingsOpen: false,
    onOpenSettings: vi.fn(),
    ...overrides,
  }
  render(<ToolRow {...props} />)
  return props
}

afterEach(cleanup)

describe('ToolRow', () => {
  it('offers every tool', () => {
    renderTools()

    for (const { label } of TOOLS) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy()
    }
  })

  it('marks the tool in use and only that one', () => {
    renderTools({ selected: Tool.blast })

    const pressed = TOOLS.filter(
      ({ label }) =>
        screen.getByRole('button', { name: label }).getAttribute('aria-pressed') === 'true'
    )

    expect(pressed).toHaveLength(1)
    expect(pressed[0].tool).toBe(Tool.blast)
  })

  it('reports the tool that was picked', () => {
    const props = renderTools()

    const wind = TOOLS.find(({ tool }) => tool === Tool.wind)
    screen.getByRole('button', { name: wind?.label ?? '' }).click()

    expect(props.onSelect).toHaveBeenCalledWith(Tool.wind)
  })

  it('offers full screen as its own control, not a seventh tool', () => {
    renderTools()

    // It acts on the window rather than on the pointer, so it stays out of the tool group.
    const group = screen.getByRole('group', { name: 'Tool' })
    const control = screen.getByRole('button', { name: 'Full screen' })
    expect(group.contains(control)).toBe(false)
  })

  it('swaps the icon for the way out once it is full screen', () => {
    renderTools({ isFullscreen: true })

    // The glyph is a drawing, so the accessible name carries the state on its own.
    expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Full screen' })).toBeNull()
  })

  it('hides the control where the browser cannot do it', () => {
    renderTools({ canFullscreen: false })

    expect(screen.queryByRole('button', { name: 'Full screen' })).toBeNull()
  })

  it('reports a request to change it', () => {
    const props = renderTools()

    screen.getByRole('button', { name: 'Full screen' }).click()

    expect(props.onToggleFullscreen).toHaveBeenCalled()
  })

  it('offers the settings beside full screen, outside the tool group', () => {
    renderTools()

    const gear = screen.getByRole('button', { name: simCopy.settings.open })
    expect(gear.getAttribute('aria-haspopup')).toBe('dialog')
    expect(screen.getByRole('group', { name: 'Tool' }).contains(gear)).toBe(false)
  })

  it('asks for the settings when the gear is pressed', () => {
    const props = renderTools()

    screen.getByRole('button', { name: simCopy.settings.open }).click()

    expect(props.onOpenSettings).toHaveBeenCalled()
  })

  it('keeps the gear where the browser cannot go full screen', () => {
    renderTools({ canFullscreen: false })

    expect(screen.getByRole('button', { name: simCopy.settings.open })).toBeTruthy()
  })

  it('shows on the gear whether the dialog is open', () => {
    renderTools()
    const closed = screen.getByRole('button', { name: simCopy.settings.open })
    expect(closed.getAttribute('aria-expanded')).toBe('false')

    cleanup()
    renderTools({ isSettingsOpen: true })

    expect(
      screen.getByRole('button', { name: simCopy.settings.open }).getAttribute('aria-expanded')
    ).toBe('true')
  })
})
