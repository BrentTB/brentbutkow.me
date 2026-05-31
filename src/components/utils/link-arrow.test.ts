import { describe, it, expect } from 'vitest'
import { getLinkArrow } from './link-arrow'

describe('getLinkArrow', () => {
  it('returns the internal arrow for internal routes', () => {
    expect(getLinkArrow(true)).toBe('→')
  })

  it('returns the external arrow for external links', () => {
    expect(getLinkArrow(false)).toBe('↗')
  })

  it('treats an undefined target as external', () => {
    expect(getLinkArrow()).toBe('↗')
  })
})
