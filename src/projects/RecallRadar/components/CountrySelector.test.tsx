import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CountrySelector } from './CountrySelector'

describe('CountrySelector', () => {
  afterEach(cleanup)

  it('renders both countries and marks the active one', () => {
    render(<CountrySelector value="us" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'United States' }).getAttribute('aria-pressed')).toBe(
      'true'
    )
    expect(
      screen.getByRole('button', { name: 'United Kingdom' }).getAttribute('aria-pressed')
    ).toBe('false')
  })

  it('reports the chosen country', () => {
    const onChange = vi.fn()
    render(<CountrySelector value="us" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'United Kingdom' }))
    expect(onChange).toHaveBeenCalledWith('uk')
  })
})
