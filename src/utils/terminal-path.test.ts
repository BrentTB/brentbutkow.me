import { describe, expect, it } from 'vitest'
import { getRouteFallbackPath, toBreadcrumbs, toTerminalPath } from './terminal-path'

describe('toTerminalPath', () => {
  it('maps the site root to ~', () => {
    expect(toTerminalPath('/')).toBe('~')
  })

  it('prefixes a top-level path with ~', () => {
    expect(toTerminalPath('/experience')).toBe('~/experience')
  })

  it('keeps nested segments intact', () => {
    expect(toTerminalPath('/fun-stuff/games/null-space')).toBe('~/fun-stuff/games/null-space')
  })

  it('drops a trailing slash so it never renders ~/experience/', () => {
    expect(toTerminalPath('/experience/')).toBe('~/experience')
  })
})

describe('toBreadcrumbs', () => {
  it('links ~ and every ancestor, leaving the last segment as the current page', () => {
    expect(toBreadcrumbs('/fun-stuff/games/null-space')).toEqual([
      { label: '~', href: '/', linkable: true, current: false },
      { label: 'fun-stuff', href: '/fun-stuff', linkable: true, current: false },
      { label: 'games', href: '/fun-stuff/games', linkable: true, current: false },
      { label: 'null-space', href: '/fun-stuff/games/null-space', linkable: false, current: true },
    ])
  })

  it('stops linking past linkableThrough so page-less tail segments are plain text', () => {
    const crumbs = toBreadcrumbs('/projects/recall-radar/fda/H-1078-2026', '/projects/recall-radar')
    const byLabel = Object.fromEntries(crumbs.map((c) => [c.label, c]))
    expect(byLabel['recall-radar'].linkable).toBe(true)
    expect(byLabel['fda'].linkable).toBe(false)
    expect(byLabel['fda'].current).toBe(false)
    expect(byLabel['H-1078-2026']).toMatchObject({ linkable: false, current: true })
  })
})

describe('getRouteFallbackPath', () => {
  it('returns the parent route for nested paths', () => {
    expect(getRouteFallbackPath('/pages/test/5')).toBe('/pages/test')
    expect(getRouteFallbackPath('/pages/test')).toBe('/pages')
    expect(getRouteFallbackPath('/pages')).toBe('/')
  })

  it('returns undefined for root', () => {
    expect(getRouteFallbackPath('/')).toBeUndefined()
  })
})
