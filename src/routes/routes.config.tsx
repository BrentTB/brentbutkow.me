import ContactMePage from '../pages/contact-me/ContactMePage'
import EducationPage from '../pages/education/EducationPage'
import ExperiencePage from '../pages/experience/ExperiencePage'
import FunStuffPage from '../pages/fun-stuff/FunStuffPage'
import HomePage from '../pages/home/HomePage'
import NotFoundPage from '../pages/not-found/NotFoundPage'
import AchievementsPage from '../pages/achievements/AchievementsPage'
import { AppRoute } from './routes.types'
import GulagSort from '../pages/fun-stuff/subpages/GulagSort/GulagSort'
import { funStuffSubRoutes } from '../pages/fun-stuff/data'

export const routePaths = {
  home: '/',
  experience: '/experience',
  education: '/education',
  achievements: '/achievements',
  funStuff: '/fun-stuff',
  contact: '/contact',
  notFound: '*',
}

export const funStuffRoutes: AppRoute[] = [
  {
    path: `${routePaths.funStuff}${funStuffSubRoutes.gulagSort}`,
    element: <GulagSort />,
  },
]

export const routes: AppRoute[] = [
  ...funStuffRoutes,
  {
    path: routePaths.home,
    element: <HomePage />,
    dontShowInNavbar: true,
    label: 'Home',
  },
  {
    path: routePaths.experience,
    element: <ExperiencePage />,
    label: 'Experience',
  },
  {
    path: routePaths.education,
    element: <EducationPage />,
    label: 'Education',
  },
  {
    path: routePaths.achievements,
    element: <AchievementsPage />,
    label: 'Achievements',
  },
  {
    path: routePaths.funStuff,
    element: <FunStuffPage />,
    label: 'Fun Stuff',
  },
  {
    path: routePaths.contact,
    element: <ContactMePage />,
    label: 'Contact Me',
  },
  {
    path: routePaths.notFound,
    element: <NotFoundPage />,
    dontShowInNavbar: true,
  },
]
