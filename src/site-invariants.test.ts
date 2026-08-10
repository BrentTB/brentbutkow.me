import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { browsableRoutePaths, DEFAULT_OG_IMAGE, routesMeta, SITE_URL } from './routes/routes.meta'
import { routePaths } from './routes/routes.paths'

// Repo-wide invariants that have each shipped broken at least once:

const srcDir = dirname(fileURLToPath(import.meta.url))
const rootDir = join(srcDir, '..')
const publicDir = join(rootDir, 'public')
const skillsDir = join(rootDir, '.claude', 'skills')

function filesUnder(dir: string, matches: (name: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return filesUnder(path, matches)
    return matches(name) ? [path] : []
  })
}

const sourceFiles = (dir: string) =>
  filesUnder(dir, (name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))

const files = sourceFiles(srcDir)

describe('site invariants', () => {
  it('every root-absolute asset path referenced in src exists in public/', () => {
    const assetRef =
      /['"`](\/[\w\-/.]+\.(?:pdf|png|jpe?g|svg|webp|avif|gif|ico|txt|xml|mp4|webm))['"`]/g
    const missing: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(assetRef)) {
        const asset = match[1]
        if (!existsSync(join(publicDir, asset))) {
          missing.push(`${file.slice(srcDir.length + 1)} → ${asset}`)
        }
      }
    }
    expect(missing, `referenced assets missing from public/:\n${missing.join('\n')}`).toEqual([])
  })

  it('every import.meta.env variable is VITE_-prefixed or a Vite built-in', () => {
    const builtIns = new Set(['MODE', 'DEV', 'PROD', 'SSR', 'BASE_URL'])
    const envRef = /import\.meta\.env\.(\w+)/g
    const invalid: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(envRef)) {
        const name = match[1]
        if (!name.startsWith('VITE_') && !builtIns.has(name)) {
          invalid.push(`${file.slice(srcDir.length + 1)} → ${name}`)
        }
      }
    }
    expect(
      invalid,
      `env vars Vite won't expose to the client (missing VITE_ prefix):\n${invalid.join('\n')}`
    ).toEqual([])
  })

  it('every indexable route is in sitemap.xml (hand-maintained — the easy step to forget)', () => {
    const sitemap = readFileSync(join(publicDir, 'sitemap.xml'), 'utf8')
    const listed = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))
    // The same derived list the home terminal browses, so the sitemap and the site's own idea of its pages
    // cannot disagree.
    const indexable = browsableRoutePaths.map((path) => `${SITE_URL}${path}`)
    const missing = indexable.filter((url) => !listed.has(url))
    expect(
      missing,
      `indexable routes missing from public/sitemap.xml:\n${missing.join('\n')}`
    ).toEqual([])
  })

  it('every indexable route has a social card of its own', () => {
    /**
     * Without its own card a page falls back to the home one, which says "Brent Butkow — Full-stack
     * engineer". On a page about Brent that is merely vague; on a tool it is wrong, and sharing the ASCII
     * art studio previewed as somebody's job title for months before anyone noticed.
     *
     * Home is the exception: it is what DEFAULT_OG_IMAGE draws.
     */
    const missing = browsableRoutePaths.filter(
      (path) => path !== routePaths.home && routesMeta[path].ogImage === undefined
    )
    expect(
      missing,
      `indexable routes with no ogImage of their own (they fall back to the home card):\n${missing.join('\n')}`
    ).toEqual([])
  })

  it('every social card a route asks for is one the generator knows how to draw', () => {
    // A route can name an ogImage that generate-og.mjs has no card for, and nothing else catches it:
    // the asset check above only fires once someone has already run the generator and committed a file.
    // Without this, a declared-but-never-drawn card ships as a 404 preview on every share.
    const generator = readFileSync(join(rootDir, 'scripts/generate-og.mjs'), 'utf8')
    const drawn = new Set(
      [...generator.matchAll(/out:\s*'public(\/[\w\-/.]+\.png)'/g)].map((match) => match[1])
    )
    expect(drawn.size).toBeGreaterThan(0)

    const asked = [
      DEFAULT_OG_IMAGE,
      ...Object.values(routesMeta)
        .map((meta) => meta.ogImage)
        .filter((image): image is string => image !== undefined),
    ]
    const undrawn = [...new Set(asked)].filter((image) => !drawn.has(image))
    expect(
      undrawn,
      `ogImage paths with no card in scripts/generate-og.mjs:\n${undrawn.join('\n')}`
    ).toEqual([])
  })

  it('every card the generator renders maps to a variant the template defines', () => {
    // generate-og.mjs passes ?v=<variant> to the template; a variant the template has no entry for
    // used to fall back to the home card, silently overwriting a project PNG with the wrong image.
    const generator = readFileSync(join(rootDir, 'scripts/generate-og.mjs'), 'utf8')
    const template = readFileSync(join(rootDir, 'scripts/og/og-template.html'), 'utf8')

    const requested = [...generator.matchAll(/variant:\s*'([\w-]+)'/g)].map((match) => match[1])
    expect(requested.length).toBeGreaterThan(0)

    // Each variant object leads with a `path:` field, which nested config objects never do.
    const defined = new Set(
      [...template.matchAll(/(?:'([\w-]+)'|(\w+)):\s*\{\s*[\r\n]+\s*path:/g)].map(
        (match) => match[1] ?? match[2]
      )
    )
    expect(defined.size).toBeGreaterThan(0)

    const missing = requested.filter((variant) => !defined.has(variant))
    expect(
      missing,
      `generate-og variants with no matching template entry:\n${missing.join('\n')}`
    ).toEqual([])
  })

  it('every hex color in a SCSS module is justified by a nearby comment (else use a token)', () => {
    // Colors come from the design tokens in index.scss (or a scoped palette like the Null Space
    // --ns-* block). A literal hex is allowed only with a justification comment on its line or
    // within the two lines above.
    const hex = /#[0-9a-fA-F]{3,8}\b/
    const hasComment = (line: string) => line.includes('//') || line.includes('/*')
    const unjustified: string[] = []
    for (const file of filesUnder(srcDir, (name) => name.endsWith('.module.scss'))) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, i) => {
        if (!hex.test(line)) return
        if (hasComment(line) || hasComment(lines[i - 1] ?? '') || hasComment(lines[i - 2] ?? ''))
          return
        unjustified.push(`${file.slice(srcDir.length + 1)}:${i + 1} → ${line.trim()}`)
      })
    }
    expect(
      unjustified,
      `hex literals without a token or justification comment:\n${unjustified.join('\n')}`
    ).toEqual([])
  })

  it('every repo file a skill runbook references still exists', () => {
    const skillFiles = readdirSync(skillsDir).flatMap((name) => {
      const skillMd = join(skillsDir, name, 'SKILL.md')
      return existsSync(skillMd) ? [skillMd] : []
    })
    expect(skillFiles.length).toBeGreaterThan(0)

    // Markdown links resolve relative to the skill file; backticked repo paths from the root.
    const mdLink = /\]\(([^)#\s]+)\)/g
    const tickedPath = /`((?:src|public|scripts|\.claude|\.husky)\/[\w\-/.]+\.\w+)`/g
    const stale: string[] = []
    for (const skill of skillFiles) {
      const text = readFileSync(skill, 'utf8')
      const skillName = skill.slice(skillsDir.length + 1)
      for (const match of text.matchAll(mdLink)) {
        const target = match[1]
        if (/^[a-z]+:/.test(target)) continue // http(s), mailto — not repo files
        if (!existsSync(join(dirname(skill), target))) stale.push(`${skillName} → ${target}`)
      }
      for (const match of text.matchAll(tickedPath)) {
        if (!existsSync(join(rootDir, match[1]))) stale.push(`${skillName} → ${match[1]}`)
      }
    }
    expect(stale, `skill runbooks reference moved/deleted files:\n${stale.join('\n')}`).toEqual([])
  })
})
