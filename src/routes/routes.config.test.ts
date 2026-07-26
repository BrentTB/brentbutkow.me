import { describe, it, expect } from 'vitest'
import { routes } from './routes.config'
import { routePaths } from './routes.paths'
import { browsableRoutePaths, routesMeta } from './routes.meta'
import { gamesSubRoutes } from '../pages/FunStuff/subpages/Games/data'

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

describe('browsableRoutePaths', () => {
  it('lists every page that is indexable, real and static', () => {
    // What the home terminal browses and what the sitemap covers, from one derivation rather than three
    // hand-kept copies. It was a hand-kept copy in the terminal, and the pixel world shipped missing.
    for (const [path, meta] of Object.entries(routesMeta)) {
      const browsable = browsableRoutePaths.includes(path)
      const shouldBe = !meta.noindex && path !== routePaths.notFound && !path.includes(':')
      expect(browsable, `${path} browsable=${browsable}, expected ${shouldBe}`).toBe(shouldBe)
    }
  })

  it('holds out the pages nobody navigates to', () => {
    expect(browsableRoutePaths).not.toContain(routePaths.admin)
    expect(browsableRoutePaths).not.toContain(routePaths.notFound)
    expect(browsableRoutePaths).not.toContain(routePaths.recallRadarConfirm)
  })

  it('carries every route in the table that a visitor can open', () => {
    expect(browsableRoutePaths).toContain(routePaths.home)
    expect(browsableRoutePaths).toContain(routePaths.contact)
    // The game that exposed the stale list.
    expect(
      browsableRoutePaths.some((path) => path.endsWith(gamesSubRoutes.pixelWorldSimulator))
    ).toBe(true)
  })

  it('reads in the order the routes are declared, so the tree and sitemap agree', () => {
    const declared = Object.keys(routesMeta).filter((path) => browsableRoutePaths.includes(path))
    expect([...browsableRoutePaths]).toEqual(declared)
  })
})
