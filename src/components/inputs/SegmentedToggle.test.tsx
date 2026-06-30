import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SegmentedToggle } from './SegmentedToggle'

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]

describe('SegmentedToggle', () => {
  afterEach(cleanup)

  it('marks the active option pressed and reports the chosen value on click', () => {
    const onChange = vi.fn()
    render(<SegmentedToggle options={options} value="a" onChange={onChange} ariaLabel="Mode" />)
    expect(screen.getByRole('button', { name: 'Alpha' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Beta' }).getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'Beta' }))
    expect(onChange).toHaveBeenCalledWith('b')
  })
})
