import { HeroContent } from '../../data/data.types'

export const heroContent: HeroContent = {
  eyebrow: 'Full-stack engineer',
  title: 'Brent Butkow',
  subtitle: 'All-round developer who loves to code, and a dad joke aficionado.',
  subtitleFun: 'Coding for the love of the game, one line at a time.',
  actions: [
    { label: 'View projects', href: '/fun-stuff', variant: 'primary' },
    { label: 'Get in touch', href: '/contact', variant: 'ghost' },
    { label: 'Like the number 404?', href: '/404', variant: 'ghost', onlyShowInFunMode: true },
  ],
}
