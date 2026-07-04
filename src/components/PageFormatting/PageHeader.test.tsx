import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { PageHeader } from './PageHeader'

afterEach(cleanup)

function renderAt(pathname: string, props: Partial<Parameters<typeof PageHeader>[0]> = {}) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <PageHeader title="Null Space" {...props} />
    </MemoryRouter>
  )
}

describe('PageHeader breadcrumb', () => {
  it('links every ancestor segment to its cumulative path', () => {
    renderAt('/fun-stuff/games/null-space')
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: '~' })).toHaveProperty(
      'pathname',
      '/'
    )
    expect(within(nav).getByRole('link', { name: 'fun-stuff' })).toHaveProperty(
      'pathname',
      '/fun-stuff'
    )
    expect(within(nav).getByRole('link', { name: 'games' })).toHaveProperty(
      'pathname',
      '/fun-stuff/games'
    )
  })

  it('renders the current segment as plain text, not a link', () => {
    renderAt('/fun-stuff/games/null-space')
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).queryByRole('link', { name: 'null-space' })).toBeNull()
    const current = within(nav).getByText('null-space')
    expect(current.getAttribute('aria-current')).toBe('page')
  })

  it('keeps every crumb a link when an override path stands in for a parent', () => {
    renderAt('/projects/recall-radar/uk/FSA-1', { path: '/projects/recall-radar' })
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'recall-radar' })).toBeTruthy()
    expect(nav.querySelector('[aria-current="page"]')).toBeNull()
  })

  it('shows the back arrow only when requested', () => {
    const { rerender } = renderAt('/fun-stuff/games')
    expect(screen.queryByRole('button')).toBeNull()
    rerender(
      <MemoryRouter initialEntries={['/fun-stuff/games']}>
        <PageHeader title="Games" showBackButton />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: 'Back to Fun Stuff' })).toBeTruthy()
  })
})
