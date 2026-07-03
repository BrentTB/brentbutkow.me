export enum JokeTypes {
  dad = 'dad',
  cheesy = 'cheesy',
  long = 'long',
  chuckNorris = 'chuckNorris',
}

export interface Joke {
  jokeType: JokeTypes
  joke: string
  // Racier jokes stay out of professional mode.
  funMode: boolean
}

export const jokeTypeLabels: Record<JokeTypes, string> = {
  [JokeTypes.dad]: 'Dad jokes',
  [JokeTypes.cheesy]: 'Cheesy jokes',
  [JokeTypes.long]: 'Long jokes',
  [JokeTypes.chuckNorris]: 'Chuck Norris jokes',
}
