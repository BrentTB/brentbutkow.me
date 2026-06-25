#!/usr/bin/env node
// Stop backstop: at end of turn, if the working tree has changes to files that typically carry
// user-facing copy, remind Claude to run the humanizer skill on that copy. Blocks at most once
// per turn — stop_hook_active guards against an infinite stop loop.
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

let data
try {
  data = JSON.parse(readFileSync(0, 'utf8') || '{}')
} catch {
  process.exit(0)
}

// Already continued once because of this hook → allow the stop, never loop.
if (data?.stop_hook_active === true) process.exit(0)

const cwd = data?.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd()

let status = ''
try {
  status = execSync('git -c core.quotepath=false status --porcelain', { cwd, encoding: 'utf8' })
} catch {
  process.exit(0) // not a git repo / git failed → don't block
}

// Files that typically hold user-facing copy. Heuristic, path-based — Claude makes the final call.
// Markdown is excluded: in this repo it's dev docs (CLAUDE.md/CONCEPTS.md/README), not rendered copy.
const isTextBearing = (f) =>
  /\.(tsx|jsx)$/.test(f) || /(^|\/)data\.[tj]sx?$/.test(f) || /(^|\/)data\//.test(f)

const changed = status
  .split('\n')
  .map((line) => line.slice(3).trim()) // strip "XY " porcelain prefix
  .map((p) => (p.includes(' -> ') ? p.split(' -> ').pop() : p)) // rename → new path
  .filter(Boolean)
  .filter(isTextBearing)

if (changed.length === 0) process.exit(0)

process.stdout.write(
  JSON.stringify({
    decision: 'block',
    reason:
      `Working tree has changes to files that may contain user-facing copy:\n` +
      changed.map((f) => `  - ${f}`).join('\n') +
      `\n\nRun the humanizer skill on the NEW or CHANGED user-facing text (rendered strings, content, ` +
      `copy) to strip AI-writing tells. Skip code, comments, and identifiers. If none of these changes ` +
      `are human-facing copy, or you already humanized them this turn, stop without further changes.`,
  })
)
process.exit(0)
