import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BreakdownList } from './Breakdowns'

const rows = [
  { label: 'All states', value: '', count: 10 },
  { label: 'California', value: 'CA', count: 7 },
]

describe('BreakdownList', () => {
  afterEach(cleanup)

  it('marks no row active when the active value is empty, even if a row carries an empty value', () => {
    // Regression: with no filter set (activeValue ''), a row whose value is '' must not light up
    // the whole list via '' === ''. Guarded by `activeValue !== '' && row.value === activeValue`.
    render(<BreakdownList title="Top states" rows={rows} activeValue="" onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: /All states/ }).getAttribute('aria-pressed')).toBe(
      'false'
    )
    expect(screen.getByRole('button', { name: /California/ }).getAttribute('aria-pressed')).toBe(
      'false'
    )
  })

  it('marks only the matching row active when a non-empty value is selected', () => {
    render(<BreakdownList title="Top states" rows={rows} activeValue="CA" onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: /California/ }).getAttribute('aria-pressed')).toBe(
      'true'
    )
    expect(screen.getByRole('button', { name: /All states/ }).getAttribute('aria-pressed')).toBe(
      'false'
    )
  })

  it('toggles the filter off when an already-active row is re-clicked', () => {
    const onSelect = vi.fn()
    render(<BreakdownList title="Top states" rows={rows} activeValue="CA" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /California/ }))
    expect(onSelect).toHaveBeenCalledWith('')
  })
})
