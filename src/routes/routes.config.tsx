import { ContactMePage } from '../pages/ContactMe/ContactMePage'
import { EducationPage } from '../pages/Education/EducationPage'
import { ExperiencePage } from '../pages/Experience/ExperiencePage'
import { FunStuffPage } from '../pages/FunStuff/FunStuffPage'
import { HomePage } from '../pages/Home/HomePage'
import { NotFoundPage } from '../pages/NotFound/NotFoundPage'
import { AchievementsPage } from '../pages/Achievements/AchievementsPage'
import { ProjectsPage } from '../pages/Projects/ProjectsPage'
import { lazy } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AppRoute } from './routes.types'
import { routePaths } from './routes.paths'
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
const ConfirmPage = lazy(() =>
  import('../projects/RecallRadar/subscription/ConfirmPage').then((module) => ({
    default: module.ConfirmPage,
  }))
)
const ManagePage = lazy(() =>
  import('../projects/RecallRadar/subscription/ManagePage').then((module) => ({
    default: module.ManagePage,
  }))
)
const UnsubscribePage = lazy(() =>
  import('../projects/RecallRadar/subscription/UnsubscribePage').then((module) => ({
    default: module.UnsubscribePage,
  }))
)
const AdminPage = lazy(() =>
  import('../pages/Admin/AdminPage').then((module) => ({
    default: module.AdminPage,
  }))
)

// The dashboard moved from /recall-radar to /projects/recall-radar. Rewrite the old prefix while
// keeping any sub-path, query, and hash so saved deep links (filters, single recalls) still resolve.
export function legacyRecallRadarTarget(pathname: string, search: string, hash: string) {
  return pathname.replace(/^\/recall-radar/, routePaths.recallRadar) + search + hash
}

function LegacyRecallRadarRedirect() {
  const { pathname, search, hash } = useLocation()
  return <Navigate to={legacyRecallRadarTarget(pathname, search, hash)} replace />
}

const gamesPath = `${routePaths.funStuff}${funStuffSubRoutes.games}`

const funStuffRoutes: AppRoute[] = [
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
      'Software projects built by Brent Butkow, including Recall Radar, a live US, Canada, UK and SA food-recall dashboard.',
  },
  {
    // Reached via the Projects page, not a top-level nav tab.
    path: routePaths.recallRadar,
    element: <RecallRadar />,
    dontShowInNavbar: true,
    title: 'Food Recall Tracker — US, Canada, UK & SA | Recall Radar — Brent Butkow',
    description:
      'Track the latest food recalls across the US, Canada, UK and South Africa. Updated daily from FDA, USDA, NCC, CFIA and FSA, with free email alerts and severity ratings.',
  },
  {
    // Reached from the confirmation link in the opt-in email; activates a pending subscription.
    path: routePaths.recallRadarConfirm,
    element: <ConfirmPage />,
    dontShowInNavbar: true,
    title: 'Confirm subscription — Recall Radar',
    description: 'Confirm your Recall Radar alert subscription.',
  },
  {
    // Reached from the manage link in every email; edit criteria or unsubscribe.
    path: routePaths.recallRadarManage,
    element: <ManagePage />,
    dontShowInNavbar: true,
    title: 'Manage alerts — Recall Radar',
    description: 'Manage or unsubscribe from your Recall Radar alerts.',
  },
  {
    // One-click unsubscribe landing reached from the unsubscribe link in every email.
    path: routePaths.recallRadarUnsubscribe,
    element: <UnsubscribePage />,
    dontShowInNavbar: true,
    title: 'Unsubscribe — Recall Radar',
    description: 'Unsubscribe from your Recall Radar alerts.',
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
    // Legacy /recall-radar URLs redirect to the new /projects/recall-radar home.
    path: '/recall-radar',
    element: <LegacyRecallRadarRedirect />,
    dontShowInNavbar: true,
    redirect: true,
  },
  {
    path: '/recall-radar/*',
    element: <LegacyRecallRadarRedirect />,
    dontShowInNavbar: true,
    redirect: true,
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
    // Private operator dashboard — token-gated, hidden from nav, not indexed, not in the sitemap.
    path: routePaths.admin,
    element: <AdminPage />,
    dontShowInNavbar: true,
    noindex: true,
    title: 'Admin — Brent Butkow',
    description: 'Private admin dashboard.',
  },
  {
    path: routePaths.notFound,
    element: <NotFoundPage />,
    dontShowInNavbar: true,
    title: 'Page not found — Brent Butkow',
    description: 'The page you are looking for does not exist.',
  },
]
