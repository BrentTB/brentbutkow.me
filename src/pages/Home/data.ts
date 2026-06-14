import { HeroAction, HeroContent } from '../../data/data.types'

// Path is relative to /public, so drop the file at: public/brent-butkow-cv.pdf
export const cvPath = '/brent-butkow-cv.pdf'

// Feature flag — set to `true` once the CV PDF is in place at public/brent-butkow-cv.pdf.
export const cvDownloadEnabled = false

const cvAction: HeroAction = {
  label: 'Download CV',
  href: cvPath,
  variant: 'ghost',
  external: true,
}

export const heroContent: HeroContent = {
  eyebrow: 'Full-stack engineer',
  title: 'Brent Butkow',
  subtitle:
    'Building compliance tools by day and designing wacky projects at night. Loving dad jokes around the clock.',
  subtitleFun: 'A joke lover, video game player, wacky algorithm creator, and biltong connoisseur.',
  actions: [
    {
      label: 'Explore Recall Radar',
      href: '/recall-radar',
      variant: 'primary',
    },
    {
      label: 'Play Null Space (Beta)',
      href: '/fun-stuff/games/null-space',
      variant: 'primary',
    },
    { label: 'Get in touch', href: '/contact', variant: 'ghost' },
    ...(cvDownloadEnabled ? [cvAction] : []),
    { label: 'Like the number 404?', href: '/404', variant: 'ghost', onlyShowInFunMode: true },
  ],
}

// Feature flag — set to `false` to hide the About section until the copy is ready.
export const aboutSectionEnabled = false

export const aboutParagraphs: string[] = [
  "I'm a full-stack software engineer at Foodcomply, working across cloud infrastructure and web development. I joined through Entelect's graduate program after completing a BSc in Information Engineering at the University of the Witwatersrand.",
  "I like building things end to end — from the AWS and Terraform plumbing to the React on top — and I care about software that's both correct and a little bit delightful. I'm always happy to chat about interesting problems, new opportunities, or a good dad joke.",
]
