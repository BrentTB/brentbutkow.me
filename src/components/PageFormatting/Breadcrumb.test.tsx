import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

const previousVisitedPathMock = vi.fn<() => string | undefined>()
vi.mock('../../routes/navigation-history', () => ({
  previousVisitedPath: () => previousVisitedPathMock(),
}))

import { Breadcrumb } from './Breadcrumb'

const renderAt = (path: string, parentPath?: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Breadcrumb parentPath={parentPath} />
    </MemoryRouter>
  )

afterEach(() => {
  cleanup()
  navigateMock.mockReset()
  previousVisitedPathMock.mockReset()
})

describe('Breadcrumb', () => {
  it('links every ancestor and leaves the current segment as plain text', () => {
    renderAt('/fun-stuff/games/null-space')
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: '~' })).toHaveProperty('pathname', '/')
    expect(within(nav).getByRole('link', { name: 'games' })).toHaveProperty(
      'pathname',
      '/fun-stuff/games'
    )
    expect(within(nav).queryByRole('link', { name: 'null-space' })).toBeNull()
    expect(within(nav).getByText('null-space').getAttribute('aria-current')).toBe('page')
  })

  it('leaves page-less tail segments unlinked when parentPath is set', () => {
    renderAt('/projects/recall-radar/fda/H-1078-2026', '/projects/recall-radar')
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'recall-radar' })).toBeTruthy()
    expect(within(nav).queryByRole('link', { name: 'fda' })).toBeNull()
    expect(within(nav).queryByRole('link', { name: 'H-1078-2026' })).toBeNull()
  })

  it('steps back through history when the previous entry is the back target', () => {
    previousVisitedPathMock.mockReturnValue('/projects/recall-radar')
    renderAt('/projects/recall-radar/fda/H-1078-2026', '/projects/recall-radar')
    fireEvent.click(screen.getByRole('link', { name: 'recall-radar' }))
    // navigate(-1) restores the dashboard's query string and scroll rather than a fresh load.
    expect(navigateMock).toHaveBeenCalledWith(-1)
  })

  it('lets the back-target link navigate fresh when it is not the previous entry', () => {
    previousVisitedPathMock.mockReturnValue('/somewhere-else')
    renderAt('/fun-stuff/gulag-sort')
    fireEvent.click(screen.getByRole('link', { name: 'fun-stuff' }))
    // Link handles navigation; the click handler must not intercept with navigate(-1).
    expect(navigateMock).not.toHaveBeenCalledWith(-1)
  })
})
