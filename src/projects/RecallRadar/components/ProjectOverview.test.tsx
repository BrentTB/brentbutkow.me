import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ProjectOverview } from './ProjectOverview'

describe('ProjectOverview', () => {
  afterEach(cleanup)

  it('leads with a plain-language summary and tucks the technical detail behind a toggle', () => {
    render(<ProjectOverview />)
    // Plain summary is visible up front (no ML jargon).
    expect(screen.getByText(/Every day we pull the latest food recalls/)).toBeTruthy()
    // The technical points sit inside a collapsible <details> labelled for expansion.
    const toggle = screen.getByText('The technical detail')
    expect(toggle.tagName.toLowerCase()).toBe('summary')
    expect(toggle.closest('details')).not.toBeNull()
  })
})
