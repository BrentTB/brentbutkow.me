import { describe, it, expect } from 'vitest'
import jokes, { isJokeType } from './jokes'
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
})
