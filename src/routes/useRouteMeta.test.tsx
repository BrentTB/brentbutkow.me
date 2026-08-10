import { describe, it, expect } from 'vitest'
import { ReactNode } from 'react'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useRouteMeta } from './useRouteMeta'

const wrapperFor =
  (path: string) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  )

const headContent = (selector: string, attr: string) =>
  document.head.querySelector(selector)?.getAttribute(attr)

describe('useRouteMeta', () => {
  it('sets the document title for a known route', () => {
    renderHook(() => useRouteMeta(), { wrapper: wrapperFor('/experience') })
    expect(document.title).toBe('[Local] Experience — Brent Butkow')
  })

  it('sets the meta description from the route config', () => {
    renderHook(() => useRouteMeta(), { wrapper: wrapperFor('/projects/recall-radar') })
    expect(headContent('meta[name="description"]', 'content')).toContain(
      'Track the latest food recalls'
    )
  })

  it('uses a self-referencing canonical and og:url per path', () => {
    renderHook(() => useRouteMeta(), { wrapper: wrapperFor('/projects/recall-radar') })
    expect(headContent('link[rel="canonical"]', 'href')).toBe(
      'https://brentbutkow.me/projects/recall-radar'
    )
    expect(headContent('meta[property="og:url"]', 'content')).toBe(
      'https://brentbutkow.me/projects/recall-radar'
    )
  })

  it('matches dynamic routes by pattern instead of falling back to 404', () => {
    renderHook(() => useRouteMeta(), { wrapper: wrapperFor('/projects/recall-radar/fda/F-1234-5') })
    expect(document.title).toBe('[Local] Recall — Recall Radar')
    expect(headContent('link[rel="canonical"]', 'href')).toBe(
      'https://brentbutkow.me/projects/recall-radar/fda/F-1234-5'
    )
  })

  it('marks a noindex route as noindex, nofollow and a normal route as index, follow', () => {
    renderHook(() => useRouteMeta(), { wrapper: wrapperFor('/admin') })
    expect(headContent('meta[name="robots"]', 'content')).toBe('noindex, nofollow')

    renderHook(() => useRouteMeta(), { wrapper: wrapperFor('/experience') })
    expect(headContent('meta[name="robots"]', 'content')).toBe('index, follow')
  })

  it('uses the route-specific og:image and falls back to the site image elsewhere', () => {
    renderHook(() => useRouteMeta(), { wrapper: wrapperFor('/projects/recall-radar') })
    expect(headContent('meta[property="og:image"]', 'content')).toBe(
      'https://brentbutkow.me/og/recall-radar.png'
    )
    expect(headContent('meta[name="twitter:image"]', 'content')).toBe(
      'https://brentbutkow.me/og/recall-radar.png'
    )

    // Every indexable page now has a card of its own, enforced by site-invariants. The fallback is for
    // the routes that will never have one: a dynamic detail page cannot be drawn ahead of time.
    renderHook(() => useRouteMeta(), { wrapper: wrapperFor('/projects/recall-radar/fda/F-1234-5') })
    expect(headContent('meta[property="og:image"]', 'content')).toBe(
      'https://brentbutkow.me/og-image.png'
    )
  })

  it('falls back to the 404 title and canonicalizes an unknown path to home', () => {
    renderHook(() => useRouteMeta(), { wrapper: wrapperFor('/no-such-page') })
    expect(document.title).toBe('[Local] Page not found — Brent Butkow')
    expect(headContent('link[rel="canonical"]', 'href')).toBe('https://brentbutkow.me/')
    expect(headContent('meta[property="og:url"]', 'content')).toBe('https://brentbutkow.me/')
  })
})
