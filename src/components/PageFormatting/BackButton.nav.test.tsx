import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

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

// jsdom has no referrer and a history length of 1, so shouldNavigateBack() is false and the click
// always takes the fallback branch — exactly the off-site case the fallback exists to handle.
describe('BackButton fallback navigation', () => {
  afterEach(() => {
    cleanup()
    navigateMock.mockReset()
  })

  it('uses the explicit fallbackPath rather than stripping a single segment', () => {
    renderAt('/projects/recall-radar/uk/FSA-PRIN-13-2019', '/projects/recall-radar')
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(navigateMock).toHaveBeenCalledWith('/projects/recall-radar')
  })

  it('falls back to the parent route when no fallbackPath is given', () => {
    renderAt('/projects/recall-radar')
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }))
    expect(navigateMock).toHaveBeenCalledWith('/projects')
  })
})
