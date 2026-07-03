import { describe, it, expect } from 'vitest'
import { jokes, jokesForMode, isJokeType } from './jokes'
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

describe('jokesForMode', () => {
  it('keeps fun-mode-only jokes out of the professional pool', () => {
    const professional = jokesForMode(false)
    expect(professional.length).toBeGreaterThan(0)
    expect(professional.every((joke) => !joke.funMode)).toBe(true)
  })

  it('gives fun mode the full pool, which is strictly bigger', () => {
    const fun = jokesForMode(true)
    expect(fun).toEqual(jokes)
    expect(fun.length).toBeGreaterThan(jokesForMode(false).length)
  })
})
