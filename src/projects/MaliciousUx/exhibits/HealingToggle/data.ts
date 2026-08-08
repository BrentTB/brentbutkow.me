export const copy = {
  heading: 'Privacy settings',
  label: 'Personalised advertising',
  detail: 'Lets Acme and its partners use your activity to choose which adverts you see.',
  on: 'On',
  off: 'Off',
  quiet: 'Currently on. Turn it off, scroll it out of view, and scroll back.',
  keyboardHeld: 'Turned off with the keyboard, so it stayed off.',
  healed: (times: number) =>
    times === 1 ? 'It switched itself back on once.' : `It switched itself back on ${times} times.`,
}
