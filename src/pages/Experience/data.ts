import { Experience } from '../../data/data.types'

export const experience: Experience[] = [
  {
    role: 'Software Engineer',
    company: 'Foodcomply',
    companyLink: 'https://foodcomply.com/',
    period: 'Apr 2026 - Present',
    description: [
      'Joined Foodcomply as a Software Engineer, working across full-stack development, security, DevOps, and infrastructure',
      'Combine technical delivery with customer-facing responsibilities, including sales meetings, product demonstrations, requirements gathering, and solution design',
    ],
    skills: ['Supabase', 'React', 'TypeScript', 'CI/CD', 'Security', 'Vercel'],
  },
  {
    role: 'Software Engineer',
    company: 'Entelect',
    companyLink: 'https://entelect.co.za/',
    period: 'Jan 2025 - Mar 2026',
    description: [
      'Joined Entelect as a Software Engineer through their Graduate Program, and have been working on Cloud infrastructure and web development since then',
    ],
    skills: ['AWS', 'Terraform', 'Jenkins', 'React', 'TypeScript', 'IaC'],

    experienceProjects: [
      {
        company: 'Entelect Graduate Program / Bootcamp',
        period: 'Jan 2025 - Mar 2025',
        description: [
          'An intensive 10-week program focused on full-stack development, software engineering principles, and industry best practices',
          'Consulted with mock clients, designed databases, and developed client and admin websites for a mock e-commerce (comic book) platform',
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
        company: 'Working/Consulting for Reinsurance Group of America (RGA)',
        period: 'Mar 2025 - Mar 2026',
        description: [
          'Responsible for maintaining and improving cloud infrastructure. Responsible for production deployments and CI/CD pipelines',
          'Created, deployed and monitored new environments and services',
          'Cut cloud costs by up to 50% for multiple products',
          'Worked on developing a website used by insurance agencies to request reinsurance quotes from RGA, in React, TS and Node.js',
        ],
        skills: ['AWS', 'Terraform', 'Jenkins', 'React', 'TypeScript', 'Node.js', 'IaC', 'Groovy'],
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
    companyLink: 'https://entelect.co.za/',
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
    companyLink: 'https://www.vatitstream.com/',
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
    companyLink: 'https://bscglobal.com/',
    period: 'Feb 2021 - Apr 2021 (13 weeks)',
    description: [
      'Designed and implemented an AI chatbot in Microsoft Teams for internal employee use',
      'Used NLP to answer common employee questions from internal databases, and answer employee-specific queries',
    ],
    skills: ['Microsoft Azure', 'Python', 'Microsoft Bot Framework', 'Microsoft LUIS'],
  },
]
