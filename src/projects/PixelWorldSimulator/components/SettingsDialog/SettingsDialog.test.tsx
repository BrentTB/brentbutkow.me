import { describe, it, expect, afterEach, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SimSetting } from '../../pixel-world.types'
import { DEFAULT_SETTINGS, SETTING_ROWS, SETTING_SECTIONS, simCopy } from '../../data'
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
    open({ settings: { tintBlocks: false, tintAir: true, showFlow: false, airCurrents: true } })

    const [blocks, air] = screen.getAllByRole('checkbox')
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

  it('closes on a backdrop press-and-release, but not a panel click or a drag off a switch', () => {
    const { onClose } = open()
    const dialog = screen.getByRole('dialog')
    const backdrop = screen.getByRole('presentation')

    // Press and release inside the panel: never closes.
    fireEvent.pointerDown(dialog)
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()

    // A drag starting on the panel and releasing on the backdrop: still does not close.
    fireEvent.pointerDown(dialog)
    fireEvent.click(backdrop)
    expect(onClose).not.toHaveBeenCalled()

    // Press and release both on the backdrop: closes.
    fireEvent.pointerDown(backdrop)
    fireEvent.click(backdrop)
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

  it('lists every setting, in the order the dialog shows them', () => {
    open()

    expect(screen.getByText(SETTING_ROWS[0].hint)).toBeTruthy()
    expect(SETTING_ROWS.map(({ setting }) => setting)).toEqual([
      SimSetting.tintBlocks,
      SimSetting.tintAir,
      SimSetting.airCurrents,
      SimSetting.showFlow,
    ])
  })
})

describe('the switches, grouped', () => {
  it('names each group and puts every switch in one', () => {
    open()

    for (const { title } of SETTING_SECTIONS) {
      expect(screen.getByRole('group', { name: new RegExp(title, 'i') })).toBeTruthy()
    }
    // Nothing stranded outside a group, and the flat list stays in the order the dialog shows.
    expect(SETTING_ROWS.map(({ setting }) => setting)).toEqual(
      SETTING_SECTIONS.flatMap(({ rows }) => rows.map(({ setting }) => setting))
    )
  })

  it('keeps the tints and the world separate', () => {
    // Worth saying out loud: the first pair changes the picture, the second changes what the world does.
    expect(SETTING_SECTIONS.map(({ title }) => title)).toEqual(['Tint', 'Air mechanics'])
    expect(SETTING_SECTIONS[1].rows.map(({ setting }) => setting)).toEqual([
      SimSetting.airCurrents,
      SimSetting.showFlow,
    ])
  })
})

describe('a setting that depends on another', () => {
  /** Looked up by setting rather than by position, so inserting a row above it cannot silently retarget this. */
  function flowCheckbox(): HTMLInputElement {
    const row = SETTING_ROWS.find(({ setting }) => setting === SimSetting.showFlow)
    if (row === undefined) throw new Error('no flow row')
    return screen.getByRole('checkbox', { name: new RegExp(row.label, 'i') }) as HTMLInputElement
  }

  it('greys the flow overlay out and reads it as off while air is off', () => {
    // The overlay draws the air field, so with air switched off it would be showing a draught that is not
    // blowing. The stored preference is left alone, so turning air back on brings it back as it was.
    open({ settings: { tintBlocks: true, tintAir: false, showFlow: true, airCurrents: false } })

    const flow = flowCheckbox()

    expect(flow.disabled).toBe(true)
    expect(flow.checked).toBe(false)
    // A greyed control with no reason given is a dead end, so the row says which switch brings it back.
    expect(screen.getByText(new RegExp(simCopy.settings.locked, 'i'))).toBeTruthy()
  })

  it('leaves it alone once air is on', () => {
    open({ settings: { tintBlocks: true, tintAir: false, showFlow: true, airCurrents: true } })

    const flow = flowCheckbox()

    expect(flow.disabled).toBe(false)
    expect(flow.checked).toBe(true)
  })

  it('reports no toggle when the locked switch is pressed', () => {
    // Greyed out is only half the promise: pressing it must do nothing, not quietly flip a hidden value.
    const { onToggle } = open({
      settings: { tintBlocks: true, tintAir: false, showFlow: true, airCurrents: false },
    })

    fireEvent.click(flowCheckbox())

    expect(onToggle).not.toHaveBeenCalled()
  })
})
