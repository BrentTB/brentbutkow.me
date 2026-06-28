import { BackButton } from './BackButton'
import styles from './PageHeader.module.scss'

interface PageHeaderProps {
  title: string
  showBackButton?: boolean
  backFallbackPath?: string
}

export function PageHeader({ title, showBackButton, backFallbackPath }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      {showBackButton && <BackButton fallbackPath={backFallbackPath} />}
      <h1 className={styles.title}>{title}</h1>
    </div>
  )
}
