import { describe, it, expect } from 'vitest'
import { jokes, isJokeAllowed, isJokeType } from './jokes'
import { JokeTypes } from './jokes.types'

describe('isJokeType', () => {
  it('accepts known joke types', () => {
    expect(isJokeType('dad')).toBe(true)
    expect(isJokeType(JokeTypes.chuckNorris)).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isJokeType('not-a-type')).toBe(false)
    expect(isJokeType('')).toBe(false)
  })
})

describe('jokes data', () => {
  it('coerces every joke to a valid JokeType', () => {
    const validTypes = Object.values(JokeTypes)
    expect(jokes.length).toBeGreaterThan(0)
    for (const joke of jokes) {
      expect(validTypes).toContain(joke.jokeType)
    }
  })

  it('coerces funMode to a boolean on every joke', () => {
    for (const joke of jokes) {
      expect(typeof joke.funMode).toBe('boolean')
    }
  })
})

describe('isJokeAllowed', () => {
  it('blocks fun-mode-only jokes in professional mode, allows everything in fun mode', () => {
    const tagged = jokes.find((joke) => joke.funMode)
    const clean = jokes.find((joke) => !joke.funMode)
    expect(tagged).toBeDefined()
    expect(clean).toBeDefined()
    expect(isJokeAllowed(tagged!, false)).toBe(false)
    expect(isJokeAllowed(tagged!, true)).toBe(true)
    expect(isJokeAllowed(clean!, false)).toBe(true)
    expect(isJokeAllowed(clean!, true)).toBe(true)
  })
})
