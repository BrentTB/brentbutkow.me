import { describe, expect, it } from 'vitest'
import { toBreadcrumbs, toTerminalPath } from './terminal-path'

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
  it('leads with a ~ crumb that links home', () => {
    expect(toBreadcrumbs('/experience', true)[0]).toEqual({
      label: '~',
      href: '/',
      current: false,
    })
  })

  it('gives each segment its cumulative href and marks the last as current', () => {
    expect(toBreadcrumbs('/fun-stuff/games/null-space', true)).toEqual([
      { label: '~', href: '/', current: false },
      { label: 'fun-stuff', href: '/fun-stuff', current: false },
      { label: 'games', href: '/fun-stuff/games', current: false },
      { label: 'null-space', href: '/fun-stuff/games/null-space', current: true },
    ])
  })

  it('keeps every crumb navigable when the last segment is a parent stand-in', () => {
    const crumbs = toBreadcrumbs('/projects/recall-radar', false)
    expect(crumbs.every((crumb) => !crumb.current)).toBe(true)
    expect(crumbs.at(-1)).toEqual({
      label: 'recall-radar',
      href: '/projects/recall-radar',
      current: false,
    })
  })
})
