import { useLocation, useNavigate } from 'react-router-dom'
import { routeLabels } from '../../routes/routes.paths'
import { previousVisitedPath } from '../../routes/navigation-history'
import styles from './BackButton.module.scss'

interface BackButtonProps {
  // Structural parent to go back to. Pass this for routes the segment-strip can't guess — e.g. a
  // detail page two levels deep. Defaults to the parent route derived from the path.
  fallbackPath?: string
}

export function getRouteFallbackPath(pathname: string) {
  if (pathname === '/' || pathname === '') {
    return undefined
  }

  const trimmed = pathname.replace(/\/$/, '')
  const lastSlashIndex = trimmed.lastIndexOf('/')

  if (lastSlashIndex <= 0) {
    return '/'
  }

  return trimmed.slice(0, lastSlashIndex)
}

export function BackButton({ fallbackPath }: BackButtonProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const target = fallbackPath ?? getRouteFallbackPath(pathname)
  const label = (target && routeLabels[target]) || 'Back'

  const onClickHandler = () => {
    if (!target) {
      return
    }
    // If the previous entry is the parent we'd land on, step back to it so its query string and scroll
    // survive; otherwise go to the parent fresh (handles deep chains and arriving from off-site).
    if (previousVisitedPath() === target) {
      navigate(-1)
    } else {
      navigate(target)
    }
  }

  return (
    <button
      className={styles.back}
      onClick={onClickHandler}
      aria-label={label === 'Back' ? 'Go back' : `Back to ${label}`}
    >
      <span className={styles.arrow}>&larr;</span>
    </button>
  )
}
