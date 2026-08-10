import { FunItem } from '../../data/data.types'
import { pluralize } from '../../utils/pluralize'
import { games } from './subpages/Games/data'

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
    label: 'Collection',
    hub: pluralize(games.length, 'game', 'games'),
    description:
      'Space games, classic games, and other interactive experiments (playable right in your browser)',
    link: funStuffSubRoutes.games,
  },
  {
    title: 'ASCII Art Studio',
    label: 'Tool',
    description:
      'Turn a photo, video, or your webcam into live ASCII art, right in your browser. A TypeScript port of my Python vidToAscii tool',
    link: funStuffSubRoutes.asciiArt,
  },
  {
    title: 'Image Encoder',
    label: 'Tool',
    description:
      'Hide a secret message inside a picture by changing its pixel colors, lock it with a key, and reveal it again. It all runs in your browser',
    link: funStuffSubRoutes.imageEncoder,
  },
  {
    title: 'Malicious UX',
    label: 'Exhibit',
    description:
      'A collection of deliberately hostile interface design, with buttons that run away from your cursor, a setting that switches itself back on when you look away, and a form that quietly eats what you typed',
    link: funStuffSubRoutes.maliciousUx,
  },
  {
    title: 'Gulag Sort',
    label: 'Algorithm',
    description: 'My first self-developed sorting algorithm, based on the (joke) Stalin sort',
    link: funStuffSubRoutes.gulagSort,
  },
  {
    title: 'brentbutkow.me / butkow.com',
    label: 'Source',
    description:
      'My first website, a personal project built using React and TypeScript, with a Python backend (Surprise: you are already here!)',
    link: 'https://github.com/BrentTB/brentbutkow.me',
  },
  {
    title: 'Course Projects - GitHub',
    label: 'Source',
    description:
      'A collection of software projects I created while in School and University in GitHub',
    link: funStuffSubRoutes.courseProjects,
  },
]
