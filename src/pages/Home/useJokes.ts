import { useCallback, useRef, useState } from 'react'
import { isJokeAllowed, jokes } from '../../data/jokes'
import { type Joke, JokeTypes } from '../../data/jokes.types'
import { createShuffledCycle, type ShuffledCycle } from '../../utils/shuffled-cycle'
import { useFunMode } from '../../contexts/useFunMode'

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
  const { isFunMode } = useFunMode()
  const cycle = useRef<ShuffledCycle<Joke>>()
  if (!cycle.current) cycle.current = createShuffledCycle(jokes)

  const matcher = useCallback(
    (category: JokeCategory) => (joke: Joke) =>
      inCategory(category)(joke) && isJokeAllowed(joke, isFunMode),
    [isFunMode]
  )

  const [currentJoke, setCurrentJoke] = useState<Joke | null>(
    () => cycle.current?.next(matcher(ALL_CATEGORY)) ?? null
  )

  const selectCategory = useCallback(
    (category: JokeCategory) => setCurrentJoke(cycle.current?.next(matcher(category)) ?? null),
    [matcher]
  )

  return { currentJoke, selectCategory }
}
