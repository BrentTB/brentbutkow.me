// Regenerates the Open Graph images from scripts/og/og-template.html using headless Chrome.
// Run manually when the card design or copy changes: `npm run generate:og`.
// Outputs are committed to public/ — generation is not part of the build.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const template = join(root, 'scripts/og/og-template.html')

const CHROME_PATHS = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const chrome = CHROME_PATHS.find((path) => existsSync(path))
if (!chrome) {
  console.error('generate-og: no Chrome found. Set CHROME=/path/to/chrome and retry.')
  process.exit(1)
}

const cards = [
  { variant: 'home', out: 'public/og-image.png' },
  { variant: 'recall-radar', out: 'public/og/recall-radar.png' },
  { variant: 'null-space', out: 'public/og/null-space.png' },
]

for (const { variant, out } of cards) {
  const outPath = join(root, out)
  mkdirSync(dirname(outPath), { recursive: true })
  // Chrome only writes screenshots into its cwd-relative path; give it an absolute one.
  execFileSync(
    chrome,
    [
      '--headless=new',
      `--screenshot=${outPath}`,
      '--window-size=1200,630',
      '--force-device-scale-factor=1',
      '--hide-scrollbars',
      '--disable-gpu',
      // Lets web fonts finish loading before the shot is taken.
      '--virtual-time-budget=10000',
      `file://${template}?v=${variant}`,
    ],
    { stdio: 'pipe' }
  )
  console.log(`generate-og: wrote ${out}`)
}
