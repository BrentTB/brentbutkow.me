import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ReactNode } from 'react'
import { jokes } from '../../data/jokes'
import { JokeTypes } from '../../data/jokes.types'
import { FunModeContext } from '../../contexts/useFunMode'
import { useJokes, type JokeCategory } from './useJokes'

const wrapperFor =
  (isFunMode: boolean) =>
  ({ children }: { children: ReactNode }) => (
    <FunModeContext.Provider value={{ isFunMode, setIsFunMode: () => {} }}>
      {children}
    </FunModeContext.Provider>
  )
const funMode = wrapperFor(true)
const professional = wrapperFor(false)

describe('useJokes', () => {
  it('starts with a joke from the full set', () => {
    const { result } = renderHook(() => useJokes(), { wrapper: funMode })
    expect(result.current.currentJoke).not.toBeNull()
  })

  it('only returns jokes from the selected category', () => {
    const { result } = renderHook(() => useJokes(), { wrapper: funMode })
    act(() => result.current.selectCategory(JokeTypes.dad))
    expect(result.current.currentJoke?.jokeType).toBe(JokeTypes.dad)
  })

  it('returns null when the category has no jokes', () => {
    const { result } = renderHook(() => useJokes(), { wrapper: funMode })
    act(() => result.current.selectCategory('does-not-exist' as JokeCategory))
    expect(result.current.currentJoke).toBeNull()
  })

  it('shows every joke once before any repeats', () => {
    const { result } = renderHook(() => useJokes(), { wrapper: funMode })
    const seen = [result.current.currentJoke!.joke]
    for (let i = 1; i < jokes.length; i++) {
      act(() => result.current.selectCategory('all'))
      seen.push(result.current.currentJoke!.joke)
    }
    expect([...seen].sort()).toEqual(jokes.map((joke) => joke.joke).sort())
  })

  it('never surfaces a fun-only joke in professional mode', () => {
    const professionalJokes = jokes.filter((joke) => !joke.funMode).map((joke) => joke.joke)
    const { result } = renderHook(() => useJokes(), { wrapper: professional })
    const seen = [result.current.currentJoke!.joke]
    for (let i = 1; i < professionalJokes.length; i++) {
      act(() => result.current.selectCategory('all'))
      seen.push(result.current.currentJoke!.joke)
    }
    expect([...seen].sort()).toEqual([...professionalJokes].sort())
  })

  it('cycles a category without repeats, sharing the cursor with the initial pick', () => {
    const dadCount = jokes.filter((joke) => joke.jokeType === JokeTypes.dad).length
    const { result } = renderHook(() => useJokes(), { wrapper: funMode })
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
