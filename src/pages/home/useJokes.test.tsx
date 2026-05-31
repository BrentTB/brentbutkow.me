import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
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
})
