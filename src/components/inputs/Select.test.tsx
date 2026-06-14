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
})
