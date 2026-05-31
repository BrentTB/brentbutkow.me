import { describe, it, expect } from 'vitest'
import { ReactNode } from 'react'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useDocumentTitle } from './useDocumentTitle'

const wrapperFor =
  (path: string) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  )

describe('useDocumentTitle', () => {
  it('sets the document title for a known route', () => {
    renderHook(() => useDocumentTitle(), { wrapper: wrapperFor('/experience') })
    expect(document.title).toBe('Experience — Brent Butkow')
  })

  it('falls back to the 404 title for an unknown path', () => {
    renderHook(() => useDocumentTitle(), { wrapper: wrapperFor('/no-such-page') })
    expect(document.title).toBe('Page not found — Brent Butkow')
  })
})
