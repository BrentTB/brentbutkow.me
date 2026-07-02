import { describe, expect, it } from 'vitest'
import { renderRouteHtml } from './prerender-plugin'
import { DEFAULT_OG_IMAGE, RouteMeta, SITE_URL } from '../src/routes/routes.meta'

const TEMPLATE = `<!doctype html>
<html>
  <head>
    <title>placeholder</title>
    <meta name="description" content="placeholder" />
    <link rel="canonical" href="placeholder" />
    <meta property="og:url" content="placeholder" />
    <meta property="og:title" content="placeholder" />
    <meta property="og:description" content="placeholder" />
    <meta property="og:image" content="placeholder" />
    <meta property="og:image:alt" content="placeholder" />
    <meta name="twitter:title" content="placeholder" />
    <meta name="twitter:description" content="placeholder" />
    <meta name="twitter:image" content="placeholder" />
  </head>
  <body></body>
</html>`

const baseMeta: RouteMeta = {
  title: 'Test Page',
  description: 'A test description.',
}

describe('renderRouteHtml', () => {
  it('replaces title, description, and every og/twitter tag', () => {
    const html = renderRouteHtml(TEMPLATE, '/projects', baseMeta)
    expect(html).toContain('<title>Test Page</title>')
    expect(html).toContain('<meta name="description" content="A test description." />')
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/projects" />`)
    expect(html).toContain(`<meta property="og:url" content="${SITE_URL}/projects" />`)
    expect(html).toContain('<meta property="og:title" content="Test Page" />')
    expect(html).toContain('<meta property="og:image:alt" content="Test Page" />')
    expect(html).toContain('<meta name="twitter:title" content="Test Page" />')
    // No placeholders survive the rewrite.
    expect(html).not.toContain('content="placeholder"')
  })

  it('canonicalizes the home path with a trailing slash', () => {
    const html = renderRouteHtml(TEMPLATE, '/', baseMeta)
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/" />`)
  })

  it('uses the route ogImage when present, else the site default', () => {
    const withImage = renderRouteHtml(TEMPLATE, '/x', { ...baseMeta, ogImage: '/og/x.png' })
    expect(withImage).toContain(`<meta property="og:image" content="${SITE_URL}/og/x.png" />`)

    const withoutImage = renderRouteHtml(TEMPLATE, '/x', baseMeta)
    expect(withoutImage).toContain(
      `<meta property="og:image" content="${SITE_URL}${DEFAULT_OG_IMAGE}" />`
    )
  })

  it('escapes HTML-special characters in title and description', () => {
    const html = renderRouteHtml(TEMPLATE, '/x', {
      title: 'A & B <script>',
      description: 'quote " and <tag>',
    })
    expect(html).toContain('<title>A &amp; B &lt;script&gt;</title>')
    expect(html).toContain('content="quote &quot; and &lt;tag&gt;"')
  })

  it('injects a noindex robots tag only when noindex is set', () => {
    const noindexed = renderRouteHtml(TEMPLATE, '/admin', { ...baseMeta, noindex: true })
    expect(noindexed).toContain('<meta name="robots" content="noindex, nofollow" />')

    const indexed = renderRouteHtml(TEMPLATE, '/x', baseMeta)
    expect(indexed).not.toContain('name="robots"')
  })

  it('emits JSON-LD and neutralizes a nested closing script tag', () => {
    const html = renderRouteHtml(TEMPLATE, '/x', {
      ...baseMeta,
      jsonLd: { '@type': 'Thing', evil: '</script>' },
    })
    expect(html).toContain('<script type="application/ld+json">')
    expect(html).toContain('<\\/script>')
    expect(html).not.toContain('evil":"</script>')
  })

  it('throws if the template is missing a tag it must replace', () => {
    const broken = TEMPLATE.replace('<title>placeholder</title>', '')
    expect(() => renderRouteHtml(broken, '/x', baseMeta)).toThrow(/title tag not found/)
  })
})
