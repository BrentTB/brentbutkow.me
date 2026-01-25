import {
  Achievement,
  ContactInfo,
  ContactPlatform,
  Education,
  Experience,
  FunItem,
  HeroContent,
  Project,
} from './data.types'

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

export const contactPlatforms: ContactPlatform[] = [
  {
    platform: 'Email',
    shownName: 'brent@butkow.com',
    url: 'mailto:brent@butkow.com',
    logoPath: '/logos/email-no-bg.png',
  },
  {
    platform: 'LinkedIn',
    shownName: '@brentbutkow',
    url: 'https://www.linkedin.com/in/brentbutkow/',
    logoPath: '/logos/linkedin-no-bg.png',
  },
  {
    platform: 'GitHub',
    shownName: '@BrentTB',
    url: 'https://github.com/BrentTB',
    logoPath: '/logos/github-no-bg.svg',
  },
]

export const education: Education[] = [
  {
    institution: 'University of the Witwatersrand',
    degree: 'Bachelor of Science in Information Engineering - BSc (Eng)',
    period: '2021 - 2024',
    description: [
      'Bachelor and Honours in Information Engineering with a focus on Computer Science.',
      'Includes modules on Data Structures and Algorithms, Machine Learning, Software Engineering, Cybersecurity, Signals and Systems, and more.',
    ],
    link: 'https://www.wits.ac.za/course-finder/undergraduate/ebe/information-engineering/',
    achievements: [
      'Graduated with Distinction',
      'Top 5 in Information Engineering',
      'Entrostat Prize winner for the best Software Development III project',
      'Isazi Award for the top 5 Information Engineers',
      'Entelect Award for the top Software Development III student',
    ],
  },
  {
    institution: 'Online Learning - Coursera',
    degree: 'IBM AI Engineering Professional Certificate',
    period: 'Jan 2026 - Present',
    link: 'https://www.coursera.org/professional-certificates/ai-engineer',
    description: [
      'A course about modern AI and ML models, and their uses. Including their fundamentals, the theory behind different ML models, and hands on experience using models to solve real-world problems.',
      'Includes topics such as Neural Networks, CNN, RAG, GANs, Generative AI, Transformers, and more.',
      'Taught using Python, TensorFlow, PyTorch, Keras, and other popular AI/ML tools and libraries.',
    ],
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

export const achievements: Achievement[] = [
  {
    year: 2024,
    title: 'Graduated with Distinction',
    description:
      'Bachelor of Science in Information Engineering from the University of the Witwatersrand',
    link: 'https://www.wits.ac.za/',
  },
  {
    year: 2024,
    title: 'Top 5 in Information Engineering',
    description: 'Ranked among the top 5 students in the Information Engineering degree',
  },
  {
    year: 2024,
    title: 'Entrostat Prize Winner',
    description: 'Best Software Development III project',
  },
  {
    year: 2024,
    title: 'Isazi Award',
    description: 'Awarded to the top 5 Information Engineers',
  },
  {
    year: 2024,
    title: 'Entelect Award',
    description: 'Top Software Development III student',
  },
  {
    year: 2024,
    title: 'Entelect University Challenge',
    description: '4th place in the Entelect University Challenge',
    link: 'https://challenge.entelect.co.za/university',
  },
  {
    year: 2024,
    title: 'Syft Hackathon',
    description: 'Top 30 in the Syft Analytics Hackathon',
  },
  {
    year: 2023,
    title: 'Entelect University Challenge',
    description: '2nd place in the Entelect University Challenge',
    link: 'https://challenge.entelect.co.za/university',
  },
  {
    year: 2023,
    title: 'Isazi Award',
    description: 'Awarded to the top 5 Information Engineers',
  },
  {
    year: 2021,
    title: 'International Olympiad in Informatics (IOI) Qualifier',
    description: 'Selected as 1 of 4 students to represent South Africa at the IOI in Singapore',
    link: 'https://ioi2021.sg/',
  },
  {
    year: 2021,
    title: 'Wits Maths Competition',
    description:
      '3rd place nationally in the Wits Maths Competition as a part of "Divide and Conquer"',
    link: 'https://wmc.ms.wits.ac.za/2021-winners',
  },
  {
    year: 2020,
    title: 'Programming Olympiad',
    description: 'Top 3 nationally in the South African Programming Olympiad',
    link: 'https://olympiad.org.za/past-winners/programming',
  },
  {
    year: 2020,
    title: 'Mathematical Olympiad',
    description: 'Top 100 nationally in the South African Mathematical Olympiad',
    link: 'https://www.samf.ac.za/en/sa-mathematics-olympiad',
  },
  {
    year: 2020,
    title: 'Wits Maths Competition',
    description: '3rd in Gauteng in the Wits Maths Competition',
    link: 'https://wmc.ms.wits.ac.za/2020-gauteng-winners',
  },
]
