import { describe, expect, it } from 'vitest'
import { toTerminalPath } from './terminal-path'

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
