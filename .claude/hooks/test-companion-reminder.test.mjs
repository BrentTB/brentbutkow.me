import { test } from 'node:test'
import assert from 'node:assert/strict'
import { needsTest, decide } from './test-companion-reminder.mjs'

test('needsTest flags custom hooks and engine modules, ignores tests/types/markup', () => {
  assert.equal(needsTest('src/routes/useRouteMeta.ts'), true)
  assert.equal(needsTest('src/projects/NullSpace/engine/game-loop.ts'), true)
  assert.equal(needsTest('src/routes/useRouteMeta.test.ts'), false)
  assert.equal(needsTest('src/data/data.types.ts'), false)
  assert.equal(needsTest('src/components/Hero.tsx'), false)
  assert.equal(needsTest('src/projects/NullSpace/data.ts'), false) // not under /engine/, not a hook
})

test('decide blocks when a changed hook has no companion test in the diff', () => {
  const result = decide(['src/routes/useRouteMeta.ts', 'src/App.tsx'])
  assert.equal(result?.decision, 'block')
  assert.match(result.reason, /useRouteMeta\.ts/)
})

test('decide passes when the colocated test changed alongside the logic', () => {
  assert.equal(decide(['src/routes/useRouteMeta.ts', 'src/routes/useRouteMeta.test.ts']), null)
})

test('decide flags only the uncovered file when several logic files change', () => {
  const result = decide([
    'src/projects/NullSpace/engine/a.ts',
    'src/projects/NullSpace/engine/a.test.ts',
    'src/projects/NullSpace/engine/b.ts',
  ])
  assert.equal(result?.decision, 'block')
  assert.match(result.reason, /engine\/b\.ts/)
  assert.doesNotMatch(result.reason, /engine\/a\.ts$/m)
})

test('decide passes when no logic files changed', () => {
  assert.equal(decide(['src/components/Hero.tsx', 'README.md']), null)
})
