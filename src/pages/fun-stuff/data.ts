import { FunItem } from '../../data/data.types'

export const funStuffSubRoutes = {
  gulagSort: '/gulag-sort',
  courseProjects: '/course-projects',
}

export const funStuff: FunItem[] = [
  {
    title: 'Gulag Sort',
    description: 'My first self-developed sorting algorithm, based on the (joke) Stalin sort',
    link: funStuffSubRoutes.gulagSort,
  },
  {
    title: 'brentbutkow.me / butkow.com',
    description:
      'My first website, a personal project built using React and TypeScript (Surprise: you are already here!)',
  },
  {
    title: 'Course Projects - GitHub',
    description:
      'A collection of software projects I created while in School and University in GitHub',
    link: funStuffSubRoutes.courseProjects,
  },
]
