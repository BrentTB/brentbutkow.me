export type HeroContent = {
  eyebrow: string
  title: string
  subtitle: string
  subtitleFun: string
  actions: HeroAction[]
}

export type HeroAction = {
  label: string
  href: string
  variant?: 'primary' | 'ghost'
  onlyShowInFunMode?: boolean
}

export type Project = {
  title: string
  description: string
  stack: string[]
  link?: string
  status?: string
}

export type ExperienceProject = {
  company: string
  period: string
  description: string[]
  skills: string[]
}

export type Experience = {
  role: string
  company: string
  period: string
  description?: string[]
  skills?: string[]
  experienceProjects?: ExperienceProject[]
}

export type ContactInfo = {
  email: string
  location: string
  availability: string
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
}
