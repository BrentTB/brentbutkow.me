import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { clearVisitedHistory, recordVisit } from '../../routes/navigation-history'

const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

import { BackButton } from './BackButton'

const renderAt = (path: string, fallbackPath?: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BackButton fallbackPath={fallbackPath} />
    </MemoryRouter>
  )

const setHistoryIndex = (idx: number | null) =>
  Object.defineProperty(window.history, 'state', {
    configurable: true,
    value: idx === null ? null : { idx },
  })

describe('BackButton navigation', () => {
  afterEach(() => {
    cleanup()
    navigateMock.mockReset()
    clearVisitedHistory()
    setHistoryIndex(null)
  })

  it('uses the explicit fallbackPath rather than stripping a single segment', () => {
    renderAt('/projects/recall-radar/uk/FSA-PRIN-13-2019', '/projects/recall-radar')
    const button = screen.getByRole('button', { name: 'Back to Recall Radar' })
    fireEvent.click(button)
    expect(navigateMock).toHaveBeenCalledWith('/projects/recall-radar')
  })

  it('falls back to the parent route when no fallbackPath is given', () => {
    renderAt('/projects/recall-radar')
    const button = screen.getByRole('button', { name: 'Back to Projects' })
    fireEvent.click(button)
    expect(navigateMock).toHaveBeenCalledWith('/projects')
  })

  it('labels a fun-stuff subpage back button with the section name', () => {
    renderAt('/fun-stuff/gulag-sort')
    const button = screen.getByRole('button', { name: 'Back to Fun Stuff' })
    fireEvent.click(button)
    expect(navigateMock).toHaveBeenCalledWith('/fun-stuff')
  })

  it('falls back to a generic "Back" label when the destination has no registered name', () => {
    renderAt('/contact/details')
    const button = screen.getByRole('button', { name: 'Go back' })
    fireEvent.click(button)
    expect(navigateMock).toHaveBeenCalledWith('/contact')
  })

  it('steps back through history when the previous entry is the structural parent', () => {
    // Arrived at the detail page from the dashboard, so the previous history entry is the parent.
    setHistoryIndex(0)
    recordVisit('/projects/recall-radar')
    setHistoryIndex(1)

    renderAt('/projects/recall-radar/uk/FSA-PRIN-13-2019', '/projects/recall-radar')
    fireEvent.click(screen.getByRole('button', { name: 'Back to Recall Radar' }))
    // navigate(-1) restores the dashboard's query string and scroll, rather than a fresh load.
    expect(navigateMock).toHaveBeenCalledWith(-1)
  })
})
