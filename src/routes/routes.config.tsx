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
import { metaFor } from './routes.meta'
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
const PixelWorldSimulator = lazy(() =>
  import('../projects/PixelWorldSimulator/PixelWorldSimulator').then((module) => ({
    default: module.PixelWorldSimulator,
  }))
)
const TicTacToe = lazy(() =>
  import('../projects/TicTacToe/TicTacToe').then((module) => ({
    default: module.TicTacToe,
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
// vercel.json also 301s this prefix at the edge (for crawlers / direct hits, which never reach the
// SPA); this client-side twin covers in-app <Link> navigation. Keep both — dropping either regresses
// one of those paths.
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
    ...metaFor(gamesPath),
  },
  {
    path: `${gamesPath}${gamesSubRoutes.nullSpace}`,
    element: <NullSpace />,
    dontShowInNavbar: true,
    ...metaFor(`${gamesPath}${gamesSubRoutes.nullSpace}`),
  },
  {
    path: `${gamesPath}${gamesSubRoutes.pixelWorldSimulator}`,
    element: <PixelWorldSimulator />,
    dontShowInNavbar: true,
    ...metaFor(`${gamesPath}${gamesSubRoutes.pixelWorldSimulator}`),
  },
  {
    path: `${gamesPath}${gamesSubRoutes.ticTacToe}`,
    element: <TicTacToe />,
    dontShowInNavbar: true,
    ...metaFor(`${gamesPath}${gamesSubRoutes.ticTacToe}`),
  },
  {
    path: `${routePaths.funStuff}${funStuffSubRoutes.asciiArt}`,
    element: <AsciiArt />,
    dontShowInNavbar: true,
    ...metaFor(`${routePaths.funStuff}${funStuffSubRoutes.asciiArt}`),
  },
  {
    path: `${routePaths.funStuff}${funStuffSubRoutes.imageEncoder}`,
    element: <ImageEncoder />,
    dontShowInNavbar: true,
    ...metaFor(`${routePaths.funStuff}${funStuffSubRoutes.imageEncoder}`),
  },
  {
    path: `${routePaths.funStuff}${funStuffSubRoutes.gulagSort}`,
    element: <GulagSort />,
    dontShowInNavbar: true,
    ...metaFor(`${routePaths.funStuff}${funStuffSubRoutes.gulagSort}`),
  },
  {
    path: `${routePaths.funStuff}${funStuffSubRoutes.courseProjects}`,
    element: <CourseProjects />,
    dontShowInNavbar: true,
    ...metaFor(`${routePaths.funStuff}${funStuffSubRoutes.courseProjects}`),
  },
]

export const routes: AppRoute[] = [
  ...funStuffRoutes,
  {
    path: routePaths.home,
    element: <HomePage />,
    dontShowInNavbar: true,
    label: 'Home',
    ...metaFor(routePaths.home),
  },
  {
    path: routePaths.experience,
    element: <ExperiencePage />,
    label: 'Experience',
    ...metaFor(routePaths.experience),
  },
  {
    path: routePaths.education,
    element: <EducationPage />,
    label: 'Education',
    ...metaFor(routePaths.education),
  },
  {
    path: routePaths.achievements,
    element: <AchievementsPage />,
    label: 'Achievements',
    ...metaFor(routePaths.achievements),
  },
  {
    path: routePaths.projects,
    element: <ProjectsPage />,
    label: 'Projects',
    ...metaFor(routePaths.projects),
  },
  {
    // Reached via the Projects page, not a top-level nav tab.
    path: routePaths.recallRadar,
    element: <RecallRadar />,
    dontShowInNavbar: true,
    ...metaFor(routePaths.recallRadar),
  },
  {
    // Reached from the confirmation link in the opt-in email; activates a pending subscription.
    path: routePaths.recallRadarConfirm,
    element: <ConfirmPage />,
    dontShowInNavbar: true,
    ...metaFor(routePaths.recallRadarConfirm),
  },
  {
    // Reached from the manage link in every email; edit criteria or unsubscribe.
    path: routePaths.recallRadarManage,
    element: <ManagePage />,
    dontShowInNavbar: true,
    ...metaFor(routePaths.recallRadarManage),
  },
  {
    // One-click unsubscribe landing reached from the unsubscribe link in every email.
    path: routePaths.recallRadarUnsubscribe,
    element: <UnsubscribePage />,
    dontShowInNavbar: true,
    ...metaFor(routePaths.recallRadarUnsubscribe),
  },
  {
    // Dedicated page for a single recall, reached by clicking a recall in the feed or a related one.
    path: `${routePaths.recallRadar}/:source/:recallNumber`,
    element: <RecallDetail />,
    dontShowInNavbar: true,
    ...metaFor(`${routePaths.recallRadar}/:source/:recallNumber`),
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
    ...metaFor(routePaths.funStuff),
  },
  {
    path: routePaths.contact,
    element: <ContactMePage />,
    label: 'Contact Me',
    ...metaFor(routePaths.contact),
  },
  {
    // Private operator dashboard — token-gated, hidden from nav, not indexed, not in the sitemap.
    path: routePaths.admin,
    element: <AdminPage />,
    dontShowInNavbar: true,
    ...metaFor(routePaths.admin),
  },
  {
    path: routePaths.notFound,
    element: <NotFoundPage />,
    dontShowInNavbar: true,
    ...metaFor(routePaths.notFound),
  },
]
