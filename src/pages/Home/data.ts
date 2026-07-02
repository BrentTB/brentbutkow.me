import { HeroActionVariant, HeroContent } from '../../data/data.types'

// Path is relative to /public, so drop the file at: public/brent-butkow-cv.pdf
const cvPath = '/brent-butkow-cv.pdf'

// Feature flag — set to `true` once the CV PDF is in place at public/brent-butkow-cv.pdf.
const cvDownloadEnabled = true

/** CV download link shown under the About section, or null while the PDF isn't published. */
export const cvHref: string | null = cvDownloadEnabled ? cvPath : null

export const heroContent: HeroContent = {
  eyebrow: 'Full-stack engineer',
  eyebrowAlternates: [
    'Dad joke lover',
    'Biltong connoisseur',
    'Wacky algorithm creator',
    'Null space cadet',
    'Head in the cloud',
  ],
  eyebrowAlternatesFun: [
    '01101000 01101001', // "hi"
    'Professional eater',
    'Full snack engineer',
    'Gulag sort survivor',
    'You just lost the game',
    'Sudo make me a sandwich',
    'Never gonna give you up',
    'semicolon free since 1993',
    'According to all known laws of aviation there is no way that a bee should be able to fly...',
  ],
  title: 'Brent Butkow',
  subtitle:
    'Building compliance tools by day and designing wacky projects at night. Loving dad jokes around the clock.',
  subtitleFun: 'A joke lover, video game player, wacky algorithm creator, and biltong connoisseur.',
  actions: [
    {
      label: 'Explore Recall Radar',
      href: '/projects/recall-radar',
      variant: HeroActionVariant.primary,
    },
    {
      label: 'Play Null Space (Beta)',
      href: '/fun-stuff/games/null-space',
      variant: HeroActionVariant.link,
    },
    { label: 'Get in touch', href: '/contact', variant: HeroActionVariant.link },
    {
      label: 'Like the number 404?',
      href: '/404',
      variant: HeroActionVariant.link,
      onlyShowInFunMode: true,
    },
  ],
}

export const aboutSectionEnabled = true

export const aboutParagraphs: string[] = [
  "I'm a software engineer at Foodcomply, writing TypeScript most of the day: React on the frontend, Node services behind it. I got here through Entelect's grad program, after an Information Engineering degree at Wits in Johannesburg.",
  "The project I'm proudest of is Recall Radar, a food-recall tracker pulling from regulators in four countries. It started as a portfolio piece and ended up as something that could warn a real person about dodgy peanut butter, which is more than most side projects can say. Off the keyboard I cook a bit and eat a lot, and there's music playing through most of it.",
]
