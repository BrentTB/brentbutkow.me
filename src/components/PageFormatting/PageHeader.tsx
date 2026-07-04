import { useLocation } from 'react-router-dom'
import { BackButton } from './BackButton'
import { toTerminalPath } from '../../utils/terminal-path'
import styles from './PageHeader.module.scss'

interface PageHeaderProps {
  title: string
  showBackButton?: boolean
  backFallbackPath?: string
  /** Override the terminal path rail (defaults to the live route). Use for dynamic detail pages. */
  path?: string
}

export function PageHeader({ title, showBackButton, backFallbackPath, path }: PageHeaderProps) {
  const location = useLocation()
  const terminalPath = toTerminalPath(path ?? location.pathname)

  return (
    <div className={styles.header}>
      {showBackButton && <BackButton fallbackPath={backFallbackPath} />}
      <span className={styles.path} aria-hidden="true">
        {terminalPath}
      </span>
      <h1 className={styles.title}>{title}</h1>
    </div>
  )
}
