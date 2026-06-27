import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decide } from './changelog-bump-reminder.mjs'

test('decide blocks when NullSpace game files change but data.ts is untouched', () => {
  const result = decide(['src/projects/NullSpace/engine/game-loop.ts'])
  assert.equal(result?.decision, 'block')
  assert.match(result.reason, /CHANGELOG/)
})

test('decide passes when data.ts (CHANGELOG/GAME_VERSION) is part of the change', () => {
  assert.equal(
    decide(['src/projects/NullSpace/engine/game-loop.ts', 'src/projects/NullSpace/data.ts']),
    null
  )
})

test('decide ignores test-only NullSpace changes and changes outside NullSpace', () => {
  assert.equal(decide(['src/projects/NullSpace/engine/game-loop.test.ts']), null)
  assert.equal(decide(['src/components/Hero.tsx']), null)
})
