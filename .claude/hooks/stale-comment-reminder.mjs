#!/usr/bin/env node
// PreToolUse backstop on Edit/Write/MultiEdit: blocks comments that narrate history ("no longer",
// "previously", "used to", ...). Repo rule: comments are present-tense — say what the code does now,
// never how it used to work. Scans only the comment portion of each incoming line, so code and
// user-facing strings are untouched.
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const BANNED = [
  'no longer',
  'previously',
  'used to',
  'byte-identical',
  'we now',
  'now we',
  'as before',
  'instead of before',
  'changed from',
  'was changed',
  'originally',
]

// Text a given tool call would write into the file.
export function incomingText(toolName, input) {
  if (!input) return ''
  if (toolName === 'Write') return String(input.content ?? '')
  if (toolName === 'Edit') return String(input.new_string ?? '')
  if (toolName === 'MultiEdit' && Array.isArray(input.edits))
    return input.edits.map((e) => String(e?.new_string ?? '')).join('\n')
  return ''
}

// The comment slice of a line — full line for block comments, the `//` tail otherwise. '' if no comment.
const commentText = (line) => {
  const t = line.trim()
  if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('{/*')) return t
  const i = line.indexOf('//')
  return i >= 0 ? line.slice(i) : ''
}

export function findStaleComments(text) {
  const hits = []
  for (const raw of text.split('\n')) {
    const comment = commentText(raw).toLowerCase()
    if (!comment) continue
    for (const phrase of BANNED) {
      if (comment.includes(phrase)) {
        hits.push({ phrase, line: raw.trim() })
        break
      }
    }
  }
  return hits
}

const SCANNABLE = /\.(tsx?|jsx?|scss|css)$/
const isExcluded = (f) => /\.claude\//.test(f) || /\.(test|spec)\./.test(f) || /\.md$/.test(f)

export function decide(toolName, input) {
  const file = input?.file_path ?? ''
  if (!SCANNABLE.test(file) || isExcluded(file)) return null
  const hits = findStaleComments(incomingText(toolName, input))
  if (hits.length === 0) return null
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `Comment narrates history (repo rule: comments are present-tense — what the code does now, ` +
        `not how it used to work). Rewrite to describe current behavior, or drop it:\n` +
        hits.map((h) => `  - "${h.phrase}" in: ${h.line}`).join('\n'),
    },
  }
}

function run() {
  let data
  try {
    data = JSON.parse(readFileSync(0, 'utf8') || '{}')
  } catch {
    process.exit(0)
  }
  const result = decide(data?.tool_name ?? '', data?.tool_input)
  if (result) process.stdout.write(JSON.stringify(result))
  process.exit(0)
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) run()
