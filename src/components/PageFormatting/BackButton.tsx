import { useLocation, useNavigate } from 'react-router-dom'
import styles from './BackButton.module.scss'

interface BackButtonProps {
  // Where to land when the previous page isn't on this site. Pass this for routes the segment-strip
  // can't guess — e.g. a detail page two levels deep. Defaults to the parent route.
  fallbackPath?: string
}

const isSameWebsiteReferrer = (referrer: string) => {
  if (!referrer) {
    return false
  }

  try {
    return new URL(referrer).origin === window.location.origin
  } catch {
    return false
  }
}

export function shouldNavigateBack() {
  const hasPreviousPage = window.history.length > 1
  if (!hasPreviousPage) {
    return false
  }

  const historyState = window.history.state as { idx?: number } | null
  const previousPageIsSameWebsite = isSameWebsiteReferrer(document.referrer)
  const previousAppHistoryIndex = typeof historyState?.idx === 'number' && historyState.idx > 0

  return previousPageIsSameWebsite || previousAppHistoryIndex
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

  const onClickHandler = () => {
    if (shouldNavigateBack()) {
      navigate(-1)
    } else if (target) {
      navigate(target)
    }
  }

  return (
    <button className={styles.back} onClick={onClickHandler} aria-label="Go back">
      <span className={styles.arrow}>&larr;</span>
      Back
    </button>
  )
}
