import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { BRUSH_RADIUS, DEFAULT_SPEED, PRESETS, SIM_SPEEDS, simCopy } from '../../data'
import { ShareOutcome } from '../../useShareLink'
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
    canShare: true,
    shareOutcome: ShareOutcome.idle,
    onShare: vi.fn(),
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

  it('loads a ready-made world when one is picked from the menu', () => {
    const props = renderControls()

    // The prompt holds the trigger, so the menu has to be opened before any world can be chosen.
    fireEvent.click(screen.getByRole('combobox', { name: 'Load a preset' }))
    fireEvent.click(screen.getByRole('option', { name: PRESETS[0].label }))

    expect(props.onLoad).toHaveBeenCalledWith(PRESETS[0].preset)
  })

  it('offers a share control and reports a press', () => {
    const props = renderControls()

    fireEvent.click(screen.getByRole('button', { name: simCopy.share.button }))

    expect(props.onShare).toHaveBeenCalled()
  })

  it('shows the outcome on the control itself, not only in the line below', () => {
    renderControls({ shareOutcome: ShareOutcome.copied })
    const share = screen.getByRole('button', { name: simCopy.share.button })
    expect(share.getAttribute('data-outcome')).toBe(ShareOutcome.copied)

    cleanup()
    renderControls({ shareOutcome: ShareOutcome.refused })

    expect(
      screen.getByRole('button', { name: simCopy.share.button }).getAttribute('data-outcome')
    ).toBe(ShareOutcome.refused)
  })

  it('marks the outcome with a glyph as well as a colour', () => {
    renderControls({ shareOutcome: ShareOutcome.copied })
    const copied = screen.getByRole('button', { name: simCopy.share.button }).textContent

    cleanup()
    renderControls({ shareOutcome: ShareOutcome.refused })
    const refused = screen.getByRole('button', { name: simCopy.share.button }).textContent

    // Colour alone would leave the two states identical to anyone who cannot tell them apart.
    expect(copied).not.toBe(refused)
  })

  it('leaves the share control out where the browser cannot build a link', () => {
    renderControls({ canShare: false })

    expect(screen.queryByRole('button', { name: simCopy.share.button })).toBeNull()
  })

  it('keeps sharing away from the button that throws the world away', () => {
    renderControls()
    const share = screen.getByRole('button', { name: simCopy.share.button })
    const clear = screen.getByRole('button', { name: 'Clear' })
    const brush = screen.getByRole('slider', { name: /brush/i })

    // A miss while reaching for Share should never clear a world, so the brush sits between the two.
    const order = (node: Element) => [...document.querySelectorAll('button, input')].indexOf(node)
    expect(order(share)).toBeLessThan(order(brush))
    expect(order(brush)).toBeLessThan(order(clear))
  })

  it('does not treat the prompt itself as a world to load', () => {
    const props = renderControls()

    fireEvent.click(screen.getByRole('combobox', { name: 'Load a preset' }))
    // The "Load a preset…" row is disabled, so clicking it selects nothing.
    fireEvent.click(screen.getByRole('option', { name: 'Load a preset…' }))

    expect(props.onLoad).not.toHaveBeenCalled()
  })
})
