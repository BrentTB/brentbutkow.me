import { describe, expect, it } from 'vitest'
import { getRouteFallbackPath } from './BackButton'

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
