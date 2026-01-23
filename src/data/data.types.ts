export type HeroContent = {
  eyebrow: string
  title: string
  subtitle: string
  actions: HeroAction[]
}

export type HeroAction = {
  label: string
  href: string
  variant?: 'primary' | 'ghost'
}

export type Project = {
  title: string
  description: string
  stack: string[]
  link?: string
  status?: string
}

export type Experience = {
  role: string
  company: string
  period: string
  summary: string
  skills: string[]
}

export type ContactInfo = {
  email: string
  location: string
  availability: string
}

export type Education = {
  institution: string
  degree: string
  field: string
  period: string
  description: string
  achievements?: string[]
}

export type FunItem = {
  title: string
  description: string
  link?: string
  image?: string
}
