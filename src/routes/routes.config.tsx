import ContactMePage from '../pages/contact-me/ContactMePage'
import EducationPage from '../pages/education/EducationPage'
import ExperiencePage from '../pages/experience/ExperiencePage'
import FunStuffPage from '../pages/fun-stuff/FunStuffPage'
import HomePage from '../pages/home/HomePage'
import NotFoundPage from '../pages/not-found/NotFoundPage'
import AchievementsPage from '../pages/achievements/AchievementsPage'
import TimelinePage from '../pages/timeline/TimelinePage'
import { AppRoute } from './routes.types'

export const routePaths = {
  home: '/',
  timeline: '/timeline',
  experience: '/experience',
  education: '/education',
  achievements: '/achievements',
  funStuff: '/fun-stuff',
  contact: '/contact',
  notFound: '*',
}

export const routes: AppRoute[] = [
  {
    path: routePaths.home,
    element: <HomePage />,
    dontShowInNavbar: true,
    label: 'Home',
  },
  {
    path: routePaths.timeline,
    element: <TimelinePage />,
    dontShowInNavbar: true,
    label: 'Timeline',
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
