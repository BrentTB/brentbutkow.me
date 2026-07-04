import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LocationSelector } from './LocationSelector'
import { RecallCountry } from '../recall.types'
import { countryLabels } from '../data'

// The morph mechanics are covered in MorphTabs.test.tsx. These check the wiring: the country set,
// its labels, and the 'Location' scope naming.
describe('LocationSelector', () => {
  afterEach(cleanup)

  it('renders a tab per country and marks the active one', () => {
    render(<LocationSelector value="us" collapsed={false} onChange={() => {}} />)
    for (const country of Object.values(RecallCountry)) {
      expect(screen.getByRole('button', { name: countryLabels[country] })).toBeTruthy()
    }
    expect(
      screen.getByRole('button', { name: countryLabels.us }).getAttribute('aria-pressed')
    ).toBe('true')
  })

  it('names the collapsed trigger with the location scope', () => {
    render(<LocationSelector value="us" collapsed onChange={() => {}} />)
    expect(screen.getByRole('button', { name: `Location: ${countryLabels.us}` })).toBeTruthy()
  })

  it('reports the chosen country', () => {
    const onChange = vi.fn()
    render(<LocationSelector value="us" collapsed={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: countryLabels.uk }))
    expect(onChange).toHaveBeenCalledWith(RecallCountry.uk)
  })
})
