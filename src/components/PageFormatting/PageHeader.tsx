import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BackButton } from './BackButton'
import { toBreadcrumbs } from '../../utils/terminal-path'
import styles from './PageHeader.module.scss'

interface PageHeaderProps {
  title: string
  showBackButton?: boolean
  backFallbackPath?: string
  /** Override the breadcrumb path (defaults to the live route). Use for dynamic detail pages whose
   *  URL segments have no page of their own — point it at the nearest real ancestor. */
  path?: string
}

export function PageHeader({ title, showBackButton, backFallbackPath, path }: PageHeaderProps) {
  const location = useLocation()
  // An overridden path is a parent stand-in, so none of its crumbs are the current page.
  const crumbs = toBreadcrumbs(path ?? location.pathname, path === undefined)

  return (
    <div className={styles.header}>
      <div className={styles.rail}>
        {showBackButton && <BackButton fallbackPath={backFallbackPath} />}
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          {crumbs.map((crumb, index) => (
            <Fragment key={crumb.href}>
              {index > 0 && <span className={styles.separator}>/</span>}
              {crumb.current ? (
                <span className={styles.current} aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link className={styles.crumb} to={crumb.href}>
                  {crumb.label}
                </Link>
              )}
            </Fragment>
          ))}
        </nav>
      </div>
      <h1 className={styles.title}>{title}</h1>
    </div>
  )
}
