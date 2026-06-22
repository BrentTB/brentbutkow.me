import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SectionNav } from './SectionNav'

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'trends', label: 'Trends' },
  { id: 'recalls', label: 'Recalls' },
]

describe('SectionNav', () => {
  afterEach(cleanup)

  it('renders a same-page hash link per section', () => {
    render(<SectionNav sections={sections} />)
    expect(screen.getByRole('link', { name: 'Overview' }).getAttribute('href')).toBe('#overview')
    expect(screen.getByRole('link', { name: 'Trends' }).getAttribute('href')).toBe('#trends')
    expect(screen.getByRole('link', { name: 'Recalls' }).getAttribute('href')).toBe('#recalls')
  })

  it('marks a clicked link as the current section', () => {
    render(<SectionNav sections={sections} />)
    const trends = screen.getByRole('link', { name: 'Trends' })
    fireEvent.click(trends)
    expect(trends.getAttribute('aria-current')).toBe('true')
  })
})
