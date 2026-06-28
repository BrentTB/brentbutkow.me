import { describe, it, expect } from 'vitest'
import { routes } from './routes.config'
import { routePaths } from './routes.paths'

describe('routes config', () => {
  it('has unique paths', () => {
    const paths = routes.map((route) => route.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('gives every indexable route a document title', () => {
    for (const route of routes.filter((route) => !route.redirect)) {
      expect(route.title, `route ${route.path} is missing a title`).toBeTruthy()
    }
  })

  it('gives every indexable route a meta description', () => {
    for (const route of routes.filter((route) => !route.redirect)) {
      expect(route.description, `route ${route.path} is missing a description`).toBeTruthy()
    }
  })

  it('redirect routes carry no title or description', () => {
    for (const route of routes.filter((route) => route.redirect)) {
      expect(route.title).toBeUndefined()
      expect(route.description).toBeUndefined()
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
