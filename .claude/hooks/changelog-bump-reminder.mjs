#!/usr/bin/env node
// Stop backstop: if Null Space game files changed but CHANGELOG / GAME_VERSION in data.ts didn't,
// remind to bump. GAME_VERSION = CHANGELOG[0].version and shows in-game, so a user-facing change with
// no changelog entry ships a stale version. Heuristic — internal refactors legitimately skip it.
// Blocks at most once per turn.
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const NS = 'src/projects/NullSpace/'
const DATA = 'src/projects/NullSpace/data.ts'

export function decide(changedFiles) {
  const touchedGame = changedFiles.some(
    (f) =>
      f.startsWith(NS) && f !== DATA && !/\.(test|spec)\./.test(f) && /\.(tsx?|scss|css)$/.test(f)
  )
  const bumped = changedFiles.includes(DATA)
  if (!touchedGame || bumped) return null
  return {
    decision: 'block',
    reason:
      `Null Space files changed but CHANGELOG / GAME_VERSION in ${DATA} didn't.\n\nIf this is a ` +
      `user-facing or behavioral change, add a CHANGELOG entry and bump GAME_VERSION (semver per ` +
      `src/projects/NullSpace/CLAUDE.md: major = save-break, minor = feature, patch = fix/balance/polish). ` +
      `If it's an internal refactor with no user-visible effect, stop without changes.`,
  }
}

function changedFromGit(cwd) {
  return execSync('git -c core.quotepath=false status --porcelain', { cwd, encoding: 'utf8' })
    .split('\n')
    .map((l) => l.slice(3).trim())
    .map((p) => (p.includes(' -> ') ? p.split(' -> ').pop() : p))
    .filter(Boolean)
}

function run() {
  let data
  try {
    data = JSON.parse(readFileSync(0, 'utf8') || '{}')
  } catch {
    process.exit(0)
  }
  if (data?.stop_hook_active === true) process.exit(0)
  const cwd = data?.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd()
  let changed
  try {
    changed = changedFromGit(cwd)
  } catch {
    process.exit(0)
  }
  const result = decide(changed)
  if (result) process.stdout.write(JSON.stringify(result))
  process.exit(0)
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) run()
