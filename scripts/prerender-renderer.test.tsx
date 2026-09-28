import { describe, expect, it } from 'vitest'
import { prerenderPage, renderRoute } from './prerender-renderer'
import { buildStylesheetIndex } from './prerender-html'
import { routePaths } from '../src/routes/routes.paths'

const TEMPLATE = '<html><head></head><body><div id="root"></div></body></html>'

describe('renderRoute', () => {
  it('renders project links into server HTML', async () => {
    const html = await renderRoute(routePaths.projects)

    expect(html).toContain('Nimble Toolbox')
    expect(html).toContain('https://nimbletoolbox.com')
  })
})

describe('prerenderPage', () => {
  it('renders an indexable route into the root', async () => {
    const html = await prerenderPage(TEMPLATE, routePaths.projects, buildStylesheetIndex([]))
    expect(html).toContain('Nimble Toolbox')
  })

  it('leaves a noindex route’s root empty', async () => {
    const html = await prerenderPage(TEMPLATE, routePaths.admin, buildStylesheetIndex([]))
    expect(html).toBe(TEMPLATE)
  })
})
