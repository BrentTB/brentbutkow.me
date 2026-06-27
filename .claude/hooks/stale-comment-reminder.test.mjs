import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findStaleComments, incomingText, decide } from './stale-comment-reminder.mjs'

test('findStaleComments catches banned phrases in line and block comments', () => {
  const text = [
    '// this previously used a cache',
    ' * no longer reads from disk',
    'const x = 1',
  ].join('\n')
  const hits = findStaleComments(text)
  assert.equal(hits.length, 2)
})

test('findStaleComments catches trailing comments but not code or strings', () => {
  assert.equal(findStaleComments('const used = "previously valid input"').length, 0) // string, not comment
  assert.equal(findStaleComments('let x = 5 // previously 3').length, 1) // trailing comment
})

test('incomingText reads Write content, Edit new_string, and MultiEdit edits', () => {
  assert.equal(incomingText('Write', { content: '// no longer used' }), '// no longer used')
  assert.equal(incomingText('Edit', { new_string: 'a' }), 'a')
  assert.equal(
    incomingText('MultiEdit', { edits: [{ new_string: 'a' }, { new_string: 'b' }] }),
    'a\nb'
  )
})

test('decide denies a source edit that introduces a history comment', () => {
  const result = decide('Edit', {
    file_path: 'src/components/Hero.tsx',
    new_string: '// no longer renders the old banner',
  })
  assert.equal(result?.hookSpecificOutput.permissionDecision, 'deny')
})

test('decide ignores excluded files (tests, .claude, markdown) and clean edits', () => {
  assert.equal(decide('Edit', { file_path: 'src/x.test.ts', new_string: '// used to fail' }), null)
  assert.equal(decide('Write', { file_path: '.claude/hooks/x.mjs', content: "'previously'" }), null)
  assert.equal(
    decide('Edit', { file_path: 'src/x.ts', new_string: '// caches the parsed result' }),
    null
  )
})
