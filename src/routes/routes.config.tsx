import { ContactMePage } from '../pages/ContactMe/ContactMePage'
import { EducationPage } from '../pages/Education/EducationPage'
import { ExperiencePage } from '../pages/Experience/ExperiencePage'
import { FunStuffPage } from '../pages/FunStuff/FunStuffPage'
import { HomePage } from '../pages/Home/HomePage'
import { NotFoundPage } from '../pages/NotFound/NotFoundPage'
import { AchievementsPage } from '../pages/Achievements/AchievementsPage'
import { ProjectsPage } from '../pages/Projects/ProjectsPage'
import { lazy } from 'react'
import { AppRoute } from './routes.types'
import { funStuffSubRoutes } from '../pages/FunStuff/data'
import { gamesSubRoutes } from '../pages/FunStuff/subpages/Games/data'

// Heavy / rarely-visited subpages are code-split out of the initial bundle.
const GulagSort = lazy(() =>
  import('../pages/FunStuff/subpages/GulagSort/GulagSort').then((module) => ({
    default: module.GulagSort,
  }))
)
const CourseProjects = lazy(() =>
  import('../pages/FunStuff/subpages/CourseProjects/CourseProjects').then((module) => ({
    default: module.CourseProjects,
  }))
)
const GamesPage = lazy(() =>
  import('../pages/FunStuff/subpages/Games/GamesPage').then((module) => ({
    default: module.GamesPage,
  }))
)
const NullSpace = lazy(() =>
  import('../projects/NullSpace/NullSpace').then((module) => ({
    default: module.NullSpace,
  }))
)
const AsciiArt = lazy(() =>
  import('../projects/AsciiArt/AsciiArt').then((module) => ({
    default: module.AsciiArt,
  }))
)
const ImageEncoder = lazy(() =>
  import('../projects/ImageEncoder/ImageEncoder').then((module) => ({
    default: module.ImageEncoder,
  }))
)
const RecallRadar = lazy(() =>
  import('../projects/RecallRadar/RecallRadar').then((module) => ({
    default: module.RecallRadar,
  }))
)
const RecallDetail = lazy(() =>
  import('../projects/RecallRadar/RecallDetail').then((module) => ({
    default: module.RecallDetail,
  }))
)

export const routePaths = {
  home: '/',
  experience: '/experience',
  education: '/education',
  achievements: '/achievements',
  projects: '/projects',
  recallRadar: '/recall-radar',
  funStuff: '/fun-stuff',
  contact: '/contact',
  notFound: '*',
}

const gamesPath = `${routePaths.funStuff}${funStuffSubRoutes.games}`

export const funStuffRoutes: AppRoute[] = [
  {
    path: gamesPath,
    element: <GamesPage />,
    dontShowInNavbar: true,
    title: 'Games — Brent Butkow',
    description:
      'Browser games and interactive experiments by Brent Butkow, playable right in your browser.',
  },
  {
    path: `${gamesPath}${gamesSubRoutes.nullSpace}`,
    element: <NullSpace />,
    dontShowInNavbar: true,
    title: 'Null Space — Brent Butkow',
    description:
      'Null Space — a browser space-defense game where you bend space itself: launch meteors, open black holes, and warp reality to protect your ship.',
  },
  {
    path: `${routePaths.funStuff}${funStuffSubRoutes.asciiArt}`,
    element: <AsciiArt />,
    dontShowInNavbar: true,
    title: 'ASCII Art Studio — Brent Butkow',
    description:
      'ASCII Art Studio — turn a photo, video, or your webcam into live ASCII art entirely in your browser. A TypeScript port of Brent Butkow’s Python vidToAscii tool.',
  },
  {
    path: `${routePaths.funStuff}${funStuffSubRoutes.imageEncoder}`,
    element: <ImageEncoder />,
    dontShowInNavbar: true,
    title: 'Image Encoder — Brent Butkow',
    description:
      'Image Encoder — hide a secret message inside a picture by nudging its pixel colors, optionally lock it with a key, and reveal it again. Steganography that runs entirely in your browser.',
  },
  {
    path: `${routePaths.funStuff}${funStuffSubRoutes.gulagSort}`,
    element: <GulagSort />,
    dontShowInNavbar: true,
    title: 'Gulag Sort — Brent Butkow',
    description:
      'Gulag Sort — a self-developed sorting algorithm by Brent Butkow, riffing on the joke Stalin sort.',
  },
  {
    path: `${routePaths.funStuff}${funStuffSubRoutes.courseProjects}`,
    element: <CourseProjects />,
    dontShowInNavbar: true,
    title: 'Course Projects — Brent Butkow',
    description:
      'A collection of software projects Brent Butkow built during school and university.',
  },
]

export const routes: AppRoute[] = [
  ...funStuffRoutes,
  {
    path: routePaths.home,
    element: <HomePage />,
    dontShowInNavbar: true,
    label: 'Home',
    title: 'Brent Butkow — Full-stack engineer',
    description:
      'Full-stack engineer at Foodcomply. Building cloud infrastructure and web apps, with a side of wacky projects and dad jokes.',
  },
  {
    path: routePaths.experience,
    element: <ExperiencePage />,
    label: 'Experience',
    title: 'Experience — Brent Butkow',
    description:
      'The professional experience of Brent Butkow — full-stack and cloud engineering roles, the stacks used, and what was shipped.',
  },
  {
    path: routePaths.education,
    element: <EducationPage />,
    label: 'Education',
    title: 'Education — Brent Butkow',
    description:
      'The education and academic background of Brent Butkow in software and engineering.',
  },
  {
    path: routePaths.achievements,
    element: <AchievementsPage />,
    label: 'Achievements',
    title: 'Achievements — Brent Butkow',
    description:
      'Awards, recognition, and standout achievements from the studies and career of Brent Butkow.',
  },
  {
    path: routePaths.projects,
    element: <ProjectsPage />,
    label: 'Projects',
    title: 'Projects — Brent Butkow',
    description:
      'Software projects built by Brent Butkow, including Recall Radar — a live US, UK, and SA food-recall dashboard.',
  },
  {
    // Reached via the Projects page, not a top-level nav tab.
    path: routePaths.recallRadar,
    element: <RecallRadar />,
    dontShowInNavbar: true,
    title: 'Recall Radar — Brent Butkow',
    description:
      'Recall Radar — a live US, UK, and SA food-recall dashboard. A FastAPI and ML pipeline ingests FDA, USDA FSIS, SA NCC, and UK FSA data daily.',
  },
  {
    // Dedicated page for a single recall, reached by clicking a recall in the feed or a related one.
    path: `${routePaths.recallRadar}/:source/:recallNumber`,
    element: <RecallDetail />,
    dontShowInNavbar: true,
    title: 'Recall — Recall Radar',
    description:
      'A single food-recall record on Recall Radar — full details, ML classification, and related recalls.',
  },
  {
    path: routePaths.funStuff,
    element: <FunStuffPage />,
    label: 'Fun Stuff',
    title: 'Fun Stuff — Brent Butkow',
    description:
      'Side projects, experiments, and playful builds by Brent Butkow — browser games, a joke sorting algorithm, and more.',
  },
  {
    path: routePaths.contact,
    element: <ContactMePage />,
    label: 'Contact Me',
    title: 'Contact — Brent Butkow',
    description: 'Get in touch with Brent Butkow — email, GitHub, LinkedIn, and more.',
  },
  {
    path: routePaths.notFound,
    element: <NotFoundPage />,
    dontShowInNavbar: true,
    title: 'Page not found — Brent Butkow',
    description: 'The page you are looking for does not exist.',
  },
]
