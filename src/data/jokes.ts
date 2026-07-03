import jokesData from './jokes.json'
import { Joke, JokeTypes } from './jokes.types'

export const isJokeType = (value: string): value is JokeTypes =>
  Object.values(JokeTypes).includes(value as JokeTypes)

export const jokes: Joke[] = jokesData.map((joke) => ({
  joke: joke.joke,
  jokeType: isJokeType(joke.jokeType) ? joke.jokeType : JokeTypes.dad,
  funMode: 'funMode' in joke && joke.funMode === true,
}))

// Professional mode hides the racier jokes; fun mode gets the whole pool.
export const jokesForMode = (isFunMode: boolean): Joke[] =>
  isFunMode ? jokes : jokes.filter((joke) => !joke.funMode)
