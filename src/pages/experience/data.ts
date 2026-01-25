import { Experience } from '../../data/data.types'

export const experience: Experience[] = [
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
