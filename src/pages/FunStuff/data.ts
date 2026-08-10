import { FunItem } from '../../data/data.types'

export const funStuffSubRoutes = {
  gulagSort: '/gulag-sort',
  courseProjects: '/course-projects',
  games: '/games',
  asciiArt: '/ascii-art',
  imageEncoder: '/image-encoder',
  maliciousUx: '/malicious-ux',
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
    title: 'Image Encoder',
    description:
      'Hide a secret message inside a picture by changing its pixel colors, lock it with a key, and reveal it again. It all runs in your browser',
    link: funStuffSubRoutes.imageEncoder,
  },
  {
    title: 'Malicious UX',
    description:
      'A collection of deliberately hostile interface design, with buttons that run away from your cursor, a setting that switches itself back on when you look away, and a form that quietly eats what you typed',
    link: funStuffSubRoutes.maliciousUx,
  },
  {
    title: 'Gulag Sort',
    description: 'My first self-developed sorting algorithm, based on the (joke) Stalin sort',
    link: funStuffSubRoutes.gulagSort,
  },
  {
    title: 'brentbutkow.me / butkow.com',
    description:
      'My first website, a personal project built using React and TypeScript, with a Python backend (Surprise: you are already here!)',
    link: 'https://github.com/BrentTB/brentbutkow.me',
  },
  {
    title: 'Course Projects - GitHub',
    description:
      'A collection of software projects I created while in School and University in GitHub',
    link: funStuffSubRoutes.courseProjects,
  },
]
