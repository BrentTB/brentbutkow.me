import ContactMe from '../pages/contact/ContactMe'
import Education from '../pages/education/Education'
import Experience from '../pages/experience/Experience'
import FunStuff from '../pages/fun-stuff/FunStuff'
import Home from '../pages/home/Home'
import NotFound from '../pages/not-found/NotFound'
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
    element: <Home />,
    label: 'Home',
  },
  {
    path: routePaths.experience,
    element: <Experience />,
    label: 'Experience',
  },
  {
    path: routePaths.education,
    element: <Education />,
    label: 'Education',
  },
  {
    path: routePaths.funStuff,
    element: <FunStuff />,
    label: 'Fun Stuff',
  },
  {
    path: routePaths.contact,
    element: <ContactMe />,
    label: 'Contact Me',
  },
  {
    path: routePaths.notFound,
    element: <NotFound />,
    dontShowInNavbar: true,
  },
]
