import { Experience } from '../../data/data.types'

export const experience: Experience[] = [
  {
    role: 'Junior Software Developer',
    company: 'Entelect',
    period: 'Jan 2025 - Present',
    description: [
      'Contributing to the development of a large-scale e-commerce platform used by thousands of customers daily.',
      'Collaborating with cross-functional teams to design, develop, and deploy new features and enhancements.',
      'Participating in code reviews and ensuring adherence to best practices and coding standards.',
    ],
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Kubernetes'],
    experienceProjects: [
      {
        company: 'Major Retail Client',
        period: 'Mar 2025 - Present',
        description: [
          'Worked on optimizing the checkout process, resulting in a 15% increase in conversion rates.',
          'Implemented a recommendation engine that personalized product suggestions based on user behavior.',
        ],
        skills: ['TypeScript', 'React', 'Node.js', 'Machine Learning'],
      },
      {
        company: 'Major Retail Client',
        period: 'Mar 2025 - Present',
        description: [
          'Worked on optimizing the checkout process, resulting in a 15% increase in conversion rates.',
          'Implemented a recommendation engine that personalized product suggestions based on user behavior.',
        ],
        skills: ['TypeScript', 'React', 'Node.js', 'Machine Learning'],
      },
    ],
  },
  {
    role: 'Software Engineering Intern',
    company: 'Entelect, Amsterdam Office',
    period: 'Jan 2024 - Feb 2024 (7 weeks)',
    description: [
      'Built a virtual doorbell web app to manage office access and track who is inside when keys are limited.',
      'Integrated Microsoft Azure AD so only employees can authenticate and use the tool.',
      'Added an in-office calendar so teammates can see who plans to be onsite on specific days.',
    ],
    skills: ['JavaScript', 'WebSocket', 'Express.js', 'Azure AD', 'Prisma', 'Railway'],
  },
  {
    role: 'Data Engineering Intern',
    company: 'Stream (VATIT division)',
    period: 'Jan 2023 - Feb 2023 (6 weeks)',
    description: [
      'Built an automated data pipeline for sales, revenue, and profit metrics to improve reporting cadence.',
      'Delivered dashboards and reporting for strategic and operational decision-making.',
    ],
    skills: ['DBT', 'AWS DMS', 'AWS Lambda', 'Amazon Redshift', 'Amazon QuickSight'],
  },
  {
    role: 'Software Engineering Intern',
    company: 'Business Science Corporation',
    period: 'Feb 2021 - Apr 2021 (13 weeks)',
    description: [
      'Designed and implemented an AI chatbot in Microsoft Teams for internal employee use.',
      'Used NLP to answer common employee questions from internal databases, and answer employee-specific queries.',
    ],
    skills: ['Microsoft Azure', 'Python', 'Microsoft Bot Framework', 'Microsoft LUIS'],
  },
]
