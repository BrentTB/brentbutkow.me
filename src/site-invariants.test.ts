import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Repo-wide invariants that have each shipped broken at least once:
// - a data.ts href pointed at a public/ asset that didn't exist (CV download 404)
// - env vars referenced without the VITE_ prefix, which Vite silently strips from the client

const srcDir = dirname(fileURLToPath(import.meta.url))
const publicDir = join(srcDir, '..', 'public')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : []
  })
}

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
})
