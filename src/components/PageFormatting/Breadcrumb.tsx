import { Fragment, MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getRouteFallbackPath, toBreadcrumbs } from '../../utils/terminal-path'
import { previousVisitedPath } from '../../routes/navigation-history'
import styles from './Breadcrumb.module.scss'

interface BreadcrumbProps {
  // The nearest real ancestor page, for detail routes whose trailing URL segments have no page of
  // their own (a recall's /fda/H-1078-2026). Segments past it render as plain text, and it becomes
  // the back target. Defaults to the structural parent.
  parentPath?: string
}

export function Breadcrumb({ parentPath }: BreadcrumbProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const crumbs = toBreadcrumbs(pathname, parentPath)
  const backTarget = parentPath ?? getRouteFallbackPath(pathname)

  // Clicking the back-target crumb steps back through history when we arrived from it, so its query
  // string and scroll survive; otherwise the Link navigates fresh.
  const onBackCrumb = (event: MouseEvent) => {
    if (previousVisitedPath() === backTarget) {
      event.preventDefault()
      navigate(-1)
    }
  }

  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <Fragment key={crumb.href}>
          {index > 0 && <span className={styles.separator}>/</span>}
          {crumb.linkable ? (
            <Link
              className={styles.crumb}
              to={crumb.href}
              onClick={crumb.href === backTarget ? onBackCrumb : undefined}
            >
              {crumb.label}
            </Link>
          ) : (
            <span className={styles.plain} aria-current={crumb.current ? 'page' : undefined}>
              {crumb.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
