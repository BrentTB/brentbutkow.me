export type HeroContent = {
  eyebrow: string
  /** Other identities the hero eyebrow periodically retypes, returning to `eyebrow` between each. */
  eyebrowAlternates?: string[]
  /** Extra identities appended to the rotation in Fun mode only. */
  eyebrowAlternatesFun?: string[]
  title: string
  subtitle: string
  subtitleFun: string
  actions: HeroAction[]
}

// The hero keeps a single gold primary; everything else is a quiet mono text link.
export const HeroActionVariant = { primary: 'primary', link: 'link' } as const
export type HeroActionVariant = (typeof HeroActionVariant)[keyof typeof HeroActionVariant]

type HeroAction = {
  label: string
  href: string
  variant?: HeroActionVariant
  onlyShowInFunMode?: boolean
  /** Render as a plain anchor (opens in a new tab) instead of a router link — for files/external URLs. */
  external?: boolean
}

type ExperienceProject = {
  company: string
  period: string
  description: string[]
  skills: string[]
}

export type Experience = {
  role: string
  company: string
  companyLink: string
  period: string
  description?: string[]
  skills?: string[]
  experienceProjects?: ExperienceProject[]
}

export type ContactPlatform = {
  platform: string
  shownName: string
  url: string
  logoPath: string
}

export type Education = {
  institution: string
  degree: string
  period: string
  description: string[]
  link?: string
  achievements?: string[]
}

export type FunItem = {
  title: string
  description: string
  link?: string
  image?: string
}

export type Achievement = {
  year: number
  title: string
  description?: string
  link?: string
  onlyShowInFunMode?: boolean
}
