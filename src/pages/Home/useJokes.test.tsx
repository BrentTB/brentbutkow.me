import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { jokes } from '../../data/jokes'
import { JokeTypes } from '../../data/jokes.types'
import { useJokes, type JokeCategory } from './useJokes'

describe('useJokes', () => {
  it('starts with a joke from the full set', () => {
    const { result } = renderHook(() => useJokes())
    expect(result.current.currentJoke).not.toBeNull()
  })

  it('only returns jokes from the selected category', () => {
    const { result } = renderHook(() => useJokes())
    act(() => result.current.selectCategory(JokeTypes.dad))
    expect(result.current.currentJoke?.jokeType).toBe(JokeTypes.dad)
  })

  it('returns null when the category has no jokes', () => {
    const { result } = renderHook(() => useJokes())
    act(() => result.current.selectCategory('does-not-exist' as JokeCategory))
    expect(result.current.currentJoke).toBeNull()
  })

  it('shows every joke once before any repeats', () => {
    const { result } = renderHook(() => useJokes())
    const seen = [result.current.currentJoke!.joke]
    for (let i = 1; i < jokes.length; i++) {
      act(() => result.current.selectCategory('all'))
      seen.push(result.current.currentJoke!.joke)
    }
    expect([...seen].sort()).toEqual(jokes.map((joke) => joke.joke).sort())
  })

  it('cycles a category without repeats, sharing the cursor with the initial pick', () => {
    const dadCount = jokes.filter((joke) => joke.jokeType === JokeTypes.dad).length
    const { result } = renderHook(() => useJokes())
    // The mount pick may already have consumed one dad joke, so draw one fewer than the pool.
    const seen = new Set<string>()
    for (let i = 0; i < dadCount - 1; i++) {
      act(() => result.current.selectCategory(JokeTypes.dad))
      expect(result.current.currentJoke?.jokeType).toBe(JokeTypes.dad)
      seen.add(result.current.currentJoke!.joke)
    }
    expect(seen.size).toBe(dadCount - 1)
  })
})
