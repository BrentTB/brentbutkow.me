import { Experience } from '../../data/data.types'

export const experience: Experience[] = [
  {
    role: 'Junior Software Developer',
    company: 'Entelect',
    period: 'Jan 2025 - Present',
    experienceProjects: [
      {
        company: 'Entelect Graduate Program / Bootcamp',
        period: 'Jan 2025 - Mar 2025',
        description: [
          'An intensive 10-week program focused on full-stack development, software engineering principles, and industry best practices',
          'Consulted with mock clients, designed databases, and developed client and admin websites for a mock e-commerce platform',
        ],
        skills: [
          'TypeScript',
          'Angular',
          'Java Spring',
          '.Net',
          'SQL',
          'Data Engineering',
          'Cloud Computing',
          'Agile',
          'Coding Best Practices',
        ],
      },
      {
        company: 'Working for Reinsurance Group of America (RGA)',
        period: 'Mar 2025 - Present',
        description: [
          'Responsible for maintaining and improving cloud infrastructure. Responsible for production deployments and CI/CD pipelines',
          'Created, deployed and monitored new environments and services',
          'Cut cloud costs by up to 50% for multiple products',
          'Worked on developing a website used by insurance agencies to request reinsurance quotes from RGA',
        ],
        skills: ['IaC', 'AWS', 'Terraform', 'Jenkins', 'React', 'TypeScript', 'Groovy'],
      },
      {
        company: 'Entelect Tech Accelerator',
        period: 'Jun 2025 - Dec 2025',
        description: [
          'Worked on creating an ECS-based game engine, Forge, for building browser-based games',
          'Worked on creating StarWright, a browser-based roguelike game, played as a spaceship',
        ],
        skills: ['ECS', 'TypeScript', 'WebGL', 'Firebase', 'Rive'],
      },
    ],
  },
  {
    role: 'Software Engineering Intern',
    company: 'Entelect, Amsterdam Office',
    period: 'Jan 2024 - Feb 2024 (7 weeks)',
    description: [
      'Built a virtual doorbell web app to manage office access and track who is inside when keys are limited',
      'Integrated Microsoft Azure AD so only employees can authenticate and use the tool',
      'Added an in-office calendar so teammates can see who plans to be onsite on specific days',
    ],
    skills: ['JavaScript', 'WebSocket', 'Express.js', 'Azure AD', 'Prisma', 'Railway'],
  },
  {
    role: 'Data Engineering Intern',
    company: 'Stream (VATIT division)',
    period: 'Jan 2023 - Feb 2023 (6 weeks)',
    description: [
      'Built an automated data pipeline for sales, revenue, and profit metrics to improve reporting cadence',
      'Delivered dashboards and reporting for strategic and operational decision-making',
    ],
    skills: ['DBT', 'AWS DMS', 'AWS Lambda', 'Amazon Redshift', 'Amazon QuickSight'],
  },
  {
    role: 'Software Engineering Intern',
    company: 'Business Science Corporation',
    period: 'Feb 2021 - Apr 2021 (13 weeks)',
    description: [
      'Designed and implemented an AI chatbot in Microsoft Teams for internal employee use',
      'Used NLP to answer common employee questions from internal databases, and answer employee-specific queries',
    ],
    skills: ['Microsoft Azure', 'Python', 'Microsoft Bot Framework', 'Microsoft LUIS'],
  },
]
