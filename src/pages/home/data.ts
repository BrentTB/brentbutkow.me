import { HeroContent, Project } from '../../data/data.types'

export const heroContent: HeroContent = {
  eyebrow: 'Full-stack engineer',
  title: 'Brent Butkow',
  subtitle: 'Building thoughtful web experiences with sharp UX and reliable engineering',
  actions: [
    { label: 'View projects', href: '#projects', variant: 'primary' },
    { label: 'Get in touch', href: '#contact', variant: 'ghost' },
  ],
}

export const projects: Project[] = [
  {
    title: 'brentbutkow.me',
    description: 'A personal site and portfolio focused on clarity, modularity, and performance',
    stack: ['TypeScript', 'React', 'Vite'],
    link: '#contact',
    status: 'Live',
  },
  {
    title: 'Analytics Ops Toolkit',
    description: 'Internal dashboards streamlining data reviews and deployment workflows',
    stack: ['Next.js', 'Prisma', 'PostgreSQL'],
    status: 'In progress',
  },
  {
    title: 'Design System Starter',
    description: 'Reusable component library with accessible defaults and theme tokens',
    stack: ['Storybook', 'TypeScript', 'CSS Modules'],
    status: 'Prototype',
  },
]
