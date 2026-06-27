#!/usr/bin/env node
// Stop backstop: at end of turn, flag changed logic files (custom hooks + engine modules) whose
// colocated *.test.ts didn't also change. Repo hard rule: every custom hook ships with its test, and
// every behavioral change (new GameState fields, engine systems, bug fixes) ships a fails-without-fix
// test. Heuristic, path-based — Claude makes the final call. Blocks at most once per turn.
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const TEST_RE = /\.(test|spec)\.[cm]?[jt]sx?$/
const DECL_RE = /\.(types|d)\.ts$/

// A changed source file the repo expects to ship with a test.
export const needsTest = (f) => {
  if (TEST_RE.test(f) || DECL_RE.test(f)) return false
  if (!/\.tsx?$/.test(f)) return false
  if (/(^|\/)use[A-Z]\w*\.tsx?$/.test(f)) return true // custom useX hook
  if (/\/engine\//.test(f) && /\.ts$/.test(f)) return true // engine logic module
  return false
}

const expectedTestFor = (f) => f.replace(/\.(tsx?)$/, '.test.$1')

export function decide(changedFiles) {
  const changed = new Set(changedFiles)
  const hasTest = (logicFile) => {
    if (changed.has(expectedTestFor(logicFile))) return true
    const base = logicFile.replace(/\.(tsx?)$/, '')
    for (const c of changed) if (TEST_RE.test(c) && c.startsWith(base + '.test.')) return true
    return false
  }
  const missing = changedFiles.filter(needsTest).filter((f) => !hasTest(f))
  if (missing.length === 0) return null
  return {
    decision: 'block',
    reason:
      `These logic files changed but their colocated test didn't:\n` +
      missing.map((f) => `  - ${f}`).join('\n') +
      `\n\nRepo hard rule: every custom hook ships with its test, and every behavioral change ` +
      `(new GameState fields, engine systems, bug fixes) ships a test that FAILS without the change. ` +
      `Add/extend the colocated *.test.ts in this turn. If these are pure refactors already covered by ` +
      `existing passing tests, stop without changes.`,
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
    process.exit(0) // not a git repo / git failed → don't block
  }
  const result = decide(changed)
  if (result) process.stdout.write(JSON.stringify(result))
  process.exit(0)
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) run()
