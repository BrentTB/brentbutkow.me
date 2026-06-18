import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Combobox } from './Combobox'

const opts = [
  { value: 'CA', label: 'CA' },
  { value: 'NY', label: 'NY' },
  { value: 'TX', label: 'TX' },
]

describe('Combobox', () => {
  afterEach(cleanup)

  it('filters options client-side as you type', () => {
    render(<Combobox value="" options={opts} onChange={vi.fn()} ariaLabel="State" />)
    const input = screen.getByRole('combobox', { name: 'State' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'n' } })
    expect(screen.getByRole('option', { name: 'NY' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'CA' })).toBeNull()
  })

  it('selects an option from the list', () => {
    const onChange = vi.fn()
    render(<Combobox value="" options={opts} onChange={onChange} ariaLabel="State" />)
    fireEvent.focus(screen.getByRole('combobox', { name: 'State' }))
    fireEvent.mouseDown(screen.getByRole('option', { name: 'TX' }))
    expect(onChange).toHaveBeenCalledWith('TX')
  })

  it('emits the typed query for async loaders and leaves the options to the parent', () => {
    const onInputChange = vi.fn()
    render(
      <Combobox
        value=""
        options={opts}
        onChange={vi.fn()}
        ariaLabel="Company"
        onInputChange={onInputChange}
      />
    )
    const input = screen.getByRole('combobox', { name: 'Company' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'acme' } })
    expect(onInputChange).toHaveBeenCalledWith('acme')
    expect(screen.getByRole('option', { name: 'CA' })).toBeTruthy() // not client-filtered
  })

  it('shows status text instead of "No matches" while loading or on error', () => {
    const { rerender } = render(
      <Combobox value="" options={[]} onChange={vi.fn()} ariaLabel="Company" loading />
    )
    fireEvent.focus(screen.getByRole('combobox', { name: 'Company' }))
    expect(screen.getByText('Searching…')).toBeTruthy()

    rerender(<Combobox value="" options={[]} onChange={vi.fn()} ariaLabel="Company" error />)
    expect(screen.getByText('Couldn’t load options')).toBeTruthy()

    rerender(<Combobox value="" options={[]} onChange={vi.fn()} ariaLabel="Company" />)
    expect(screen.getByText('No matches')).toBeTruthy()
  })

  it('mirrors the committed selection when value changes from outside', () => {
    const { rerender } = render(
      <Combobox value="CA" options={opts} onChange={vi.fn()} ariaLabel="State" />
    )
    const input = screen.getByRole('combobox', { name: 'State' }) as HTMLInputElement
    expect(input.value).toBe('CA')
    rerender(<Combobox value="NY" options={opts} onChange={vi.fn()} ariaLabel="State" />)
    expect(input.value).toBe('NY')
  })

  it('clears the current selection', () => {
    const onChange = vi.fn()
    render(<Combobox value="CA" options={opts} onChange={onChange} ariaLabel="State" />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear State' }))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
