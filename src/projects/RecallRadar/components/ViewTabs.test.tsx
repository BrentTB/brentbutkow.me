import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ViewTabs } from './ViewTabs'

const options = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'recalls', label: 'Recalls' },
  { value: 'about', label: 'About' },
]

describe('ViewTabs', () => {
  afterEach(cleanup)

  it('marks the active tab selected and ties it to its panel', () => {
    render(
      <ViewTabs
        ariaLabel="View"
        value="recalls"
        options={options}
        onChange={vi.fn()}
        panelId="panel"
      />
    )
    const active = screen.getByRole('tab', { name: 'Recalls' })
    expect(active.getAttribute('aria-selected')).toBe('true')
    expect(active.getAttribute('aria-controls')).toBe('panel')
    // Only the active tab is in the tab order (roving tabIndex).
    expect(active.getAttribute('tabindex')).toBe('0')
    expect(screen.getByRole('tab', { name: 'Dashboard' }).getAttribute('tabindex')).toBe('-1')
  })

  it('selects a tab on click', () => {
    const onChange = vi.fn()
    render(
      <ViewTabs
        ariaLabel="View"
        value="dashboard"
        options={options}
        onChange={onChange}
        panelId="panel"
      />
    )
    fireEvent.click(screen.getByRole('tab', { name: 'About' }))
    expect(onChange).toHaveBeenCalledWith('about')
  })

  it('moves with arrow keys and wraps at the ends', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ViewTabs
        ariaLabel="View"
        value="dashboard"
        options={options}
        onChange={onChange}
        panelId="panel"
      />
    )
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('recalls')

    // ArrowLeft from the first tab wraps to the last.
    rerender(
      <ViewTabs
        ariaLabel="View"
        value="dashboard"
        options={options}
        onChange={onChange}
        panelId="panel"
      />
    )
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('about')
  })

  it('jumps to the first and last tab with Home and End', () => {
    const onChange = vi.fn()
    render(
      <ViewTabs
        ariaLabel="View"
        value="recalls"
        options={options}
        onChange={onChange}
        panelId="panel"
      />
    )
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('about')
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith('dashboard')
  })
})
