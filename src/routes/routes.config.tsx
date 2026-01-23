import ContactMePage from '../pages/contact/ContactMePage'
import EducationPage from '../pages/education/EducationPage'
import ExperiencePage from '../pages/experience/ExperiencePage'
import FunStuffPage from '../pages/fun-stuff/FunStuffPage'
import HomePage from '../pages/home/HomePage'
import NotFoundPage from '../pages/not-found/NotFoundPage'
import { AppRoute } from './routes.types'

export const routePaths = {
  home: '/',
  experience: '/experience',
  education: '/education',
  funStuff: '/fun-stuff',
  contact: '/contact',
  notFound: '*',
}

export const routes: AppRoute[] = [
  {
    path: routePaths.home,
    element: <HomePage />,
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
