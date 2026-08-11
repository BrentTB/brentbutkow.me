import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LabelledRow } from './LabelledRow'

afterEach(cleanup)

const renderRow = (props: Partial<Parameters<typeof LabelledRow>[0]> = {}) =>
  render(
    <MemoryRouter>
      <LabelledRow
        label="Dashboard"
        title="Recall Radar"
        description="A live food-recall dashboard"
        href="/projects/recall-radar"
        internal
        {...props}
      />
    </MemoryRouter>
  )

describe('LabelledRow', () => {
  it('reads out the kind label before the title', () => {
    renderRow()
    const text = screen.getByRole('link').textContent ?? ''
    expect(text.indexOf('Dashboard')).toBeGreaterThanOrEqual(0)
    expect(text.indexOf('Dashboard')).toBeLessThan(text.indexOf('Recall Radar'))
  })

  it('links to the href it is given, untouched', () => {
    renderRow()
    expect(screen.getByRole('link').getAttribute('href')).toBe('/projects/recall-radar')
  })

  it('shows the count only on a hub row', () => {
    renderRow({ hub: '4 games' })
    expect(screen.getByRole('link').textContent).toContain('4 games')

    cleanup()
    renderRow()
    expect(screen.getByRole('link').textContent).not.toContain('4 games')
  })

  it('renders a plain row, not a link, without an href', () => {
    renderRow({ href: undefined })
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Recall Radar')).toBeTruthy()
  })
})
