import { describe, it, expect } from 'vitest'
import { routes, routePaths } from './routes.config'

describe('routes config', () => {
  it('has unique paths', () => {
    const paths = routes.map((route) => route.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('gives every route a document title', () => {
    for (const route of routes) {
      expect(route.title, `route ${route.path} is missing a title`).toBeTruthy()
    }
  })

  it('labels every route shown in the navbar', () => {
    const navRoutes = routes.filter((route) => !route.dontShowInNavbar)
    expect(navRoutes.length).toBeGreaterThan(0)
    for (const route of navRoutes) {
      expect(route.label, `nav route ${route.path} is missing a label`).toBeTruthy()
    }
  })

  it('includes a catch-all 404 route', () => {
    expect(routes.some((route) => route.path === routePaths.notFound)).toBe(true)
  })
})
