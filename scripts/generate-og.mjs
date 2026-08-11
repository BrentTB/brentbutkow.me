// Regenerates the Open Graph images from scripts/og/og-template.html using headless Chrome.
// Run manually when the card design or copy changes: `npm run generate:og`.
// Outputs are committed to public/ — generation is not part of the build.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const template = join(root, 'scripts/og/og-template.html')

/** A real card is hundreds of KB. Anything under this rendered blank or text-only. */
const MIN_BYTES = 50_000

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

// One entry per designed card. `out` must match the corresponding `ogImage` path in
// src/routes/routes.meta.ts (and DEFAULT_OG_IMAGE for the home card) — a route pointing at an
// image with no entry here won't get one generated.
const cards = [
  { variant: 'home', out: 'public/og-image.png' },
  { variant: 'recall-radar', out: 'public/og/recall-radar.png' },
  { variant: 'null-space', out: 'public/og/null-space.png' },
  { variant: 'pixel-world-simulator', out: 'public/og/pixel-world-simulator.png' },
  { variant: 'experience', out: 'public/og/experience.png' },
  { variant: 'education', out: 'public/og/education.png' },
  { variant: 'achievements', out: 'public/og/achievements.png' },
  { variant: 'projects', out: 'public/og/projects.png' },
  { variant: 'fun-stuff', out: 'public/og/fun-stuff.png' },
  { variant: 'games', out: 'public/og/games.png' },
  { variant: 'course-projects', out: 'public/og/course-projects.png' },
  { variant: 'contact', out: 'public/og/contact.png' },
  { variant: 'ascii-art', out: 'public/og/ascii-art.png' },
  { variant: 'image-encoder', out: 'public/og/image-encoder.png' },
  { variant: 'gulag-sort', out: 'public/og/gulag-sort.png' },
  { variant: 'malicious-ux', out: 'public/og/malicious-ux.png' },
  { variant: 'othello', out: 'public/og/othello.png' },
  { variant: 'tic-tac-toe', out: 'public/og/4x4x4-tic-tac-toe.png' },
]

const failed = []

for (const { variant, out } of cards) {
  const outPath = join(root, out)
  mkdirSync(dirname(outPath), { recursive: true })
  // Rendered beside the target and moved in only once it passes: a failed card must not overwrite the
  // good one already committed, where the next `git add -A` would sweep the blank up with everything else.
  // Keeps the .png extension: Chrome writes nothing at all for a screenshot path it doesn't recognise.
  const draftPath = outPath.replace(/\.png$/, '.draft.png')
  // Chrome only writes screenshots into its cwd-relative path; give it an absolute one.
  execFileSync(
    chrome,
    [
      '--headless=new',
      `--screenshot=${draftPath}`,
      '--window-size=1200,630',
      // 2x render: social CDNs downscale gracefully, and text stays crisp on retina previews.
      '--force-device-scale-factor=2',
      '--hide-scrollbars',
      '--disable-gpu',
      // Lets web fonts finish loading before the shot is taken.
      '--virtual-time-budget=10000',
      `file://${template}?v=${variant}`,
    ],
    { stdio: 'pipe' }
  )
  // Headless Chrome exits 0 even when the page throws, so a blank or text-only card would slip
  // through. A real card is hundreds of KB; anything tiny means the render failed.
  const { size } = statSync(draftPath)
  if (size < MIN_BYTES) {
    console.error(
      `generate-og: ${out} is only ${size} bytes — the render failed, keeping the old card.`
    )
    rmSync(draftPath)
    failed.push(out)
    continue
  }
  renameSync(draftPath, outPath)
  console.log(`generate-og: wrote ${out} (${Math.round(size / 1024)} KB)`)
}

// Every card is attempted before anything is reported, so one broken variant can't hide the rest.
if (failed.length > 0) {
  console.error(`generate-og: ${failed.length} card(s) failed to render:\n  ${failed.join('\n  ')}`)
  process.exit(1)
}
