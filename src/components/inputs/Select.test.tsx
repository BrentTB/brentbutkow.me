import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Select } from './Select'

const options = [
  { value: '', label: 'All' },
  { value: 'fda', label: 'FDA' },
  { value: 'usda', label: 'USDA FSIS' },
]

describe('Select', () => {
  afterEach(cleanup)

  it('shows the selected option label and keeps the list closed', () => {
    render(<Select value="usda" options={options} onChange={() => {}} ariaLabel="Source" />)
    expect(screen.getByLabelText('Source').textContent).toContain('USDA FSIS')
    expect(screen.queryByRole('option')).toBeNull()
  })

  it('opens its menu inside the full-screen element, not off in the body', () => {
    // The browser paints only the full-screen element and its descendants, so a menu portaled to the body is
    // simply not on screen: the control looks dead. This is what made the preset dropdown unopenable in the
    // pixel world's full-screen view.
    const stage = document.createElement('div')
    document.body.append(stage)
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => stage })

    render(<Select value="" options={options} onChange={() => {}} ariaLabel="Source" />, {
      container: stage.appendChild(document.createElement('div')),
    })
    fireEvent.click(screen.getByLabelText('Source'))

    const menu = screen.getByRole('listbox')
    expect(stage.contains(menu)).toBe(true)

    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => null })
    stage.remove()
  })

  it('opens, selects an option, and closes', () => {
    const onChange = vi.fn()
    render(<Select value="" options={options} onChange={onChange} ariaLabel="Source" />)
    fireEvent.click(screen.getByLabelText('Source'))
    expect(screen.getAllByRole('option')).toHaveLength(3)
    fireEvent.click(screen.getByText('FDA'))
    expect(onChange).toHaveBeenCalledWith('fda')
    expect(screen.queryByRole('option')).toBeNull()
  })

  it('moves the active descendant with ArrowDown', () => {
    render(<Select value="" options={options} onChange={() => {}} ariaLabel="Source" />)
    const trigger = screen.getByLabelText('Source')
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const activeId = trigger.getAttribute('aria-activedescendant')
    expect(activeId).toBeTruthy()
    expect(document.getElementById(activeId!)?.textContent).toBe('FDA')
  })

  it('closes on Escape', () => {
    render(<Select value="" options={options} onChange={() => {}} ariaLabel="Source" />)
    const trigger = screen.getByLabelText('Source')
    fireEvent.click(trigger)
    expect(screen.queryByRole('listbox')).not.toBeNull()
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('disables the trigger and stays closed when disabled', () => {
    const onChange = vi.fn()
    render(<Select value="" options={options} onChange={onChange} ariaLabel="Source" disabled />)
    const trigger = screen.getByLabelText('Source') as HTMLButtonElement
    expect(trigger.disabled).toBe(true)
    fireEvent.click(trigger)
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows counts and skips disabled (zero-result) options in keyboard nav + clicks', () => {
    const onChange = vi.fn()
    const faceted = [
      { value: '', label: 'All' },
      { value: 'fda', label: 'FDA', count: 30 },
      { value: 'usda', label: 'USDA FSIS', count: 0, disabled: true },
    ]
    render(<Select value="" options={faceted} onChange={onChange} ariaLabel="Source" />)
    const trigger = screen.getByLabelText('Source')
    fireEvent.click(trigger)
    expect(screen.getByText('30')).toBeTruthy() // faceted count rendered

    // ArrowDown lands on FDA, then can't advance onto the disabled USDA option.
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    const activeId = trigger.getAttribute('aria-activedescendant')
    expect(document.getElementById(activeId!)?.textContent).toContain('FDA')

    // Clicking the disabled option is a no-op.
    fireEvent.click(screen.getByText('USDA FSIS'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
