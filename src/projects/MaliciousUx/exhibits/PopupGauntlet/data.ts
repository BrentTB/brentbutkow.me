/** After this many interruptions, an advert lands above the reader's place and shoves it down. */
export const AD_AFTER_INTERRUPTIONS = 2

export const INTERRUPTIONS = [
  {
    heading: 'Enjoying this article?',
    body: 'Get our newsletter and never miss a slow cooker.',
    accept: 'Sign me up',
    dismiss: 'No thanks',
  },
  {
    heading: 'Support independent cooking journalism',
    body: 'Readers like you fund this work. £3 a month keeps it free for everyone.',
    accept: 'Donate £3',
    dismiss: 'Maybe later',
  },
  {
    heading: 'Our app is faster',
    body: 'Read the rest of this article in an app you will open exactly once.',
    accept: 'Get the app',
    dismiss: 'Continue in browser',
  },
]

export const copy = {
  title: 'How To Store Bread, According To Bakers',
  paragraphs: [
    'Before we get to the method, a word about my grandmother, who kept bread in a drawer lined with a tea towel and never once mentioned why.',
    'Bread stales because starch recrystallises, a process that runs fastest just above freezing. This is the single most useful fact about bread storage and almost nobody is told it.',
    'The refrigerator, therefore, is the worst place you can put a loaf. It sits at exactly the temperature that stales bread quickest, roughly six times faster than a countertop.',
    'A paper bag on the counter keeps a crust crisp for about a day. A plastic bag keeps the crumb soft and turns the crust to leather. You are choosing which half of the loaf to sacrifice.',
    'For anything beyond two days, slice the loaf first and freeze it. Frozen bread skips straight past the staling temperature, and a slice toasts from frozen without thawing.',
    'Which brings us back to the drawer, and to my grandmother, who was right for reasons she declined to explain.',
  ],
  advert: 'Advertisement',
  advertBody: 'Your council may owe you £2,400',
  quiet: 'Scroll the article.',
  interrupted: (count: number) =>
    count === 1
      ? '1 interruption so far. Keep going.'
      : `${count} interruptions so far. Keep going.`,
  finished: (count: number) =>
    `You reached the end past ${count} interruptions, one advert, and a story about a drawer.`,
  again: 'Read it again',
}
