import { Breadcrumb } from './Breadcrumb'
import styles from './PageHeader.module.scss'

interface PageHeaderProps {
  title: string
  /** Nearest real ancestor for detail routes whose trailing URL segments have no page of their own
   *  (passed through to the breadcrumb). */
  parentPath?: string
}

export function PageHeader({ title, parentPath }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.rail}>
        <Breadcrumb parentPath={parentPath} />
      </div>
      <h1 className={styles.title}>{title}</h1>
    </div>
  )
}
