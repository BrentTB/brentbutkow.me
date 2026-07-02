// Vite build plugin: emits a static index.html per route with that route's title, description,
// canonical, Open Graph/Twitter tags, robots directive, and JSON-LD. Vercel serves these files
// before the SPA rewrite kicks in, so crawlers and social scrapers (which don't run JS) see
// route-specific metadata instead of the home-page shell. The app still hydrates normally.
//
// Route metadata comes from src/routes/routes.meta.ts — a pure data module, so importing it
// here doesn't drag React or SCSS into the build config.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import { routesMeta, RouteMeta, SITE_URL, DEFAULT_OG_IMAGE } from '../src/routes/routes.meta'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** Replaces the first match of `pattern`, throwing if the template doesn't contain it. */
function setTag(html: string, label: string, pattern: RegExp, replacement: string): string {
  if (!pattern.test(html)) throw new Error(`prerender: ${label} tag not found in index.html`)
  return html.replace(pattern, replacement)
}

export function renderRouteHtml(template: string, path: string, meta: RouteMeta): string {
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)
  const canonical = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`
  const ogImage = `${SITE_URL}${meta.ogImage ?? DEFAULT_OG_IMAGE}`

  let html = template
  html = setTag(html, 'title', /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
  html = setTag(
    html,
    'description',
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${description}" />`
  )
  html = setTag(
    html,
    'canonical',
    /<link\s+rel="canonical"[\s\S]*?\/>/,
    `<link rel="canonical" href="${canonical}" />`
  )
  const properties: Record<string, string> = {
    'og:url': canonical,
    'og:title': title,
    'og:description': description,
    'og:image': ogImage,
    'og:image:alt': title,
  }
  for (const [property, value] of Object.entries(properties)) {
    html = setTag(
      html,
      property,
      new RegExp(`<meta\\s+property="${property}"[\\s\\S]*?/>`),
      `<meta property="${property}" content="${value}" />`
    )
  }
  const names: Record<string, string> = {
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': ogImage,
  }
  for (const [name, value] of Object.entries(names)) {
    html = setTag(
      html,
      name,
      new RegExp(`<meta\\s+name="${name}"[\\s\\S]*?/>`),
      `<meta name="${name}" content="${value}" />`
    )
  }

  const extras: string[] = []
  if (meta.noindex) extras.push('<meta name="robots" content="noindex, nofollow" />')
  if (meta.jsonLd) {
    // </script> inside a JSON string would close the tag early; escape the slash defensively.
    const jsonLd = JSON.stringify(meta.jsonLd).replaceAll('</', '<\\/')
    extras.push(`<script type="application/ld+json">${jsonLd}</script>`)
  }
  if (extras.length > 0) html = html.replace('</head>', `    ${extras.join('\n    ')}\n  </head>`)

  return html
}

export function prerenderMeta(): Plugin {
  return {
    name: 'prerender-meta',
    apply: 'build',
    closeBundle() {
      const outDir = 'dist'
      const template = readFileSync(join(outDir, 'index.html'), 'utf8')
      let emitted = 0
      for (const [path, meta] of Object.entries(routesMeta)) {
        // Dynamic and catch-all routes have no single URL to prerender.
        if (path.includes(':') || path === '*') continue
        const html = renderRouteHtml(template, path, meta)
        const dir = path === '/' ? outDir : join(outDir, path)
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'index.html'), html)
        emitted++
      }
      console.log(`prerender-meta: emitted ${emitted} route pages`)
    },
  }
}
