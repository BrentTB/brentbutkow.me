import { BackButton } from './BackButton'
import styles from './PageHeader.module.scss'

interface PageHeaderProps {
  title: string
  showBackButton?: boolean
}

export function PageHeader({ title, showBackButton }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      {showBackButton && <BackButton />}
      <h1 className={styles.title}>{title}</h1>
    </div>
  )
}
