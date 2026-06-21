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
  },
  {
    path: `${gamesPath}${gamesSubRoutes.nullSpace}`,
    element: <NullSpace />,
    dontShowInNavbar: true,
    title: 'Null Space — Brent Butkow',
  },
  {
    path: `${routePaths.funStuff}${funStuffSubRoutes.gulagSort}`,
    element: <GulagSort />,
    dontShowInNavbar: true,
    title: 'Gulag Sort — Brent Butkow',
  },
  {
    path: `${routePaths.funStuff}${funStuffSubRoutes.courseProjects}`,
    element: <CourseProjects />,
    dontShowInNavbar: true,
    title: 'Course Projects — Brent Butkow',
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
  },
  {
    path: routePaths.experience,
    element: <ExperiencePage />,
    label: 'Experience',
    title: 'Experience — Brent Butkow',
  },
  {
    path: routePaths.education,
    element: <EducationPage />,
    label: 'Education',
    title: 'Education — Brent Butkow',
  },
  {
    path: routePaths.achievements,
    element: <AchievementsPage />,
    label: 'Achievements',
    title: 'Achievements — Brent Butkow',
  },
  {
    path: routePaths.projects,
    element: <ProjectsPage />,
    label: 'Projects',
    title: 'Projects — Brent Butkow',
  },
  {
    // Reached via the Projects page, not a top-level nav tab.
    path: routePaths.recallRadar,
    element: <RecallRadar />,
    dontShowInNavbar: true,
    title: 'Recall Radar — Brent Butkow',
  },
  {
    // Dedicated page for a single recall, reached by clicking a recall in the feed or a related one.
    path: `${routePaths.recallRadar}/:source/:recallNumber`,
    element: <RecallDetail />,
    dontShowInNavbar: true,
    title: 'Recall — Recall Radar',
  },
  {
    path: routePaths.funStuff,
    element: <FunStuffPage />,
    label: 'Fun Stuff',
    title: 'Fun Stuff — Brent Butkow',
  },
  {
    path: routePaths.contact,
    element: <ContactMePage />,
    label: 'Contact Me',
    title: 'Contact — Brent Butkow',
  },
  {
    path: routePaths.notFound,
    element: <NotFoundPage />,
    dontShowInNavbar: true,
    title: 'Page not found — Brent Butkow',
  },
]
