import { useCallback, useMemo, useState } from 'react'
import { jokes } from '../../data/jokes'
import { JokeTypes } from '../../data/jokes.types'

const ALL_CATEGORY = 'all'
export type JokeCategory = JokeTypes | typeof ALL_CATEGORY

const jokeCategories = Object.values(JokeTypes)

// Group every joke by category once, plus an "all" bucket holding the full set.
const groupJokesByCategory = (): Record<string, typeof jokes> => {
  const grouped: Record<string, typeof jokes> = {}
  jokeCategories.forEach((type) => {
    grouped[type] = jokes.filter((joke) => joke.jokeType === type)
  })
  grouped[ALL_CATEGORY] = jokes
  return grouped
}

const pickRandomJoke = (category: JokeCategory, grouped: Record<string, typeof jokes>) => {
  const pool = grouped[category]
  if (pool && pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)]
  }
  return null
}

// Owns joke selection: groups the jokes once, holds the currently shown joke,
// and swaps in a fresh random pick when a category is chosen.
export function useJokes() {
  const grouped = useMemo(groupJokesByCategory, [])
  const [currentJoke, setCurrentJoke] = useState(() => pickRandomJoke(ALL_CATEGORY, grouped))

  const selectCategory = useCallback(
    (category: JokeCategory) => setCurrentJoke(pickRandomJoke(category, grouped)),
    [grouped]
  )

  return { currentJoke, selectCategory }
}
