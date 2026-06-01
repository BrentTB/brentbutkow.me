import ContactMePage from '../pages/contact-me/ContactMePage'
import EducationPage from '../pages/education/EducationPage'
import ExperiencePage from '../pages/experience/ExperiencePage'
import FunStuffPage from '../pages/fun-stuff/FunStuffPage'
import HomePage from '../pages/home/HomePage'
import NotFoundPage from '../pages/not-found/NotFoundPage'
import AchievementsPage from '../pages/achievements/AchievementsPage'
import { lazy } from 'react'
import { AppRoute } from './routes.types'
import { funStuffSubRoutes } from '../pages/fun-stuff/data'
import { gamesSubRoutes } from '../pages/fun-stuff/subpages/Games/data'

// Heavy / rarely-visited subpages are code-split out of the initial bundle.
const GulagSort = lazy(() => import('../pages/fun-stuff/subpages/GulagSort/GulagSort'))
const CourseProjects = lazy(
  () => import('../pages/fun-stuff/subpages/CourseProjects/CourseProjects')
)
const GamesPage = lazy(() => import('../pages/fun-stuff/subpages/Games/GamesPage'))
const NullSpace = lazy(() => import('../pages/fun-stuff/subpages/NullSpace/NullSpace'))

export const routePaths = {
  home: '/',
  experience: '/experience',
  education: '/education',
  achievements: '/achievements',
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
