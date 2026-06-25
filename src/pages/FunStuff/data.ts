import { FunItem } from '../../data/data.types'

export const funStuffSubRoutes = {
  gulagSort: '/gulag-sort',
  courseProjects: '/course-projects',
  games: '/games',
  asciiArt: '/ascii-art',
}

export const funStuff: FunItem[] = [
  {
    title: 'Games',
    description: 'Space games and other interactive experiments (playable right in your browser)',
    link: funStuffSubRoutes.games,
  },
  {
    title: 'ASCII Art Studio',
    description:
      'Turn a photo, video, or your webcam into live ASCII art, right in your browser. A TypeScript port of my Python vidToAscii tool',
    link: funStuffSubRoutes.asciiArt,
  },
  {
    title: 'Gulag Sort',
    description: 'My first self-developed sorting algorithm, based on the (joke) Stalin sort',
    link: funStuffSubRoutes.gulagSort,
  },
  {
    title: 'brentbutkow.me / butkow.com',
    description:
      'My first website, a personal project built using React and TypeScript (Surprise: you are already here!)',
    link: 'https://github.com/BrentTB/brentbutkow.me',
  },
  {
    title: 'Course Projects - GitHub',
    description:
      'A collection of software projects I created while in School and University in GitHub',
    link: funStuffSubRoutes.courseProjects,
  },
]
