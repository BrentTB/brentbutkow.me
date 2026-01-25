import jokesData from './jokes.json'
import { Joke, JokeTypes } from './jokes.types'

const isJokeType = (value: string): value is JokeTypes =>
  Object.values(JokeTypes).includes(value as JokeTypes)

const jokes: Joke[] = jokesData.map((joke) => ({
  joke: joke.joke,
  jokeType: isJokeType(joke.jokeType) ? joke.jokeType : JokeTypes.dad,
}))

export default jokes
