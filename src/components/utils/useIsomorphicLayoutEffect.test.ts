import { useEffect, useLayoutEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('useIsomorphicLayoutEffect', () => {
  it('is useLayoutEffect in the browser', async () => {
    const { useIsomorphicLayoutEffect } = await import('./useIsomorphicLayoutEffect')
    expect(useIsomorphicLayoutEffect).toBe(useLayoutEffect)
  })

  it('is useEffect where there is no document (prerender)', async () => {
    vi.resetModules()
    vi.stubGlobal('document', undefined)
    const { useIsomorphicLayoutEffect } = await import('./useIsomorphicLayoutEffect')
    expect(useIsomorphicLayoutEffect).toBe(useEffect)
  })
})
