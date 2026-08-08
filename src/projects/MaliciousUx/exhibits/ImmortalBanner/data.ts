export const copy = {
  page: 'Acme Weekly',
  body: 'Nine stories about the same thing, and one about a duck.',
  title: 'We value your privacy',
  detail:
    'We and 812 partners store and access information on your device to personalise content and measure adverts.',
  accept: 'Accept all',
  save: 'Save preferences',
  quiet: 'Dismiss the banner. See how long that lasts.',
  waiting: (seconds: number) => `Back in ${seconds}s.`,
  returned: (times: number) =>
    times === 1 ? 'It came back once.' : `It came back ${times} times.`,
  keyboardGone: 'Saved with the keyboard, so it stayed gone.',
  reset: 'Start the banner again',
}
