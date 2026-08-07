export const copy = {
  show: 'Episode 4: The Long Corridor',
  playing: 'Playing · 38 minutes remaining',
  title: 'Are you still watching?',
  detail: 'Playback pauses if nobody answers.',
  confirm: 'Continue watching',
  quiet: 'Answer it and keep watching.',
  waiting: (seconds: number) => `It asks again in ${seconds}s.`,
  asked: (times: number) =>
    times === 1 ? 'It has asked twice now.' : `It has asked ${times + 1} times now.`,
  keyboardGone: 'Answered with the keyboard, so it took the answer.',
  reset: 'Start the episode again',
}
