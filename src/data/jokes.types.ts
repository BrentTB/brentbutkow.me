export enum JokeTypes {
  dad = 'dad',
  cheesy = 'cheesy',
  long = 'long',
}

export interface Joke {
  jokeType: JokeTypes
  joke: string
}

export const jokeTypeLabels: Record<JokeTypes, string> = {
  [JokeTypes.dad]: 'Dad jokes',
  [JokeTypes.cheesy]: 'Cheesy jokes',
  [JokeTypes.long]: 'Long jokes',
}
