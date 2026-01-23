import { ContactInfo, Education, Experience, FunItem, HeroContent, Project } from './data.types'

export const heroContent: HeroContent = {
  eyebrow: 'Full-stack engineer',
  title: 'Brent Butkow',
  subtitle: 'Building thoughtful web experiences with sharp UX and reliable engineering.',
  actions: [
    { label: 'View projects', href: '#projects', variant: 'primary' },
    { label: 'Get in touch', href: '#contact', variant: 'ghost' },
  ],
}

export const projects: Project[] = [
  {
    title: 'brentbutkow.me',
    description: 'A personal site and portfolio focused on clarity, modularity, and performance.',
    stack: ['TypeScript', 'React', 'Vite'],
    link: '#contact',
    status: 'Live',
  },
  {
    title: 'Analytics Ops Toolkit',
    description: 'Internal dashboards streamlining data reviews and deployment workflows.',
    stack: ['Next.js', 'Prisma', 'PostgreSQL'],
    status: 'In progress',
  },
  {
    title: 'Design System Starter',
    description: 'Reusable component library with accessible defaults and theme tokens.',
    stack: ['Storybook', 'TypeScript', 'CSS Modules'],
    status: 'Prototype',
  },
]

export const experience: Experience[] = [
  {
    role: 'Senior Software Engineer',
    company: 'Freelance',
    period: '2022 - Present',
    summary: 'Partnering with teams to ship polished web apps, design systems, and integrations.',
    skills: ['React', 'TypeScript', 'Node.js', 'Design Systems'],
  },
  {
    role: 'Founder & Lead Engineer',
    company: 'Product Studio',
    period: '2018 - 2022',
    summary: 'Built and launched client projects across fintech, analytics, and SaaS.',
    skills: ['Architecture', 'APIs', 'Cloud', 'Mentorship'],
  },
]

export const contactInfo: ContactInfo = {
  email: 'hello@brentbutkow.me',
  location: 'Based in South Africa · Remote friendly',
  availability: 'Open to select collaborations and consulting engagements.',
}

export const education: Education[] = [
  {
    institution: 'University of Cape Town',
    degree: 'Bachelor of Science',
    field: 'Computer Science',
    period: '2015 - 2018',
    description: 'Focused on software engineering, algorithms, and web technologies.',
    achievements: ["Dean's List", 'Top 10% of class', 'Honors in CS'],
  },
  {
    institution: 'Online Learning',
    degree: 'Continuous Education',
    field: 'Full-stack Development',
    period: '2018 - Present',
    description:
      'Self-directed learning across modern frameworks, design systems, and cloud architecture.',
  },
]

export const funStuff: FunItem[] = [
  {
    title: 'Pixel Art Generator',
    description:
      'A weekend project that turns photos into pixel art. Built with canvas API and React.',
    link: '#',
  },
  {
    title: 'Coffee Timer App',
    description: 'Perfect pour-over brewing with customizable timers and brew guides.',
    link: '#',
  },
  {
    title: 'Trail Running',
    description: 'Exploring South African mountains and tracking routes with custom GPS tools.',
  },
  {
    title: 'Vinyl Collection Tracker',
    description: 'A personal catalog of records with listening notes and discovery tracking.',
  },
]
