export const popups = [
  {
    heading: 'Get 10% off your first order',
    body: 'Join 40,000 subscribers. Unsubscribe anytime.',
  },
  {
    heading: 'Wait, before you go',
    body: 'Make that 15% off. This offer expires when you blink.',
  },
  { heading: 'Our app is faster', body: 'Everything you just saw, in an app you will open once.' },
]

export const copy = {
  page: 'Twelve Ways To Use A Slow Cooker',
  body: 'A slow cooker is a countertop appliance that cooks food at a low temperature over several hours. Before we get to the twelve ways, here is how my grandmother',
  closeLabel: (index: number) => `Close popup ${index + 1} of ${popups.length}`,
  email: 'you@example.com',
  subscribe: 'Subscribe',
  cleared: `All ${popups.length} popups closed.`,
  keyboardCleared: 'Closed with the keyboard, so all of them went at once.',
  reopen: 'Put them back',
}
