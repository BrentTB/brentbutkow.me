import { Education } from '../../data/data.types'

export const education: Education[] = [
  {
    institution: 'University of the Witwatersrand',
    degree: 'Bachelor of Science in Information Engineering - BSc (Eng)',
    period: '2021 - 2024',
    description: [
      'Bachelor and Honours in Information Engineering with a focus on Computer Science',
      'Includes modules on Data Structures and Algorithms, Machine Learning, Software Engineering, Cybersecurity, Signals and Systems, and more',
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
      'A course about modern AI and ML models, and their uses. Including their fundamentals, the theory behind different ML models, and hands on experience using models to solve real-world problems',
      'Includes topics such as Neural Networks, CNN, RAG, GANs, Generative AI, Transformers, and more',
      'Taught using Python, TensorFlow, PyTorch, Keras, and other popular AI/ML tools and libraries',
    ],
  },
]
