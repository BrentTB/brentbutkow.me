import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RecallMap } from './RecallMap'

const byState = [
  { label: 'CA', count: 20 },
  { label: 'TX', count: 5 },
]

describe('RecallMap', () => {
  afterEach(cleanup)

  it('renders a labelled tile per state, including zero-recall states', () => {
    render(<RecallMap byState={byState} activeState="" onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: 'California: 20 recalls' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Texas: 5 recalls' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Wyoming: 0 recalls' })).toBeTruthy()
  })

  it('selects a state on click', () => {
    const onSelect = vi.fn()
    render(<RecallMap byState={byState} activeState="" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: 'California: 20 recalls' }))
    expect(onSelect).toHaveBeenCalledWith('CA')
  })

  it('clears the filter when the active state is clicked again', () => {
    const onSelect = vi.fn()
    render(<RecallMap byState={byState} activeState="CA" onSelect={onSelect} />)
    const california = screen.getByRole('button', { name: 'California: 20 recalls' })
    expect(california.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(california)
    expect(onSelect).toHaveBeenCalledWith('')
  })
})
