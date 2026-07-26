import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SimSetting } from '../../pixel-world.types'
import { DEFAULT_SETTINGS, SETTING_ROWS, simCopy } from '../../data'
import { SettingsDialog } from './SettingsDialog'

function open(overrides: Partial<Parameters<typeof SettingsDialog>[0]> = {}) {
  const props = {
    settings: { ...DEFAULT_SETTINGS },
    onToggle: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  render(<SettingsDialog {...props} />)
  return props
}

afterEach(cleanup)

describe('SettingsDialog', () => {
  it('is a modal dialog with a name', () => {
    open()

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByRole('heading', { name: simCopy.settings.title })).toBeTruthy()
  })

  it('shows every setting with its own switch', () => {
    open()

    for (const { label } of SETTING_ROWS) {
      expect(screen.getByRole('checkbox', { name: new RegExp(label) })).toBeTruthy()
    }
    expect(screen.getAllByRole('checkbox')).toHaveLength(SETTING_ROWS.length)
  })

  it('shows each switch at the state it was given', () => {
    open({ settings: { tintBlocks: false, tintAir: true } })

    const [blocks, air] = screen.getAllByRole('checkbox')
    expect(blocks.getAttribute('checked')).toBe(null)
    expect((blocks as HTMLInputElement).checked).toBe(false)
    expect((air as HTMLInputElement).checked).toBe(true)
  })

  it('reports which setting was flipped', () => {
    const { onToggle } = open()

    fireEvent.click(screen.getAllByRole('checkbox')[1])

    expect(onToggle).toHaveBeenCalledWith(SETTING_ROWS[1].setting)
  })

  it('closes on the done button', () => {
    const { onClose } = open()

    fireEvent.click(screen.getByRole('button', { name: simCopy.settings.close }))

    expect(onClose).toHaveBeenCalled()
  })

  it('closes on Escape', () => {
    const { onClose } = open()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalled()
  })

  it('closes on a click on the backdrop but not one inside the panel', () => {
    const { onClose } = open()

    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('presentation'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('takes the focus on open and gives it back on close', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()

    const view = render(
      <SettingsDialog settings={{ ...DEFAULT_SETTINGS }} onToggle={vi.fn()} onClose={vi.fn()} />
    )
    expect(document.activeElement?.textContent).toBe(simCopy.settings.close)

    view.unmount()

    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('leaves focus alone when the parent re-renders with a fresh onClose', () => {
    const view = render(
      <SettingsDialog settings={{ ...DEFAULT_SETTINGS }} onToggle={vi.fn()} onClose={vi.fn()} />
    )
    const checkbox = screen.getAllByRole('checkbox')[1] as HTMLElement
    checkbox.focus()
    expect(document.activeElement).toBe(checkbox)

    // The parent hands a brand-new onClose ten times a second; the focus effect must not re-run and drag
    // focus back to Done mid-toggle.
    view.rerender(
      <SettingsDialog settings={{ ...DEFAULT_SETTINGS }} onToggle={vi.fn()} onClose={vi.fn()} />
    )

    expect(document.activeElement).toBe(checkbox)
  })

  it('closes through the latest onClose after a re-render', () => {
    const stale = vi.fn()
    const fresh = vi.fn()
    const view = render(
      <SettingsDialog settings={{ ...DEFAULT_SETTINGS }} onToggle={vi.fn()} onClose={stale} />
    )
    view.rerender(
      <SettingsDialog settings={{ ...DEFAULT_SETTINGS }} onToggle={vi.fn()} onClose={fresh} />
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(fresh).toHaveBeenCalled()
    expect(stale).not.toHaveBeenCalled()
  })

  it('keeps Tab inside the dialog, so focus cannot wander onto the world behind it', () => {
    open()
    const focusable = screen.getByRole('dialog').querySelectorAll('button, input')
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    // Forward off the end wraps to the front.
    ;(last as HTMLElement).focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(first)

    // And backward off the front wraps to the end.
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('names each setting for the tint the viewer will see', () => {
    open()

    expect(screen.getByText(SETTING_ROWS[0].hint)).toBeTruthy()
    expect(SETTING_ROWS.map(({ setting }) => setting)).toEqual([
      SimSetting.tintBlocks,
      SimSetting.tintAir,
    ])
  })
})
