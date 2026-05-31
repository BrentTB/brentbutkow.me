import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { routes } from './routes.config'

const DEFAULT_TITLE = 'Brent Butkow'

/**
 * Keeps `document.title` in sync with the current route, driven by the `title`
 * field in routes.config. Unmatched paths fall back to the catch-all route's
 * title (the 404 page).
 */
export function useDocumentTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    const match = routes.find((route) => route.path === pathname)
    const notFound = routes.find((route) => route.path === '*')
    document.title = match?.title ?? notFound?.title ?? DEFAULT_TITLE
  }, [pathname])
}
