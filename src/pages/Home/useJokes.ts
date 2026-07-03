import { useCallback, useRef, useState } from 'react'
import { jokes } from '../../data/jokes'
import { Joke, JokeTypes } from '../../data/jokes.types'
import { createShuffledCycle, ShuffledCycle } from '../../utils/shuffled-cycle'

const ALL_CATEGORY = 'all'
export type JokeCategory = JokeTypes | typeof ALL_CATEGORY

const inCategory = (category: JokeCategory) => (joke: Joke) =>
  category === ALL_CATEGORY || joke.jokeType === category

/**
 * Owns joke selection: one pool shuffled per mount, then round-robined so every joke shows
 * before any repeats. The cursor is shared across categories — switching category mid-cycle
 * continues from where the last pick left off.
 */
export function useJokes() {
  const cycle = useRef<ShuffledCycle<Joke>>()
  if (!cycle.current) cycle.current = createShuffledCycle(jokes)

  const [currentJoke, setCurrentJoke] = useState(() => cycle.current?.next() ?? null)

  const selectCategory = useCallback(
    (category: JokeCategory) => setCurrentJoke(cycle.current?.next(inCategory(category)) ?? null),
    []
  )

  return { currentJoke, selectCategory }
}
