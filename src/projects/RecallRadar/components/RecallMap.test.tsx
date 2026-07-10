import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RecallMap } from './RecallMap'
import { STATE_GRID_COLS, STATE_GRID_ROWS, stateGrid } from '../us-state-grid'
import { EU_GRID_COLS, EU_GRID_ROWS, euCountryGrid } from '../eu-country-grid'

const byState = [
  { label: 'CA', count: 20 },
  { label: 'TX', count: 5 },
]

const byAffectedCountry = [
  { label: 'DE', count: 12 },
  { label: 'IE', count: 3 },
]

const renderUs = (props: Partial<Parameters<typeof RecallMap>[0]> = {}) =>
  render(
    <RecallMap
      tiles={stateGrid}
      rows={STATE_GRID_ROWS}
      cols={STATE_GRID_COLS}
      ariaLabel="US food recalls by state"
      counts={byState}
      activeCode=""
      onSelect={() => {}}
      {...props}
    />
  )

describe('RecallMap', () => {
  afterEach(cleanup)

  it('renders a labelled tile per state, including zero-recall states', () => {
    renderUs()
    expect(screen.getByRole('button', { name: 'California: 20 recalls' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Texas: 5 recalls' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Wyoming: 0 recalls' })).toBeTruthy()
  })

  it('carries the tooltip as data-tooltip, never the delayed native title', () => {
    renderUs()
    const tile = screen.getByRole('button', { name: 'California: 20 recalls' })
    // The CSS ::after reads data-tooltip for an instant hover tooltip; a native title would sit
    // behind the browser's fixed ~1s hover delay (and double-announce for screen readers).
    expect(tile.getAttribute('data-tooltip')).toBe('California: 20 recalls')
    expect(tile.hasAttribute('title')).toBe(false)
  })

  it('selects a state on click', () => {
    const onSelect = vi.fn()
    renderUs({ onSelect })
    fireEvent.click(screen.getByRole('button', { name: 'California: 20 recalls' }))
    expect(onSelect).toHaveBeenCalledWith('CA')
  })

  it('clears the filter when the active state is clicked again', () => {
    const onSelect = vi.fn()
    renderUs({ onSelect, activeCode: 'CA' })
    const california = screen.getByRole('button', { name: 'California: 20 recalls' })
    expect(california.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(california)
    expect(onSelect).toHaveBeenCalledWith('')
  })

  it('renders the EU country grid with the same interaction model', () => {
    const onSelect = vi.fn()
    render(
      <RecallMap
        tiles={euCountryGrid}
        rows={EU_GRID_ROWS}
        cols={EU_GRID_COLS}
        ariaLabel="EU food recalls by country"
        counts={byAffectedCountry}
        activeCode=""
        onSelect={onSelect}
      />
    )
    expect(screen.getByRole('group', { name: 'EU food recalls by country' })).toBeTruthy()
    // A tile per grid entry, zero-count ones included (Malta has no recalls in the fixture).
    expect(screen.getAllByRole('button')).toHaveLength(euCountryGrid.length)
    expect(screen.getByRole('button', { name: 'Germany: 12 recalls' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Malta: 0 recalls' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ireland: 3 recalls' }))
    expect(onSelect).toHaveBeenCalledWith('IE')
  })
})
